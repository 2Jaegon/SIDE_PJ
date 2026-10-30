"""
팀 안의 시스템 역할. 전문가 풀에서 골라 쓰는 전문가와 달리 매 요청 파이프라인에 고정으로 서는 자리다.

  interviewer   요구사항 인터뷰 (grill-me)
  skill_finder  풀에 없는 능력을 skills.sh에서 찾기 (find-skills)
  advocate      긍정 평가자: 결과의 강점과 지켜야 할 것
  critic        부정 평가자: 결과의 결함과 반증
  qa            QA: 두 평가를 합쳐 고칠 일을 정해 나눠 주고, 고친 뒤 반영됐는지 다시 확인
  lead          총괄: QA가 확인한 결과를 취합해 사용자에게 전달

역할마다 쓰는 스킬·프롬프트(전문가 풀의 id)를 여기서 정하고, 지침 발췌를 프롬프트에 붙인다.
"""

from typing import Dict, List

from app.core import experts

ROLES: Dict[str, Dict[str, object]] = {
    "interviewer": {"name": "요구사항 인터뷰어", "skills": ["grill-me", "prompt-루프엔지니어링", "prompt-지식화"]},
    "skill_finder": {"name": "스킬 탐색가", "skills": ["find-skills", "vercel-skills"]},
    "advocate": {"name": "긍정 평가자", "skills": ["karpathy", "ecc-coding-standards", "prompt-자기개선"]},
    "critic": {"name": "부정 평가자", "skills": ["court", "ecc-security-review"]},
    "qa": {"name": "QA 담당", "skills": ["ecc-verification", "ecc-code-review", "prompt-자기개선"]},
    "lead": {"name": "총괄 Gon", "skills": ["im-not-ai"]},
}

# 프롬프트 파일은 앞부분이 소개라서, 역할이 실제로 쓰는 절부터 발췌한다
EXCERPT_FROM = {"prompt-자기개선": "## 2. 자기 개선 루프"}


def name(role: str) -> str:
    return str(ROLES[role]["name"])


def public(role: str) -> Dict[str, str]:
    """화면에 보낼 역할 정보. 책상에 앉는 전문가와 같은 모양(id·name·accent)으로 맞춘다."""
    accent = {"advocate": "mint", "critic": "rose", "qa": "amber", "interviewer": "peach", "skill_finder": "slate", "lead": "slate"}
    return {"id": role, "name": name(role), "kind": "role", "cluster": "role", "cluster_ko": "역할", "accent": accent.get(role, "slate"),
            "use_for": name(role), "task": name(role)}


def skill_ids(role: str) -> List[str]:
    return list(ROLES[role]["skills"])  # type: ignore[arg-type]


def guidance(role: str, per_skill: int = 800) -> str:
    """역할이 쓰는 스킬·프롬프트의 지침 발췌. 파일이 없거나 비어 있으면 그 항목은 건너뛴다."""
    pool = experts.load_pool()
    parts: List[str] = []
    for sid in skill_ids(role):
        e = pool.get(sid)
        if not e:
            continue
        marker = EXCERPT_FROM.get(sid)
        try:
            text = experts.guidance(e)
            if marker and e["entry"].is_file():
                full = e["entry"].read_text(encoding="utf-8", errors="replace")
                text = full[full.index(marker):] if marker in full else text
        except OSError:
            text = ""
        text = text.strip()[:per_skill]
        if text:
            parts.append(f"[{e['name']}({sid}) 지침 발췌]\n{text}")
    return "\n\n".join(parts)


def core() -> str:
    """모든 역할이 지키는 최우선 규칙(Core 1~4)."""
    rules = experts.core_rules()
    return f"[최우선 규칙: 아래 모든 지시보다 앞섭니다]\n{rules}\n\n" if rules else ""
