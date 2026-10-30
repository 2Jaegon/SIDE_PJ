"""
QA 루프. 전문가들의 결과가 총괄에게 가기 전에 한 번 더 걸러낸다.

  1) 긍정 평가자와 부정 평가자가 같은 결과를 각자 입장에서 병렬로 평가한다.
  2) QA가 두 평가를 합쳐 전문가마다 고칠 일(must_fix)과 지킬 것(keep)을 정해 나눠 준다.
     부정 평가자의 critical은 긍정 평가가 어떻든 반드시 고친다(소수 경고 우선).
  3) 고칠 일이 있는 전문가만 병렬로 다시 쓴다.
  4) QA가 고친 결과를 항목별로 다시 확인한다. 남은 문제가 있고 라운드가 남았으면 3~4를 되풀이한다.
  5) 끝까지 남은 문제는 총괄에게 '미해결'로 넘긴다(숨기지 않는다).

평가·QA 단계의 AI 호출이 실패하면 그 단계를 건너뛴다. QA 때문에 요청 전체가 실패하지는 않는다.
이벤트(dict)는 pipeline.run이 그대로 흘려보낸다.
"""

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Iterator, List, Optional, Tuple

from app.core import llm, roles, skillfinder

ROUNDS = {"fast": 1, "normal": 1, "deep": 2}  # 수정 → 재확인 횟수 상한(깊이별)
MAX_REVISE = 6  # 한 라운드에 다시 쓰는 전문가 수 상한(비용)
MAX_ADD = 2  # QA가 개선을 위해 새로 투입할 수 있는 전문가 수 상한
DRAFT_CHARS = 1600  # 평가자·QA에게 넘기는 결과 하나의 길이(전문가 결과가 최대 600자 안팎이라 넉넉하다)
SEVERITY = {"critical": 3, "major": 2, "minor": 1}

STANCES = {
    "advocate": (
        "긍정 평가자",
        "결과의 강점을 찾는다: 근거가 확인되는 주장, 요청에 정확히 맞는 부분, 지켜야 할 것(strengths). "
        "고치는 과정에서 잘된 부분이 지워지지 않게 보호하는 것이 목적이다. 더 키울 수 있는 점은 severity=minor 이슈로 적는다. 칭찬만 늘어놓지 않는다.",
    ),
    "critic": (
        "부정 평가자",
        "결과의 결함을 찾는다: 근거 없는 수치·출처(지어낸 것), 요청이나 과업에서 벗어난 부분, 빠진 것, 다른 팀원 결과와의 충돌, "
        "실행할 수 없는 제안, 보안·비용 위험, 결론을 흔드는 반증. 문제마다 severity를 critical(그대로 두면 틀리거나 위험) / major(품질을 크게 해침) / minor로 매기고 "
        "고치는 방법(fix)을 쓴다. 문제가 없으면 이슈를 비워 둔다. 억지로 만들지 않는다.",
    ),
}

REVIEW_SCHEMA = (
    '{"reviews": [{"id": "전문가 id", "verdict": "pass 또는 revise", "strengths": ["지킬 것"], '
    '"issues": [{"severity": "critical|major|minor", "point": "무엇이 문제인가", "fix": "어떻게 고치는가"}]}], '
    '"cross": ["전문가 사이의 충돌·중복·빈틈"]}'
)


def _json(text: str) -> Dict[str, Any]:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("JSON을 읽지 못했어요")
    data = json.loads(m.group(0))
    if not isinstance(data, dict):
        raise ValueError("JSON 형식이 달라요")
    return data


def _drafts(team: List[Dict[str, Any]], texts: Dict[str, str]) -> str:
    blocks = []
    for m in team:
        if m["id"] not in texts:
            continue
        done = f"\n완료 기준: {m['done_when']}" if m.get("done_when") else ""
        blocks.append(f"<결과 id={m['id']} 이름={m['name']} 관점={m.get('lens_ko', '')}>\n맡은 과업: {m['task']}{done}\n---\n{texts[m['id']][:DRAFT_CHARS]}\n</결과>")
    return "\n\n".join(blocks)


# ---------- 1. 평가 ----------

def review_prompt(role: str, query: str, team: List[Dict[str, Any]], texts: Dict[str, str]) -> str:
    stance, how = STANCES[role]
    return (
        f"{roles.core()}당신은 AI 전문가 팀의 '{stance}'입니다. {how}\n\n"
        f"{roles.guidance(role)}\n\n"
        "[규칙]\n"
        "- 위 결과 전부를 각자의 과업과 완료 기준에 비추어 평가하세요. 결과 id는 위에 적힌 것만 쓰세요.\n"
        "- 확인하지 못한 수치·출처를 사실처럼 쓴 곳은 반드시 짚으세요.\n"
        "- 짧게 쓰세요: 결과마다 strengths 3개·issues 4개 이내, 각 문장 60자 이내. 사소한 것은 적지 마세요.\n"
        f"- 출력은 순수 JSON 한 덩어리만:\n{REVIEW_SCHEMA}\n\n"
        f"<요청>{query}</요청>\n\n{_drafts(team, texts)}"
    )


def parse_review(text: str, valid_ids: List[str]) -> Dict[str, Any]:
    data = _json(text)
    out: Dict[str, Any] = {}
    for r in data.get("reviews") or []:
        eid = r.get("id") if isinstance(r, dict) else None
        if eid not in valid_ids:
            continue
        issues = []
        for it in r.get("issues") or []:
            if not isinstance(it, dict) or not str(it.get("point", "")).strip():
                continue
            sev = str(it.get("severity", "major")).strip().lower()
            issues.append({"severity": sev if sev in SEVERITY else "major", "point": str(it["point"]).strip()[:300],
                           "fix": str(it.get("fix", "")).strip()[:300]})
        out[eid] = {"verdict": "revise" if str(r.get("verdict", "")).lower() == "revise" else "pass",
                    "strengths": [str(s).strip()[:200] for s in (r.get("strengths") or []) if str(s).strip()][:5],
                    "issues": issues[:6]}
    return {"reviews": out, "cross": [str(c).strip()[:300] for c in (data.get("cross") or []) if str(c).strip()][:5]}


def _review_one(role: str, query: str, team: List[Dict[str, Any]], texts: Dict[str, str], model: Optional[str]) -> Dict[str, Any]:
    return parse_review(llm.ask(review_prompt(role, query, team, texts), timeout=120, model=model), list(texts))


# ---------- 2. QA 정리·재배포 ----------

def triage_prompt(query: str, team: List[Dict[str, Any]], texts: Dict[str, str], reviews: Dict[str, Dict[str, Any]], catalog: str = "") -> str:
    rv = json.dumps({k: v for k, v in reviews.items()}, ensure_ascii=False)
    return (
        f"{roles.core()}당신은 AI 전문가 팀의 'QA 담당'입니다. 긍정 평가자와 부정 평가자의 평가를 받아 전문가마다 고칠 일을 정해 나눠 줍니다.\n\n"
        f"{roles.guidance('qa')}\n\n"
        "[규칙]\n"
        "- 부정 평가자의 critical은 긍정 평가가 어떻든 must_fix에 넣으세요. major는 근거가 있으면 넣고, minor는 결과 품질에 보탬이 될 때만 넣으세요.\n"
        "- 두 평가가 같은 곳을 다르게 보면 어느 쪽을 택했는지 note에 한 줄로 밝히세요.\n"
        "- must_fix 항목은 전문가가 그대로 따라 고칠 수 있는 지시문으로 다시 쓰세요(무엇을, 어떻게, 항목당 100자 이내). 고칠 일이 없는 전문가는 assignments에서 빼세요.\n"
        "- keep에는 긍정 평가자가 짚은, 고치다가 지우면 안 되는 부분을 쓰세요.\n"
        "- 전문가 사이의 충돌은 conflicts에 쓰고, 어느 전문가가 맞춰야 하는지 정하세요.\n"
        + (
            f"- 지금 팀에 없는 전문성이 있어야 결과가 나아질 때만 additions에 <추가 후보>의 id로 최대 {MAX_ADD}명을 넣으세요(맡길 일과 완료 기준 포함). 기존 팀이 고치면 되는 일에는 쓰지 마세요.\n"
            f"<추가 후보 (id | 이름 | 용도)>\n{catalog}\n</추가 후보>\n"
            if catalog else ""
        )
        + "- 후보에도 없는 능력이 꼭 필요하면 missing_capabilities에 적으세요(need 한국어, query는 skills.sh 검색용 영문 2~4단어). 없으면 빈 배열.\n"
        "- 출력은 순수 JSON 한 덩어리만:\n"
        '{"assignments": [{"id": "전문가 id", "must_fix": ["고칠 일"], "keep": ["지킬 것"], "note": "판단 근거"}],\n'
        ' "additions": [{"id": "추가할 전문가 id", "task": "맡길 일", "done_when": "끝났다고 볼 기준"}],\n'
        ' "missing_capabilities": [{"need": "부족한 능력", "query": "english words"}],\n'
        ' "conflicts": ["충돌과 정리 결과"], "summary": "QA 한 줄 요약"}\n\n'
        f"<요청>{query}</요청>\n\n{_drafts(team, texts)}\n\n<평가>\n{rv}\n</평가>"
    )


def parse_triage(text: str, valid_ids: List[str], addable: Optional[set] = None) -> Dict[str, Any]:
    data = _json(text)
    assignments: List[Dict[str, Any]] = []
    seen = set()
    for a in data.get("assignments") or []:
        if not isinstance(a, dict) or a.get("id") not in valid_ids or a["id"] in seen:
            continue
        fixes = [str(f).strip()[:300] for f in (a.get("must_fix") or []) if str(f).strip()]
        if not fixes:
            continue
        seen.add(a["id"])
        assignments.append({"id": a["id"], "must_fix": fixes[:6], "keep": [str(k).strip()[:200] for k in (a.get("keep") or []) if str(k).strip()][:5],
                            "note": str(a.get("note", "")).strip()[:200]})
    additions: List[Dict[str, str]] = []
    for a in data.get("additions") or []:
        eid = a.get("id") if isinstance(a, dict) else None
        if addable and eid in addable and eid not in valid_ids and all(x["id"] != eid for x in additions) and str(a.get("task", "")).strip():
            additions.append({"id": eid, "task": str(a["task"]).strip()[:300], "done_when": str(a.get("done_when", "")).strip()[:200]})
    return {"assignments": assignments[:MAX_REVISE], "conflicts": [str(c).strip()[:300] for c in (data.get("conflicts") or []) if str(c).strip()][:5],
            "summary": str(data.get("summary", "")).strip()[:300], "additions": additions[:MAX_ADD],
            "gaps": skillfinder.parse_gaps(data.get("missing_capabilities"))}


def fallback_triage(reviews: Dict[str, Dict[str, Any]], valid_ids: List[str]) -> Dict[str, Any]:
    """QA 호출이 실패했을 때: 부정 평가의 critical·major를 그대로 고칠 일로 쓴다."""
    assignments = []
    for eid in valid_ids:
        issues = [i for r in reviews.values() for i in (r.get(eid) or {}).get("issues", []) if SEVERITY.get(i["severity"], 0) >= 2]
        if issues:
            assignments.append({"id": eid, "must_fix": [f"{i['point']} → {i['fix']}" if i["fix"] else i["point"] for i in issues[:6]], "keep": [], "note": "QA 응답 없음: 평가 결과를 그대로 전달"})
    return {"assignments": assignments[:MAX_REVISE], "conflicts": [], "summary": "", "additions": [], "gaps": []}


def merge_reviews(role_reviews: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """평가자별 {id: 평가}를 QA 프롬프트용으로 합친다: {id: {advocate: ..., critic: ...}}."""
    merged: Dict[str, Dict[str, Any]] = {}
    for role, reviews in role_reviews.items():
        for eid, r in reviews.items():
            merged.setdefault(eid, {})[role] = r
    return merged


# ---------- 3. 수정 ----------

def revise_prompt(member: Dict[str, Any], query: str, draft: str, assign: Dict[str, Any], base_prompt: str) -> str:
    fixes = "\n".join(f"{i}. {f}" for i, f in enumerate(assign["must_fix"], 1))
    keep = "\n".join(f"- {k}" for k in assign.get("keep", []))
    return (
        f"{base_prompt}\n\n"
        "[QA 수정 요청]\n"
        f"위 과업으로 당신이 쓴 결과를 평가자들이 검토했고, QA가 아래 항목을 고치라고 전달했습니다.\n"
        f"<당신이 쓴 결과>\n{draft}\n</당신이 쓴 결과>\n\n"
        f"<반드시 고칠 것>\n{fixes}\n</반드시 고칠 것>\n"
        + (f"<고치다가 지우지 말 것>\n{keep}\n</고치다가 지우지 말 것>\n" if keep else "")
        + "\n[규칙]\n"
        "- 위 항목을 모두 반영한 수정본 전체를 처음부터 끝까지 다시 쓰세요(변경 부분만 쓰지 마세요). 지키라고 한 부분은 그대로 두세요.\n"
        "- 이번 수정에는 웹 도구를 쓰지 않습니다(시간 절약). 이미 확인한 내용만 쓰고, 새로 확인해야 하는 것·근거를 댈 수 없는 항목은 억지로 채우지 말고 '확인 필요'로 남기세요. 지어내서 해결한 척하지 마세요.\n"
        "- 수정본도 최대 600자로 짧게 쓰세요. 서론이나 '수정했습니다' 같은 설명 없이 수정본 본문만 쓰세요."
    )


# ---------- 4. 재확인 ----------

def verify_prompt(query: str, team: List[Dict[str, Any]], assignments: List[Dict[str, Any]], texts: Dict[str, str]) -> str:
    only = [m for m in team if m["id"] in {a["id"] for a in assignments}]
    asg = json.dumps(assignments, ensure_ascii=False)
    return (
        f"{roles.core()}당신은 AI 전문가 팀의 'QA 담당'입니다. 전문가들이 수정본을 냈습니다. 지시한 항목이 실제로 반영됐는지 하나씩 확인하세요.\n\n"
        f"{roles.guidance('qa')}\n\n"
        "[규칙]\n"
        "- 항목마다 수정본 본문에서 반영된 근거를 찾으세요. 반영했다고 말만 하고 본문에 없으면 unresolved입니다.\n"
        "- 확인할 수 없는 수치·출처·사실을 지어내지 않고 '확인 필요'와 이유로 남긴 것은 반영된 것(resolved)으로 보세요. 모르는 것을 채우라고 요구하지 마세요.\n"
        "- 새 문제는 결과를 틀리게 하거나 위험하게 하는 것만 적고, 취향·문체는 적지 마세요.\n"
        "- 지키라고 한 부분(keep)이 지워졌거나, 수정으로 새 문제(new_issues)가 생겼으면 적으세요.\n"
        "- verdict: 모든 항목이 반영되고 새 문제가 없으면 pass, 아니면 fail.\n"
        "- 출력은 순수 JSON 한 덩어리만:\n"
        '{"checks": [{"id": "전문가 id", "resolved": ["반영된 항목"], "unresolved": ["남은 항목(원문 그대로)"], "new_issues": ["수정으로 생긴 문제"], "verdict": "pass 또는 fail"}],\n'
        ' "note": "QA 한 줄 의견"}\n\n'
        f"<요청>{query}</요청>\n\n<QA가 전달한 수정 지시>\n{asg}\n</QA가 전달한 수정 지시>\n\n<수정본>\n{_drafts(only, texts)}\n</수정본>"
    )


def parse_verify(text: str, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
    data = _json(text)
    ids = {a["id"] for a in assignments}
    checks: Dict[str, Dict[str, Any]] = {}
    for c in data.get("checks") or []:
        if not isinstance(c, dict) or c.get("id") not in ids:
            continue
        unresolved = [str(u).strip()[:300] for u in (c.get("unresolved") or []) if str(u).strip()]
        new = [str(u).strip()[:300] for u in (c.get("new_issues") or []) if str(u).strip()]
        passed = not unresolved and not new  # 판정 글자가 아니라 남은 항목으로 본다(항목이 없는데 fail이라고만 하는 응답이 있었다)
        checks[c["id"]] = {"resolved": [str(r).strip()[:200] for r in (c.get("resolved") or []) if str(r).strip()][:6],
                           "unresolved": unresolved[:6], "new_issues": new[:4], "verdict": "pass" if passed else "fail"}
    for a in assignments:  # QA가 빠뜨린 전문가는 확인되지 않은 것으로 본다
        checks.setdefault(a["id"], {"resolved": [], "unresolved": list(a["must_fix"]), "new_issues": [], "verdict": "fail"})
    return {"checks": checks, "note": str(data.get("note", "")).strip()[:300]}


# ---------- 루프 ----------

def run(
    query: str,
    team: List[Dict[str, Any]],
    texts: Dict[str, str],
    base_prompts: Dict[str, str],
    depth: Optional[str] = None,
    model: Optional[str] = None,
    workers: int = 4,
    extras: Optional[Dict[str, Any]] = None,
) -> Iterator[Dict[str, Any]]:
    """team: [{id, name, task, done_when, lens_ko}]. texts는 제자리에서 수정본으로 바뀐다. base_prompts: 전문가별 원래 작업 프롬프트.
    extras: 추가 전문가 투입용 {catalog: 후보 목록 글, addable: 후보 id 집합, member: id,task,done_when -> 팀원 dict, prompt: member -> 작업 프롬프트}.
    마지막에 QA 보고서(dict)를 반환한다(yield from으로 받는다)."""
    ids = [m["id"] for m in team if m["id"] in texts]
    by_id = {m["id"]: m for m in team}
    report: Dict[str, Any] = {"ran": False, "rounds": 0, "reviewed": ids, "revised": [], "added": [], "passed": [], "unresolved": {}, "conflicts": [], "summary": "", "skipped": "", "gaps": [],
                              "steps": [], "revise_sec": {}}
    extras = extras or {}
    ai_name = extras.get("ai", "")

    def step(who: str, what: str, t0: float) -> None:  # 작업 기록 표에 남길 한 줄(누가, 무엇을, 몇 초)
        report["steps"].append({"who": who, "what": what, "ai": ai_name, "sec": round(time.time() - t0)})
    if len(ids) < 1:
        report["skipped"] = "평가할 결과가 없어요"
        return report
    rounds_left = ROUNDS.get(depth or "normal", 1)

    # 1) 긍정·부정 평가 (병렬)
    t_review = time.time()
    yield {"type": "review", "stage": "start", "reviewers": [roles.public("advocate"), roles.public("critic")], "targets": ids}
    role_reviews: Dict[str, Dict[str, Any]] = {}
    cross: List[str] = []
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = {r: ex.submit(_review_one, r, query, team, texts, model) for r in ("advocate", "critic")}
        for r, f in futs.items():
            try:
                res = f.result()
                role_reviews[r] = res["reviews"]
                cross += res["cross"]
                n = sum(len(v["issues"]) for v in res["reviews"].values())
                step(roles.name(r), f"{len(res['reviews'])}건 평가 · " + (f"지적 {n}건" if r == "critic" else f"강점 {sum(len(v['strengths']) for v in res['reviews'].values())}건"), t_review)
                yield {"type": "review", "stage": "done", "reviewer": roles.public(r), "status": "done",
                       "summary": f"{len(res['reviews'])}건 평가, 지적 {n}건" if r == "critic" else f"{len(res['reviews'])}건 평가, 강점 {sum(len(v['strengths']) for v in res['reviews'].values())}건"}
            except Exception as err:
                yield {"type": "review", "stage": "done", "reviewer": roles.public(r), "status": "error", "summary": str(err)[:120]}
    if not role_reviews:
        report["skipped"] = "평가자가 모두 응답하지 못해 QA를 건너뛰었어요"
        return report
    report["ran"] = True
    merged = merge_reviews(role_reviews)

    # 2) QA가 정리해 전문가에게 나눠 준다
    t_triage = time.time()
    try:
        triage = parse_triage(llm.ask(triage_prompt(query, team, texts, merged, extras.get("catalog", "")), timeout=120, model=model), ids, extras.get("addable"))
    except Exception:
        triage = fallback_triage(role_reviews, ids)
    if cross and not triage["conflicts"]:
        triage["conflicts"] = cross[:3]
    report["conflicts"] = triage["conflicts"]
    report["summary"] = triage["summary"]
    report["gaps"] = triage.get("gaps", [])
    step(roles.name("qa"), f"정리·재배포 · 수정 {len(triage['assignments'])}명, 추가 투입 {len(triage.get('additions', []))}명", t_triage)
    assignments = triage["assignments"]
    additions = triage.get("additions", []) if extras.get("member") else []
    new_members = [extras["member"](a["id"], a["task"], a["done_when"]) for a in additions]
    yield {"type": "qa", "stage": "triage", "qa": roles.public("qa"), "summary": triage["summary"], "conflicts": triage["conflicts"],
           "assignments": [{"id": a["id"], "name": by_id[a["id"]]["name"], "must_fix": a["must_fix"]} for a in assignments],
           "additions": [{"id": m["id"], "name": m["name"], "task": m["task"]} for m in new_members]}

    # 3~4) 수정 → 재확인 (남은 문제가 있고 라운드가 남았으면 되풀이)
    revised: List[str] = []
    verdicts: Dict[str, Dict[str, Any]] = {}
    while (assignments or new_members) and rounds_left > 0:
        rounds_left -= 1
        report["rounds"] += 1
        added_now = new_members
        new_members = []
        for m in added_now:
            team.append(m)
            by_id[m["id"]] = m
            yield {"type": "plan_add", "expert": m["public"]}
            yield {"type": "revise", "id": m["id"], "status": "start", "must_fix": [m["task"]]}
        for a in assignments:
            yield {"type": "revise", "id": a["id"], "status": "start", "must_fix": a["must_fix"]}
        t_revise = time.time()
        with ThreadPoolExecutor(max_workers=max(1, min(workers, len(assignments) + len(added_now)))) as ex:
            futs2 = {a["id"]: ex.submit(llm.ask, revise_prompt(by_id[a["id"]], query, texts[a["id"]], a, base_prompts.get(a["id"], "")), 120, None, model, by_id[a["id"]].get("via")) for a in assignments}  # 수정은 웹 없이 글만 고친다
            for m in added_now:
                base_prompts[m["id"]] = extras["prompt"](m)
                futs2[m["id"]] = ex.submit(llm.ask, base_prompts[m["id"]], 240 if m.get("web") else 120, None, model, m.get("via"), bool(m.get("web")))
            for eid, f in futs2.items():
                try:
                    new_text = f.result().strip()
                    if not new_text:
                        raise ValueError("빈 응답")
                    texts[eid] = new_text
                    report["revise_sec"][eid] = report["revise_sec"].get(eid, 0) + round(time.time() - t_revise)
                    if eid in {m["id"] for m in added_now}:
                        report["added"].append(eid)
                    elif eid not in revised:
                        revised.append(eid)
                    yield {"type": "revise", "id": eid, "status": "done"}
                    yield {"type": "agent", "id": eid, "status": "done", "text": new_text, "revised": eid not in report["added"], "added": eid in report["added"]}
                except Exception as err:
                    yield {"type": "revise", "id": eid, "status": "error", "message": str(err)[:120]}
        check_list = assignments + [{"id": m["id"], "must_fix": [f"{m['task']} (완료 기준: {m['done_when']})" if m.get("done_when") else m["task"]], "keep": [], "note": "추가 투입"}
                                    for m in added_now if m["id"] in texts]
        t_verify = time.time()
        try:
            ver = parse_verify(llm.ask(verify_prompt(query, team, check_list, texts), timeout=120, model=model), check_list)
        except Exception:
            ver = {"checks": {a["id"]: {"resolved": [], "unresolved": [], "new_issues": [], "verdict": "unverified"} for a in check_list}, "note": "QA가 재확인에 응답하지 못했어요"}
        verdicts.update(ver["checks"])
        step(roles.name("qa"), f"재확인 {report['rounds']}라운드 · {sum(1 for c in ver['checks'].values() if c['verdict'] == 'pass')}/{len(ver['checks'])}명 통과", t_verify)
        failed = [a for a in check_list if ver["checks"][a["id"]]["verdict"] == "fail"]
        yield {"type": "qa", "stage": "verify", "round": report["rounds"], "qa": roles.public("qa"), "note": ver["note"],
               "overall": "pass" if not failed else "fail",
               "checks": [{"id": a["id"], "name": by_id[a["id"]]["name"], "verdict": ver["checks"][a["id"]]["verdict"],
                           "unresolved": ver["checks"][a["id"]]["unresolved"]} for a in check_list]}
        assignments = [{"id": a["id"], "keep": a.get("keep", []), "note": a.get("note", ""),
                        "must_fix": ver["checks"][a["id"]]["unresolved"] + ver["checks"][a["id"]]["new_issues"]} for a in failed
                       if ver["checks"][a["id"]]["unresolved"] or ver["checks"][a["id"]]["new_issues"]]

    report["revised"] = revised
    report["passed"] = [e for e in revised + report["added"] if verdicts.get(e, {}).get("verdict") == "pass"]
    report["unresolved"] = {e: v["unresolved"] + v["new_issues"] for e, v in verdicts.items() if v["verdict"] == "fail" and (v["unresolved"] or v["new_issues"])}
    return report


def report_for_lead(report: Dict[str, Any], names: Dict[str, str]) -> str:
    """총괄 종합 프롬프트에 붙일 QA 결과 요약. 미해결은 숨기지 않고 넘긴다."""
    if not report.get("ran"):
        return ""
    added = f", 개선을 위해 추가 투입 {len(report['added'])}명" if report.get("added") else ""
    lines = [f"QA {report['rounds']}라운드: 평가 {len(report['reviewed'])}명, 수정 {len(report['revised'])}명{added}, 재확인 통과 {len(report['passed'])}명."]
    if report.get("summary"):
        lines.append(f"QA 의견: {report['summary']}")
    for c in report.get("conflicts", []):
        lines.append(f"전문가 간 충돌: {c}")
    for eid, items in report.get("unresolved", {}).items():
        lines.append(f"미해결({names.get(eid, eid)}): " + " / ".join(items))
    return "\n".join(lines)


# ---------- 5. 최종 점검 (총괄이 쓴 답을 QA 담당관이 마지막으로 본다) ----------

def final_prompt(query: str, final_text: str, report: Dict[str, Any], names: Dict[str, str]) -> str:
    left = "\n".join(f"- {names.get(e, e)}: {' / '.join(items)}" for e, items in (report.get("unresolved") or {}).items()) or "없음"
    return (
        f"{roles.core()}당신은 AI 전문가 팀의 'QA 담당'입니다. 총괄이 사용자에게 보낼 최종 답을 마지막으로 점검합니다.\n\n"
        f"{roles.guidance('qa')}\n\n"
        f"<요청(확정된 요구사항 포함)>{query}</요청>\n\n<QA 단계에서 미해결로 남은 항목>\n{left}\n</QA 단계에서 미해결로 남은 항목>\n\n"
        f"<최종 답>\n{final_text[:9000]}\n</최종 답>\n\n"
        "[점검 항목]\n"
        "1. 요청과 확정된 요구사항의 산출물·범위·제약을 지켰는가\n"
        "2. 근거 없이 지어낸 수치·출처가 없는가(확인 필요는 정직하게 표시됐는가)\n"
        "3. 미해결 항목이 최종 답에서 숨겨지지 않고 위험·확인 필요로 밝혀졌는가\n"
        "4. 바로 실행할 수 있게 정리돼 있는가(결론·순서·담당)\n"
        "- 출력은 순수 JSON 한 덩어리만:\n"
        '{"verdict": "pass 또는 warn", "checks": [{"item": "점검 항목", "ok": true 또는 false, "note": "근거 한 줄"}], "notes": ["사용자가 알아야 할 남은 문제"]}'
    )


def parse_final(text: str) -> Dict[str, Any]:
    data = _json(text)
    checks = [{"item": str(c.get("item", "")).strip()[:120], "ok": bool(c.get("ok")), "note": str(c.get("note", "")).strip()[:200]}
              for c in (data.get("checks") or []) if isinstance(c, dict) and str(c.get("item", "")).strip()][:6]
    ok_all = all(c["ok"] for c in checks) if checks else False
    return {"verdict": "pass" if str(data.get("verdict", "")).lower() == "pass" and ok_all else "warn", "checks": checks,
            "notes": [str(n).strip()[:240] for n in (data.get("notes") or []) if str(n).strip()][:4]}


def final_check(query: str, final_text: str, report: Dict[str, Any], names: Dict[str, str], model: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """최종 답 점검. 실패하면 None(점검하지 못했다고 화면에 표시하지 않고 건너뛴다)."""
    try:
        return parse_final(llm.ask(final_prompt(query, final_text, report, names), timeout=90, model=model))
    except Exception:
        return None
