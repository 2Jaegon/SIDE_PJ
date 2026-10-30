"""
요구사항 인터뷰 (grill-me).

사용자의 첫 요청은 대개 덜 정해져 있다. 팀을 편성하기 전에 메인 AI가 결정 트리를 따라 라운드 단위로 묻고,
답을 받아 확정된 요구사항(brief)으로 바꾼다. 팀은 사용자의 원문과 이 brief를 함께 받는다.

- 인사·짧은 질문·이미 구체적인 요청·이전 답의 후속 요청은 묻지 않고 바로 ready로 돌려준다.
- 라운드마다 질문은 최대 MAX_QUESTIONS개, 질문마다 추천 답이 있어 사용자는 "그대로 진행"으로 넘어갈 수 있다.
- 마지막 라운드(max_rounds)에서는 더 묻지 않고, 남은 모호함은 추천 답으로 확정하고(assumptions에 밝힌다) 끝낸다.
- AI가 없거나 응답을 읽지 못하면 묻지 않고 ready로 돌려준다(인터뷰 때문에 요청이 막히지 않는다).
"""

import json
import re
from typing import Any, Dict, List, Optional

from app.core import llm, roles

MAX_ROUNDS = 3  # 마지막 라운드는 질문 없이 확정만 한다. 그래서 묻는 횟수는 최대 MAX_ROUNDS - 1번(간단=2라운드: 한 번 묻고 확정, 심층=3라운드: 최대 두 번 묻고 확정)
MAX_QUESTIONS = 4
ANSWER_CHARS = 600


def _answers_block(answers: List[Dict[str, str]]) -> str:
    lines = []
    for a in answers:
        title = str(a.get("title", "")).strip()[:120]
        ans = str(a.get("answer", "")).strip()[:ANSWER_CHARS]
        if ans:
            lines.append(f"- {title}: {ans}")
    return "\n".join(lines)


def prompt(query: str, answers: List[Dict[str, str]], round_no: int, context: str = "", max_rounds: int = MAX_ROUNDS) -> str:
    final_round = round_no >= max_rounds
    asked = _answers_block(answers)
    return (
        f"{roles.core()}당신은 '요구사항 인터뷰어'입니다. 사용자의 요청을 AI 전문가 팀에 맡기기 전에, 팀이 헛수고하지 않도록 요구사항을 확정합니다.\n\n"
        f"{roles.guidance('interviewer')}\n\n"
        "[진행 규칙]\n"
        "1. 인사, 짧은 대화, 간단한 사실 질문, 이전 답에 대한 후속 요청(줄이기·번역·표로 바꾸기 등), 이미 목적·산출물·범위가 분명한 요청은 "
        "묻지 않고 ready=true로 끝냅니다. 질문은 답에 따라 결과가 실제로 달라질 때만 합니다.\n"
        f"2. 물을 때는 결정 트리의 지금 물을 수 있는 가지(앞선 결정이 필요 없는 질문)를 한 라운드에 모아 최대 {MAX_QUESTIONS}개만 묻습니다. "
        "다룰 후보: 최종 산출물의 형태, 독자·사용 맥락, 범위와 제외할 것, 제약(기한·예산·기술·톤), 성공을 판단할 기준.\n"
        "3. 질문마다 추천 답(recommended)을 달고, 사용자가 '네'로 받아들일 수 있게 묻습니다. options는 2~4개의 짧은 선택지이며 추천 답을 포함합니다.\n"
        "4. 사용자가 이미 말한 것, 이전 답에서 알 수 있는 것, 일반 상식은 묻지 않습니다. 사실(파일·환경·현황)은 사용자에게 떠넘기지 말고 brief에 '확인 필요'로 남깁니다.\n"
        + (
            "5. 이번이 마지막 라운드입니다. 더 묻지 말고 ready=true로 끝내세요. 사용자가 답하지 않은 모호함은 추천 답으로 확정하고 assumptions에 밝히세요.\n"
            if final_round else
            "5. 사용자의 답으로 새로 열린 가지가 남아 있으면 한 라운드 더 물을 수 있습니다. 남은 것이 없으면 ready=true로 끝내세요.\n"
        )
        + "6. brief는 팀에 그대로 넘길 확정 명세입니다. 한국어로 '목적 / 산출물 / 독자·맥락 / 범위(포함·제외) / 제약 / 성공 기준 / 확인 필요' 순서로 "
        "간결하게 쓰되, 사용자가 말하지 않은 사실을 만들어 넣지 마세요.\n\n"
        "출력은 순수 JSON 한 덩어리만:\n"
        '{"ready": true 또는 false,\n'
        ' "questions": [{"title": "질문 제목", "body": "질문 본문(왜 묻는지 한 줄 포함)", "options": ["선택지1", "선택지2"], "recommended": "추천 답"}],\n'
        ' "brief": "ready=true일 때만: 확정 명세",\n'
        ' "assumptions": ["사용자가 답하지 않아 추천으로 확정한 것"]}\n\n'
        f"{context}<요청>{query}</요청>\n"
        + (f"<지금까지의 질문과 답 (라운드 {round_no - 1}까지)>\n{asked}\n</지금까지의 질문과 답>\n" if asked else "")
    )


def parse(text: str, round_no: int, max_rounds: int = MAX_ROUNDS) -> Dict[str, Any]:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("인터뷰 결과를 읽지 못했어요")
    data = json.loads(m.group(0))
    questions: List[Dict[str, Any]] = []
    for i, q in enumerate(data.get("questions") or [], 1):
        if not isinstance(q, dict):
            continue
        title = str(q.get("title", "")).strip()
        if not title:
            continue
        options = [str(o).strip() for o in (q.get("options") or []) if str(o).strip()][:4]
        rec = str(q.get("recommended", "")).strip()
        if rec and rec not in options:
            options = ([rec] + options)[:4]
        questions.append({"id": f"r{round_no}q{i}", "title": title[:120], "body": str(q.get("body", "")).strip()[:600],
                          "options": options, "recommended": rec})
    questions = questions[:MAX_QUESTIONS]
    brief = str(data.get("brief", "")).strip()
    assumptions = [str(a).strip() for a in (data.get("assumptions") or []) if str(a).strip()][:8]
    # 마지막 라운드이거나 물을 게 없으면 끝낸다. 끝내는데 brief가 없으면 호출한 쪽이 원문을 그대로 쓴다
    ready = bool(data.get("ready")) or not questions or round_no >= max_rounds
    return {"ready": ready, "questions": [] if ready else questions, "brief": brief if ready else "", "assumptions": assumptions if ready else []}


def run(query: str, answers: Optional[List[Dict[str, str]]] = None, round_no: int = 1, context: str = "",
        model: Optional[str] = None, max_rounds: int = MAX_ROUNDS) -> Dict[str, Any]:
    """인터뷰 한 라운드. max_rounds가 1이면 '간단'(한 번만 묻고 끝), 2면 '심층'. 실패하면 묻지 않고 끝낸다."""
    answers = answers or []
    max_rounds = max(1, min(max_rounds, MAX_ROUNDS))
    round_no = max(1, min(round_no, max_rounds))
    base = {"ready": True, "questions": [], "brief": "", "assumptions": [], "round": round_no, "mode": "stub"}
    if not llm.available():
        return base
    try:
        out = parse(llm.ask(prompt(query, answers, round_no, context, max_rounds), timeout=90, model=llm.check_model(model)), round_no, max_rounds)
    except Exception:
        return {**base, "mode": "ai"}
    return {**out, "round": round_no, "mode": "ai"}


def enrich(query: str, brief: str, answers: List[Dict[str, str]]) -> str:
    """팀에 넘길 요청: 사용자 원문 + 인터뷰로 확정한 내용. 인터뷰를 안 했으면 원문 그대로."""
    block = _answers_block(answers)
    if not brief and not block:
        return query
    parts = [query, "", "[인터뷰로 확정한 요구사항 — 위 원문보다 구체적이므로 이 내용을 따르세요]"]
    if brief:
        parts.append(brief)
    if block:
        parts += ["", "[사용자가 직접 고른 답]", block]
    return "\n".join(parts)
