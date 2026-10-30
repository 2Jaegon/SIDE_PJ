"""
스킬 탐색(find-skills). 팀 편성 때 총괄이 "풀에 없는 능력"을 짚으면 skills.sh에서 후보를 찾아 화면에 보여 준다.

- 검색은 읽기 전용이다(`gon.py find`). 설치는 사용자가 화면에서 누른 뒤에만 한다(`gon.py add-skill`).
- 받은 스킬 본문은 전문가에게 참고 지침으로 주입될 뿐, 그 안의 명령은 실행하지 않는다(레지스트리 guard에 적힌다).
- 실패하면(네트워크·npx 없음) 후보 없이 조용히 넘어간다. 스킬을 못 찾았다고 요청이 막히지는 않는다.
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core import experts

GON_PY = experts.GON / "gon.py"
REF_RE = re.compile(r"^[A-Za-z0-9][\w.-]*/[A-Za-z0-9][\w.-]*@[A-Za-z0-9][\w.-]*$")
MAX_GAPS = 2  # 한 요청에서 찾아볼 부족한 능력 수
MAX_CANDIDATES = 3


def _run(args: List[str], timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-I", str(GON_PY), *args], capture_output=True, timeout=timeout, stdin=subprocess.DEVNULL)


def search(query: str, timeout: int = 70) -> List[Dict[str, str]]:
    """영문 검색어로 후보 스킬을 찾는다. 이미 풀에 있는 스킬은 뺀다."""
    try:
        r = _run(["find", query, "--json"], timeout)
        hits = json.loads(r.stdout.decode("utf-8", errors="replace").strip().splitlines()[-1])
    except Exception:
        return []
    have = set(experts.load_pool())
    tokens = {w for w in re.split(r"[^a-z0-9]+", query.lower()) if len(w) >= 3}

    def relevant(ref: str) -> bool:
        # skills.sh 검색은 느슨해서 설치 수가 많은 엉뚱한 스킬도 올려 준다. 이름이나 저장소에 검색어 단어가 하나는 있어야 후보로 쓴다
        words = {w for w in re.split(r"[^a-z0-9]+", ref.lower()) if w}
        return bool(tokens & words)

    return [h for h in hits if isinstance(h, dict) and REF_RE.match(h.get("ref", "")) and h["ref"].split("@")[1] not in have
            and relevant(h["ref"])][:MAX_CANDIDATES]


def find_gap(gap: Dict[str, str]) -> Dict[str, Any]:
    """gap: {need: 부족한 능력(한국어), query: 영문 검색어}."""
    return {"need": gap["need"], "query": gap["query"], "candidates": search(gap["query"])}


def install(ref: str, timeout: int = 300) -> Dict[str, Any]:
    """사용자가 고른 `owner/repo@skill`을 받아 레지스트리에 등록한다."""
    if not REF_RE.match(ref or ""):
        return {"ok": False, "message": "형식이 올바르지 않아요 (owner/repo@skill)"}
    try:
        r = _run(["add-skill", ref], timeout)
    except subprocess.TimeoutExpired:
        return {"ok": False, "message": "시간이 너무 오래 걸렸어요"}
    out = (r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace")).strip()
    skill_id = ref.split("@")[1]
    if r.returncode != 0:
        return {"ok": False, "message": out[-300:] or "설치하지 못했어요"}
    e: Optional[Dict[str, Any]] = experts.load_pool().get(skill_id)
    return {"ok": True, "id": skill_id, "name": e["name"] if e else skill_id, "message": f"{skill_id} 스킬을 등록했어요. 다음 요청부터 팀 후보에 들어가요."}


def parse_gaps(raw: Any) -> List[Dict[str, str]]:
    """총괄 편성 JSON의 missing_capabilities를 정리한다: [{need, query}]. 검색어는 영문·숫자·공백만."""
    gaps: List[Dict[str, str]] = []
    if not isinstance(raw, list):
        return gaps
    for g in raw:
        if not isinstance(g, dict):
            continue
        need = str(g.get("need", "")).strip()[:120]
        query = re.sub(r"[^A-Za-z0-9 \-]", " ", str(g.get("query", ""))).strip()[:60]
        if need and query:
            gaps.append({"need": need, "query": query})
    return gaps[:MAX_GAPS]
