"""
멀티 에이전트 파이프라인.

  1. 총괄이 요청을 읽고 의도를 하위 질문으로 나눈 뒤, 요청 크기에 맞는 인원(사용자가 고른 깊이의 상한 안)으로
     개발자 관점(dev)과 서비스 관점(service) 전문가를 함께 편성한다.
  2. 전문가들이 각자의 관점과 스킬 지침으로 병렬 작업한다.
  3. 총괄이 두 관점을 취합해 분석 → 정리 → 시각화(표·chart 블록) → 개발(필요할 때 코드) 순서로 최종 답을 쓴다.

끝나는 대로 이벤트(dict)를 내보낸다. routes가 NDJSON으로 흘려보낸다.
"""

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterator, List, Optional, Tuple

from app.core import experts, llm

MAX_EXPERTS = int(os.getenv("GON_MAX_EXPERTS", "16"))  # 어떤 깊이를 골라도 넘지 않는 절대 상한(비용)
DEPTHS = {"fast": 4, "normal": 8, "deep": 16}  # 사용자가 고르는 깊이별 인원 상한. 실제 인원은 총괄이 요청 크기로 정한다
WORKERS = int(os.getenv("GON_LLM_WORKERS", "4"))

# 관점: 같은 요청을 만드는 쪽(개발자)과 쓰는 쪽(서비스)에서 나눠 본다
LENSES = {
    "dev": ("개발자 관점", "구현 방법, 구조·아키텍처, 기술 선택, 필요한 코드와 설정, 기술 위험·비용·일정"),
    "service": ("서비스 관점", "사용자와 요구 분석, 문제와 가치, 시장·경쟁, UX·운영·정책, 우선순위와 성공 지표"),
}
DEV_CLUSTERS = {"build", "verify", "security", "meta"}  # 총괄이 관점을 정하지 않았을 때 분야로 추정

LEAD = {"id": "lead", "name": "Gon", "kind": "lead", "cluster": "lead", "accent": "slate",
        "task": "요청을 읽고 전문가를 편성한 뒤, 결과를 하나로 합칩니다", "use_for": "팀 편성과 결과 종합"}


def team_cap(depth: Optional[str]) -> int:
    return min(DEPTHS.get(depth or "normal", DEPTHS["normal"]), MAX_EXPERTS)


def _lens_of(e: Dict[str, Any], given: Any = None) -> str:
    given = str(given or "").strip().lower()
    if given in LENSES:
        return given
    return "dev" if e.get("cluster") in DEV_CLUSTERS else "service"


def _public(e: Dict[str, Any], task: str = "", sub_question: str = "", lens: str = "") -> Dict[str, Any]:
    out = {"id": e["id"], "name": e["name"], "kind": e["kind"], "cluster": e["cluster"],
           "cluster_ko": experts.CLUSTER_KO.get(e["cluster"], e["cluster"]), "accent": e["accent"],
           "use_for": e["use_for"], "task": task or e["use_for"], "sub_question": sub_question}
    if lens in LENSES:
        out["lens"] = lens
        out["lens_ko"] = LENSES[lens][0]
    return out


def pool_summary() -> Dict[str, Any]:
    pool = experts.load_pool()
    counts: Dict[str, int] = {}
    for e in pool.values():
        k = experts.CLUSTER_KO.get(e["cluster"], e["cluster"])
        counts[k] = counts.get(k, 0) + 1
    return {"total": len(pool), "clusters": counts, "mode": "ai" if llm.available() else "stub", "max_experts": MAX_EXPERTS, "depths": {k: team_cap(k) for k in DEPTHS}, "llm": llm.info()}


# ---------- 0. 이전 대화 ----------

HISTORY_TURNS = 6  # 맥락으로 넘길 최근 대화 수(질문+답 한 쌍 기준)
HISTORY_CHARS = 1500  # 메시지 하나당 넘길 최대 글자 수


def _history_block(history: Optional[List[Dict[str, str]]]) -> str:
    """같은 대화의 이전 질문과 답. 프롬프트마다 앞에 붙여 이어지는 대화로 만든다."""
    if not history:
        return ""
    lines = []
    for m in history[-HISTORY_TURNS * 2:]:
        who = "사용자" if m.get("role") == "user" else "Gon"
        text = str(m.get("content", "")).strip()
        if len(text) > HISTORY_CHARS:
            text = text[:HISTORY_CHARS] + " …(생략)"
        if text:
            lines.append(f"[{who}] {text}")
    if not lines:
        return ""
    return (
        "<이전 대화>\n" + "\n\n".join(lines) + "\n</이전 대화>\n"
        "이번 요청은 위 대화에 이어지는 것입니다. 지시어(이것, 그거, 아까 등)는 이전 대화를 보고 해석하세요.\n\n"
    )


# ---------- 1. 편성 ----------

def _plan_prompt(query: str, pool: Dict[str, Dict[str, Any]], context: str = "", cap: int = DEPTHS["normal"]) -> str:
    catalog = "\n".join(
        f"{e['id']} | {e['name']} | {experts.CLUSTER_KO.get(e.get('cluster', ''), e.get('cluster', ''))} | {e['use_for']}" for e in pool.values()
    )
    multi = ", ".join(sorted(eid for eid in experts.MULTI_SKILL_IDS if eid in pool))
    lenses = "\n".join(f"  - {k}: {name} ({what})" for k, (name, what) in LENSES.items())
    return (
        "당신은 AI 전문가 팀의 총괄 아키텍트(Gon Lead)입니다.\n"
        "먼저 경로를 정하세요. 인사, 짧은 대화, 간단한 사실 질문, 이전 답에 대한 후속 요청(다시 정리, 줄이기, 번역, 표로 바꾸기 등)처럼 "
        "전문가 팀 없이 바로 답할 수 있으면 \"route\": \"direct\"로 하고 experts는 빈 배열로 두세요. "
        "여러 관점의 분석·조사·설계·제작이 필요하면 \"route\": \"team\"으로 하고 아래대로 팀을 편성하세요.\n"
        "사용자의 <요청>을 해결하기 위해 먼저 사용자의 의도와 핵심 목적을 파악하고, "
        "이를 체계적으로 분석/실행할 구체적인 하위 질문(Sub-questions)으로 분할하세요(요청이 클수록 많이).\n"
        "그리고 각 하위 질문을 전담할 최적의 전문가를 <전문가 목록>에서 선발하고 구체적인 과업을 부여하세요.\n"
        f"- 인원은 요청 크기에 맞추세요. 한 분야의 작은 일은 2~3명, 보통은 4~6명, 여러 분야가 얽힌 큰 일(기획부터 개발·검증까지)은 상한 {cap}명까지. "
        "관련 있는 스킬은 빠뜨리지 말고 넓게 쓰되, 이 요청에 쓰는 이유를 한 줄로 말할 수 없는 전문가는 넣지 마세요.\n"
        f"- 전문가마다 관점(lens)을 정하세요:\n{lenses}\n"
        "  팀 요청이면 두 관점을 모두 넣으세요. 요청이 한쪽 관점뿐이어도 다른 관점에서 점검할 전문가를 최소 1명 두세요.\n"
        "  service에는 주로 기획·리서치·디자인 분야, dev에는 주로 개발·검증·보안 분야를 두세요(이유가 있으면 섞어도 됩니다). "
        "글 다듬기·압축 같은 마무리 도구는 최종 산출물이 글일 때만 넣으세요.\n"
        "- 만드는 전문가(분석, 설계, 조사, 전략)와 점검 전문가(반론 검증, 리뷰, 감사)를 목적에 맞게 균형 있게 배치하세요.\n"
        f"- 하위 스킬이 수백 개인 전문가({multi})를 고를 때만 \"terms\"에 그 하위 스킬 파일을 찾을 영문 키워드 2~4개를 쓰세요. 다른 전문가는 생략하세요.\n"
        "- 이미지 생성 요청 처리: 사용자가 이미지/로고/삽화 생성을 요청했으나 메인 AI에 렌더링 도구가 없는 경우, 프롬프트 전문가(prompts-chat, prompt-지식화)를 배치하여 사정을 설명하고 Midjourney/DALL-E 3용 초고화질 프롬프트 패키지를 생성하도록 하세요.\n"
        "- 출력은 오직 순수 JSON 형식 한 덩어리만 반환하세요:\n"
        '{\n'
        '  "route": "team 또는 direct",\n'
        '  "intent": "사용자 질문의 핵심 의도 요약 한 줄",\n'
        '  "reason": "팀 편성 이유 및 접근 전략 한 문장",\n'
        '  "sub_questions": ["1. 세부 질문 갈래 1", "2. 세부 질문 갈래 2", ...],\n'
        '  "experts": [\n'
        '    {"id": "전문가 id", "lens": "dev 또는 service", "sub_question": "해당 전문가가 전담할 세부 질문 갈래", "task": "수행할 구체적 과업과 산출물", "terms": "영문 키워드(선택)"}\n'
        '  ]\n'
        '}\n\n'
        f"{context}<요청>{query}</요청>\n\n<전문가 목록 (id | 이름 | 분야 | 용도)>\n{catalog}\n</전문가 목록>"
    )


def _parse_plan(text: str, pool: Dict[str, Dict[str, Any]], cap: int = DEPTHS["normal"]) -> Dict[str, Any]:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("편성 결과를 읽지 못했어요")
    data = json.loads(m.group(0))
    intent = str(data.get("intent", "")).strip()
    reason = str(data.get("reason", "")).strip()
    sub_questions = data.get("sub_questions", [])
    if isinstance(sub_questions, list):
        sub_questions = [str(sq).strip() for sq in sub_questions if str(sq).strip()]
    else:
        sub_questions = []

    picked, seen = [], set()
    for item in data.get("experts", []):
        eid = item.get("id")
        if eid in pool and eid not in seen:
            seen.add(eid)
            terms = item.get("terms", "")
            if isinstance(terms, list):
                terms = " ".join(str(t) for t in terms)
            sub_q = str(item.get("sub_question", "")).strip()
            task = str(item.get("task", "")).strip() or pool[eid]["use_for"]
            picked.append({
                "id": eid,
                "lens": _lens_of(pool[eid], item.get("lens")),
                "task": task,
                "sub_question": sub_q,
                "terms": str(terms).strip()[:80]
            })
    route = "direct" if str(data.get("route", "")).strip().lower() == "direct" else "team"
    if route == "team" and len(picked) < 1:
        raise ValueError("고른 전문가가 없어요")
    return {
        "route": route,
        "intent": intent,
        "reason": reason,
        "sub_questions": sub_questions,
        "experts": picked[:cap] if route == "team" else []
    }


def _keyword_plan(query: str, pool: Dict[str, Dict[str, Any]], cap: int = DEPTHS["normal"]) -> Dict[str, Any]:
    """총괄이 응답하지 못했을 때의 대체: 트리거 키워드 점수 + 시너지."""
    q = query.lower()
    scored = sorted(((sum(t.lower() in q for t in e["triggers"]), eid) for eid, e in pool.items()), reverse=True)
    ids = [eid for hits, eid in scored if hits][:3] or ["karpathy", "k-skill"]
    for eid in list(ids):
        for syn in pool[eid]["synergy"]:
            if syn in pool and syn not in ids and syn != "court" and len(ids) < min(cap, 5):
                ids.append(syn)
    ids = ids[:cap]
    return {
        "route": "team",
        "intent": query,
        "reason": "키워드로 편성했어요",
        "sub_questions": [f"{pool[i]['name']} 부문: {pool[i]['use_for']}" for i in ids if i in pool],
        "experts": [{"id": i, "lens": _lens_of(pool[i]), "task": pool[i]["use_for"], "sub_question": pool[i]["use_for"], "terms": ""} for i in ids if i in pool]
    }


# ---------- 2. 전문가 작업 ----------

def _expert_prompt(e: Dict[str, Any], task: str, query: str, sub_question: str = "", terms: str = "", context: str = "", lens: str = "") -> str:
    guide = experts.guidance(e, terms)
    guard = f"\n주의사항: {e['guard']}" if e["guard"] else ""
    sq_part = f"\n[당신이 전담할 세부 질문 갈래]\n{sub_question}\n" if sub_question else ""
    lens = _lens_of(e, lens)
    lens_name, lens_what = LENSES[lens]
    focus = (
        "구현 단계와 구조, 기술 선택의 근거, 꼭 필요한 짧은 코드·설정 예시, 기술 위험과 대안"
        if lens == "dev" else
        "누가 왜 쓰는지, 해결할 문제와 요구사항, 우선순위, 사용자 경험과 운영 이슈, 성공을 판단할 지표"
    )
    return (
        f"당신은 '{e['name']}' 전문가(스킬 id: {e['id']})입니다. 전문 분야: {e['use_for']}{guard}\n"
        f"이번 팀에서 당신은 [{lens_name}]을 맡았습니다: {lens_what}.\n"
        + (f"\n[당신의 작업 지침 및 전문 스킬 발췌]\n{guide}\n[발췌 끝]\n" if guide else "")
        + f"{sq_part}"
        + f"\n[총괄이 당신에게 맡긴 구체적 과업]\n{task}\n"
        + f"\n{context}[사용자 원문 요청]\n<요청>{query}</요청>\n\n"
        "[작업 지침]\n"
        f"1. 스킬 지침을 적용해 {lens_name}에서 구체적으로 분석하세요. 다룰 것: {focus}.\n"
        "2. 확인한 사실과 추정을 구분하세요. 추정은 근거와 가정을 함께 쓰고, 확인하지 못한 수치·출처는 지어내지 말고 비워 두세요.\n"
        "3. 비교할 수 있는 항목과 수치는 마크다운 표로, 단계는 번호 목록으로 정리하세요.\n"
        "4. 다른 관점의 팀원이 놓치기 쉬운 위험이나 반론이 있으면 마지막에 짧게 적으세요.\n"
        "5. 한국어로 800~1,800자. 인사말이나 서론 없이 바로 본론으로 들어가세요.\n"
        "6. 이미지 생성 요청 시: 직접 렌더링이 불가한 경우 사정을 정직하게 밝히고, Midjourney v6 / DALL-E 3 등에 즉시 복사해 사용할 수 있는 완성형 영문 프롬프트와 파라미터 가이드를 제공하세요."
    )


def _coach_prompt(query: str) -> str:
    return (
        f"AI 전문가 팀에게 사용자가 이렇게 요청했습니다.\n<요청>{query}</요청>\n\n"
        "더 좋은 결과를 얻으려면 다음엔 요청에 무엇을 덧붙이면 좋을지, 구체적인 예시를 들어 한국어 두 문장 이내로 알려 주세요. "
        "이모지와 마크다운 없이, 서론 없이 바로 조언만 쓰세요."
    )


# ---------- 3. 종합 ----------

def _direct_prompt(query: str, context: str = "") -> str:
    return (
        "당신은 AI 비서 서비스 Gon입니다. 대화를 이어서 자연스럽게 답하세요.\n"
        "- Gon이 하는 일: 간단한 질문은 바로 답하고, 분석·조사·기획·디자인·코드 같은 큰 일은 전문가 팀(스킬 풀)을 편성해 나눠 맡긴 뒤 결과를 하나로 합쳐 줍니다. "
        "이미지를 첨부하면 볼 수 있습니다. 이 대화 안에서 사용자의 파일을 열거나 바꾸거나 명령을 실행하지는 않습니다. 자기소개를 할 때는 이 범위로만 말하세요.\n"
        "- 질문에 바로 답하고, 필요할 때만 마크다운(목록, 표, 코드 블록)을 쓰세요. 인사말이나 겉치레 맺음말은 쓰지 마세요.\n"
        "- 확인하지 못한 사실·수치·출처는 지어내지 말고 모른다고 말하세요.\n"
        "- 한국어로 답하세요(사용자가 다른 언어를 쓰면 그 언어로).\n\n"
        f"{context}<요청>{query}</요청>"
    )


CHART_EXAMPLE = '{"type": "bar", "title": "기능별 우선순위 점수(5점 만점)", "unit": "점", "labels": ["A", "B"], "values": [5, 3]}'


def _synthesis_prompt(query: str, outputs: List[Dict[str, str]], intent: str = "", sub_questions: Optional[List[str]] = None, context: str = "") -> str:
    def head(o: Dict[str, str]) -> str:
        return f"[{o['lens_ko']} · {o['name']}의 결과]" if o.get("lens_ko") else f"[{o['name']}의 결과]"
    body = "\n\n".join(f"{head(o)}\n{o['text']}" for o in outputs)
    sq_text = "\n".join(f"- {sq}" for sq in sub_questions) if sub_questions else ""
    return (
        "당신은 Gon 총괄입니다. 개발자 관점 팀과 서비스 관점 팀이 낸 결과를 취합해, 사용자가 바로 판단하고 실행할 수 있는 최종 답을 쓰세요.\n"
        "단순히 이어 붙이지 말고, 두 관점이 일치하는 곳과 충돌하는 곳을 가려 판단을 내리세요.\n\n"
        f"{context}<요청 원문>{query}</요청 원문>\n"
        + (f"<핵심 의도>{intent}</핵심 의도>\n" if intent else "")
        + (f"<하위 질문>\n{sq_text}\n</하위 질문>\n\n" if sq_text else "")
        + f"<팀 결과>\n{body}\n</팀 결과>\n\n"
        "[구성: 아래 순서대로]\n"
        "# 요청에 대한 결론을 담은 제목 한 줄\n"
        "## 1. 분석\n"
        "- 서비스 관점(사용자·요구·가치)과 개발자 관점(구현·구조·위험)의 핵심 발견. 두 관점이 충돌하면 무엇을 택했고 왜인지 쓰세요.\n"
        "- 결론을 흔들 수 있는 반증이나 위험이 있으면 여기서 먼저 밝히세요.\n"
        "## 2. 정리\n"
        "- 결론 3줄 이내, 이어서 실행 계획 표(| 순서 | 할 일 | 관점 | 우선순위 | 근거 |).\n"
        "## 3. 시각화\n"
        "- 비교하거나 순위를 매길 수 있는 것은 차트 블록으로 1~2개 그리세요. 형식(코드 블록 언어를 chart로, 내용은 JSON 한 덩어리):\n"
        f"```chart\n{CHART_EXAMPLE}\n```\n"
        "  type은 bar만 씁니다. 값은 팀 결과에 있는 수치나, 이 답 안에서 기준을 밝힌 점수만 쓰세요. 근거 없는 수치를 만들지 마세요. 추정이면 제목에 (추정)을 붙이세요.\n"
        "- 흐름이나 구조는 번호 목록이나 표로 보여 주세요.\n"
        "## 4. 개발\n"
        "- 요청에 만들어야 할 것(코드, 설정, API, 프롬프트, 문서 양식 등)이 있으면 바로 쓸 수 있는 산출물을 언어를 밝힌 코드 블록으로 쓰세요. "
        "길면 핵심 파일·함수부터. 만들 것이 없는 요청이면 이 절은 통째로 빼세요.\n\n"
        "[원칙]\n"
        "- 확인하지 못한 사실·수치·출처는 지어내지 말고 '확인 필요'로 남기세요.\n"
        "- 한국어로, 분량은 내용에 맞게. 인사말이나 겉치레 맺음말 없이 제목부터 시작하세요."
    )


# ---------- 실행 ----------

def _stub_text(e: Dict[str, Any], sub_question: str = "") -> str:
    sq_note = f" (배정 세부 질문: {sub_question})" if sub_question else ""
    return f"(시험용) {e['name']}의 전문 분야는 '{e['use_for']}'입니다.{sq_note} AI가 연결되지 않아 시험용 샘플 결과로 응답합니다."


def _answer(prompt: str, ai: bool, fallback: str, images: Optional[List[Tuple[str, bytes]]] = None, model: Optional[str] = None) -> Iterator[Dict[str, Any]]:
    """답을 글자 조각(delta)으로 흘려보내고, 다 보낸 글을 반환한다(yield from으로 받는다).
    AI가 아무것도 내지 못하면 fallback을 같은 방식으로 보낸다. 이미 일부를 보냈다면 거기서 끝낸다."""
    text = ""
    if ai:
        try:
            for chunk in llm.stream(prompt, timeout=140, images=images, model=model):
                text += chunk
                yield {"type": "delta", "text": chunk}
        except Exception:
            pass
    if not text and fallback:
        text = fallback
        for i in range(0, len(text), 80):
            yield {"type": "delta", "text": text[i:i + 80]}
    return text


def run(
    query: str,
    selected_expert_ids: Optional[List[str]] = None,
    images: Optional[List[Tuple[str, bytes]]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    model: Optional[str] = None,
    depth: Optional[str] = None,
) -> Iterator[Dict[str, Any]]:
    """images: 사용자가 첨부한 (파일 이름, 내용). 편성·전문가 작업·바로 답하기에만 넘긴다(코칭·종합은 글만 본다).
    history: 같은 대화의 이전 질문과 답({"role": "user"|"assistant", "content"}). 모든 프롬프트 앞에 붙는다.
    model: 사용자가 고른 모델. 검증해서 목록에 없으면 CLI 기본 모델을 쓴다. 이 요청의 모든 AI 호출에 같은 모델을 쓴다.
    depth: fast|normal|deep. 팀 인원 상한(DEPTHS). 그 안에서 실제 인원은 총괄이 요청 크기로 정한다."""
    cap = team_cap(depth)
    pool = experts.load_pool()
    ai = llm.available()
    context = _history_block(history)
    model = llm.check_model(model) if ai else None
    yield {"type": "start", "mode": "ai" if ai else "stub", "lead": _public(LEAD), "llm": llm.info(), "model": model}

    # 1) 편성 (사용자 커스텀 선발 또는 AI 자동 편성). 팀이 필요 없으면 총괄이 바로 답한다
    plan = None
    if selected_expert_ids:
        valid_ids = [eid for eid in selected_expert_ids if eid in pool]
        if valid_ids:
            plan = {
                "route": "team",
                "intent": query,
                "reason": "사용자가 직접 선발한 전문 에이전트 팀입니다",
                "sub_questions": [f"{pool[eid]['name']} 분석: {pool[eid]['use_for']}" for eid in valid_ids[:MAX_EXPERTS]],
                "experts": [{"id": eid, "lens": _lens_of(pool[eid]), "task": pool[eid]["use_for"], "sub_question": pool[eid]["use_for"]}
                            for eid in valid_ids[:MAX_EXPERTS]]
            }

    if not plan and ai:
        try:
            plan = _parse_plan(llm.ask(_plan_prompt(query, pool, context, cap), timeout=90, images=images, model=model), pool, cap)
        except Exception:
            plan = None
    plan = plan or _keyword_plan(query, pool, cap)

    intent = plan.get("intent", query)
    sub_questions = plan.get("sub_questions", [])
    route = plan.get("route", "team")
    team = [(pool[p["id"]], p["task"] or pool[p["id"]]["use_for"], p.get("sub_question", "")) for p in plan["experts"]]
    terms_by_id = {p["id"]: p.get("terms", "") for p in plan["experts"]}
    lens_by_id = {p["id"]: _lens_of(pool[p["id"]], p.get("lens")) for p in plan["experts"]}

    yield {
        "type": "plan",
        "route": route,
        "intent": intent,
        "reason": plan["reason"],
        "sub_questions": sub_questions,
        "experts": [_public(e, t, sq, lens_by_id[e["id"]]) for e, t, sq in team], "llm": llm.info()
    }

    # 1-1) 바로 답하기
    if route == "direct":
        yield {"type": "synthesis"}
        final_text = yield from _answer(_direct_prompt(query, context), ai, "", images, model)
        if not final_text:
            yield {"type": "error", "message": "답을 받지 못했어요. 다시 시도해 주세요."}
            return
        yield {"type": "final", "llm": llm.info(), "data": {
            "query": query, "mode": "ai" if ai else "stub", "route": "direct", "intent": intent,
            "plan_reason": plan["reason"], "sub_questions": [], "experts": [], "agent_logs": {},
            "final_content": final_text, "prompt_coach_tip": "",
        }}
        return

    # 2) 병렬 작업 (+ 질문 코칭)
    texts: Dict[str, str] = {}
    errors: Dict[str, str] = {}
    coach = ""
    if not ai:
        for e, t, sq in team:
            texts[e["id"]] = _stub_text(e, sq)
            yield {"type": "agent", "id": e["id"], "status": "done", "text": texts[e["id"]]}
    else:
        with ThreadPoolExecutor(max_workers=max(1, WORKERS)) as ex:
            futs = {
                ex.submit(llm.ask, _expert_prompt(e, t, query, sq, terms_by_id.get(e["id"], ""), context, lens_by_id[e["id"]]), 120, images, model): e
                for e, t, sq in team
            }
            coach_f = ex.submit(llm.ask, _coach_prompt(query), model=model)
            for f in as_completed(futs):
                e = futs[f]
                try:
                    texts[e["id"]] = f.result()
                    yield {"type": "agent", "id": e["id"], "status": "done", "text": texts[e["id"]]}
                except Exception as err:  # 한 명이 실패해도 나머지는 계속한다
                    errors[e["id"]] = str(err)
                    yield {"type": "agent", "id": e["id"], "status": "error", "text": str(err)}
            try:
                coach = coach_f.result()
            except Exception:
                coach = ""

    if not texts:
        yield {"type": "error", "message": "전문가 모두가 응답하지 못했어요. 잠시 후 다시 시도해 주세요."}
        return

    # 3) 종합: 글자 단위로 흘려보낸다. 종합에 실패하면 전문가 결과를 그대로 이어 붙인다
    yield {"type": "synthesis"}
    outputs = [{"name": e["name"], "lens_ko": LENSES[lens_by_id[e["id"]]][0], "text": texts[e["id"]]} for e, _, _ in team if e["id"] in texts]
    joined = "\n\n".join(f"## {o['name']}\n{o['text']}" for o in outputs)
    final_text = yield from _answer(
        _synthesis_prompt(query, outputs, intent=intent, sub_questions=sub_questions, context=context), ai, joined, None, model
    )

    yield {
        "type": "final", "llm": llm.info(),
        "data": {
            "query": query,
            "mode": "ai" if ai else "stub",
            "route": "team",
            "intent": intent,
            "plan_reason": plan["reason"],
            "sub_questions": sub_questions,
            "experts": [_public(e, t, sq, lens_by_id[e["id"]]) for e, t, sq in team],
            "agent_logs": {
                e["id"]: {
                    "name": e["name"],
                    "sub_question": sq,
                    "status": "completed" if e["id"] in texts else "failed",
                    "log": texts.get(e["id"]) or errors.get(e["id"], "")
                }
                for e, _, sq in team
            },
            "final_content": final_text,
            "prompt_coach_tip": coach or "요청에 목표 타깃 고객과 원하는 결과물의 예시를 덧붙이면 더 정확한 답을 받을 수 있어요.",
        },
    }
