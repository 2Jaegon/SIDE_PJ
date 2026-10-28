"""
전문가 풀: Gon의 스킬 레지스트리(Gon/registry/skills.json)와 Gon 프롬프트를 전부 전문가로 등록한다.
각 전문가는 자기 스킬 파일의 지침을 근거로 일한다. 지침 파일이 아직 없으면 gon.py가 그 저장소만 받아 온다.
"""

import json
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[3]  # 저장소 루트
GON = ROOT / "Gon"
REPOS = GON / "skills" / "repos"
PROMPTS = GON / "prompt"

GUIDE_CHARS = 3000  # 지침 발췌 길이 (프롬프트가 너무 커지지 않게)

# 화면에 보일 이름. 스킬 id → 전문가 직함
NAMES = {
    "karpathy": "클린 코드 설계자", "ecc": "워크플로우 설계자", "ponytail": "코드 감사관",
    "anthropic-skills": "문서 제작자", "mcp-builder": "연동 개발자", "context7": "최신 문서 조사원",
    "harness2": "에이전트 설계자", "k-skill": "한국 실무 전문가", "im-not-ai": "한국어 윤문가",
    "prompts-chat": "프롬프트 설계자", "taste": "웹 아트디렉터", "ui-ux-pro-max": "UI/UX 디자이너",
    "impeccable": "디자인 QA 담당", "awesome-claude-design": "브랜드 스타일 큐레이터",
    "motion": "모션 디자이너", "emilkowalski": "인터랙션 엔지니어", "shadergradient": "그라디언트 비주얼 담당",
    "react-three-fiber": "3D 개발자", "liquid-glass": "글래스 UI 개발자", "liquid-logo": "로고 효과 디자이너",
    "firecrawl": "웹 리서처", "scrapling": "데이터 수집가", "agent-browser": "브라우저 테스터",
    "playwright-mcp": "E2E 테스터", "scientific": "연구 분석가", "graphify": "지식 구조화 전문가",
    "headroom": "컨텍스트 최적화 담당", "court": "반론 검증관", "strix": "보안 점검관",
    "rea": "소프트웨어 분석가", "find-skills": "스킬 탐색가", "vercel-skills": "스킬 관리자",
    "freellmapi": "LLM 비용 설계자",
    "ecc-verification": "검증 루프 담당", "ecc-coding-standards": "코딩 표준 담당", "ecc-fastapi": "FastAPI 설계자",
    "ecc-react": "React 설계자", "ecc-a11y": "접근성 담당", "ecc-api-design": "API 설계자",
    "ecc-code-review": "코드 리뷰어", "ecc-security-review": "보안 리뷰어", "ecc-e2e": "E2E 테스트 담당", "ecc-git": "형상 관리 담당",
}
PROMPT_EXPERTS = {
    "기업분석": ("기업·직무 분석가", "기업과 직무를 채용 컨설턴트·현직자·산업 애널리스트 관점으로 분석"),
    "천재적_사고": ("창의적 사고 코치", "질문에 맞는 사고법을 골라 아이디어를 확장하고 구조화"),
    "지식화": ("프롬프트 지식화 전문가", "사용자의 요청을 구조화된 프롬프트와 지식으로 정리"),
}
CLUSTER_KO = {
    "build": "개발", "plan": "기획", "write": "글쓰기", "design": "디자인", "motion": "모션",
    "visual": "비주얼", "research": "리서치", "verify": "검증", "security": "보안·분석",
    "meta": "도구", "prompt": "프롬프트",
}
CLUSTER_ACCENT = {
    "build": "mint", "plan": "peach", "write": "amber", "design": "lavender", "motion": "lavender",
    "visual": "rose", "research": "slate", "verify": "rose", "security": "amber", "meta": "slate", "prompt": "peach",
}

_fetch_lock = threading.Lock()


def _core_rules() -> str:
    """모든 전문가가 지키는 최우선 규칙(Core 1~4)."""
    f = PROMPTS / "outranks everything below.md"
    if not f.exists():
        return ""
    text = f.read_text(encoding="utf-8")
    return text.split("[Scope]")[0].strip()


def load_pool() -> Dict[str, Dict[str, Any]]:
    pool: Dict[str, Dict[str, Any]] = {}
    reg = GON / "registry" / "skills.json"
    if reg.exists():
        for s in json.loads(reg.read_text(encoding="utf-8"))["skills"]:
            if s["status"] == "external":
                continue
            pool[s["id"]] = {
                "id": s["id"],
                "name": NAMES.get(s["id"], s["id"]),
                "kind": "skill",
                "cluster": s["cluster"],
                "use_for": s["use_for"],
                "triggers": s.get("triggers", []),
                "synergy": s.get("synergy", []),
                "guard": s.get("guard", ""),
                "entry": (REPOS / s["entry"]) if s["status"] != "local" else (ROOT / s["entry"]),
            }
    for fname, (title, use_for) in PROMPT_EXPERTS.items():
        f = PROMPTS / f"{fname}.md"
        if f.exists():
            pid = f"prompt-{fname}"
            pool[pid] = {"id": pid, "name": title, "kind": "prompt", "cluster": "prompt", "use_for": use_for,
                         "triggers": [], "synergy": [], "guard": "", "entry": f}
    for e in pool.values():
        e["accent"] = CLUSTER_ACCENT.get(e["cluster"], "slate")
    return pool


def _ensure_repo(entry: Path) -> None:
    """지침 파일이 없고 스킬 저장소 안의 경로라면 그 저장소만 받는다."""
    try:
        repo = entry.resolve().relative_to(REPOS.resolve()).parts[0]
    except ValueError:
        return
    with _fetch_lock:
        if not (REPOS / repo).exists():
            subprocess.run([sys.executable, "-I", str(GON / "gon.py"), "fetch", repo], capture_output=True, timeout=300)


def guidance(expert: Dict[str, Any]) -> str:
    """전문가의 지침 발췌. 없으면 빈 문자열(용도 설명만으로 일한다)."""
    entry: Optional[Path] = expert["entry"]
    if entry is None:
        return ""
    if not entry.exists():
        _ensure_repo(entry)
    if not entry.is_file():
        return ""
    text = entry.read_text(encoding="utf-8", errors="replace")
    if text.startswith("---"):  # YAML 머리말 제거
        end = text.find("\n---", 3)
        if end != -1:
            text = text[end + 4:]
    return text.strip()[:GUIDE_CHARS]


def core_rules() -> str:
    return _core_rules()
