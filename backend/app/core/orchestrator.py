from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class SkillNode:
    id: str
    name: str
    category: str
    badge_label: str
    icon: str
    description: str
    system_instruction: str
    keywords: List[str]
    synergy_skills: List[str]
    sample_queries: List[str]

# 전국민 AI 평준화를 위한 실전 스킬 클러스터 레지스트리
SKILL_REGISTRY: Dict[str, SkillNode] = {
    "k-biz-plan": SkillNode(
        id="k-biz-plan",
        name="K-비즈니스 기획 표준",
        category="planning",
        badge_label="국내 표준 기획",
        icon="briefcase",
        description="대한민국 공공/기업 표준 양식(배경-목적-현황분석-세부실행안-기대효과)으로 구조화",
        system_instruction=(
            "당신은 국내 1티어 전략기획 총괄입니다. 사용자의 요청을 한국 공공기관 및 대기업 표준 보고서 규격"
            "(1. 추진 배경 및 필요성, 2. 목적 및 목표, 3. 주요 현황 분석, 4. 세부 추진 계획, 5. 기대 효과 및 로드맵)으로 완벽히 구조화하여 작성하십시오."
        ),
        keywords=["기획", "사업계획", "보고서", "제안서", "전략", "정부지원", "공문", "사업"],
        synergy_skills=["taste-design", "court-validator", "im-not-ai"],
        sample_queries=["소상공인 지원사업 계획서 써줘", "신규 플랫폼 사업 기획안"]
    ),
    "sns-copywriter": SkillNode(
        id="sns-copywriter",
        name="바이럴 SNS 마케팅 카피라이터",
        category="marketing",
        badge_label="고감도 카피라이팅",
        icon="sparkles",
        description="인스타그램, 블로그, 유튜브 등 플랫폼별 후킹 카피와 타깃 맞춤형 톤앤매너 생성",
        system_instruction=(
            "당신은 100만 바이럴을 달성한 전문 브랜드 카피라이터입니다. 첫 문장에서 시선을 사로잡는 강력한 후킹 문구,"
            "타깃 고객의 결핍을 파고드는 공감 스토리, 명확한 행동 유도(CTA), 그리고 추천 해시태그 10개를 체계적으로 제시하십시오."
        ),
        keywords=["인스타", "마케팅", "카피", "홍보", "광고", "블로그", "유튜브", "피드", "카드뉴스", "콘텐츠"],
        synergy_skills=["taste-design", "im-not-ai"],
        sample_queries=["카페 인스타 피드 홍보글 써줘", "20대 타깃 뷰티 브랜드 광고 카피"]
    ),
    "taste-design": SkillNode(
        id="taste-design",
        name="테이스트 UI/UX 프론트엔드",
        category="design",
        badge_label="세련된 미감 (No Slop)",
        icon="palette",
        description="촌스러운 AI 템플릿 배제, 절제된 타이포그래피, 넉넉한 여백, 현대적 미니멀리즘 스타일",
        system_instruction=(
            "당신은 글로벌 어워드(Awwwards) 수상작 수준의 프론트엔드 수석 디자이너입니다. 과도한 네온 그라데이션을 철저히 배제하고,"
            "정제된 흑회색(Zinc/Slate)과 넉넉한 여백(Whitespace), 절제된 타이포그래피 위계, 자연스러운 트랜지션을 고려한 감각적인 UI 명세 및 코드를 도출하십시오."
        ),
        keywords=["디자인", "웹디자인", "UI", "UX", "레이아웃", "랜딩페이지", "색상", "여백", "스타일", "웹"],
        synergy_skills=["minimal-code", "ui-ux-pro-max"],
        sample_queries=["미니멀한 포트폴리오 웹사이트 디자인", "감각적인 SaaS 랜딩페이지"]
    ),
    "minimal-code": SkillNode(
        id="minimal-code",
        name="Karpathy 엔지니어링 미니멀리즘",
        category="engineering",
        badge_label="본질적 클린 코드",
        icon="code",
        description="First-Principles 사고방식 기반의 군더더기 없는 즉시 실행 가능한 고성능 코드",
        system_instruction=(
            "당신은 안드레이 카파시(Andrej Karpathy) 스타일의 수석 엔지니어입니다. 불필요한 라이브러리 남용과 오버엔지니어링을 배제하고,"
            "가장 직관적이고 가독성이 높으며 단번에 실행 가능한 본질적인 코드를 작성하십시오. 핵심 원리를 주석으로 명쾌하게 설명하십시오."
        ),
        keywords=["코드", "파이썬", "개발", "리팩토링", "알고리즘", "백엔드", "함수", "스크립트", "엔지니어링"],
        synergy_skills=["court-validator", "taste-design"],
        sample_queries=["FastAPI 실시간 채팅 서버 코드", "데이터 처리 파이썬 스크립트 단순화"]
    ),
    "court-validator": SkillNode(
        id="court-validator",
        name="논리 검증 & 팩트체크 가드레일",
        category="validation",
        badge_label="반론 검증 & 무결성",
        icon="shield-check",
        description="자체 반론(Devil's Advocate) 검토 및 논리적 비약/환각 사전 필터링",
        system_instruction=(
            "당신은 냉철한 검증관이자 논증 분석가입니다. 제시된 결과물에 논리적 모순, 비현실적인 가정, 확인되지 않은 과장 표현이 없는지"
            "반대 관점에서 면밀히 검토하고, 한계점과 극복 방안을 명확한 주의사항으로 병기하십시오."
        ),
        keywords=["검증", "논리", "반론", "팩트", "오류", "분석", "비판", "리스크"],
        synergy_skills=["k-biz-plan", "minimal-code"],
        sample_queries=["이 사업 아이템의 치명적인 약점 분석", "기획서 논리적 오류 검증"]
    ),
    "im-not-ai": SkillNode(
        id="im-not-ai",
        name="인간형 자연스러운 커뮤니케이션",
        category="tone",
        badge_label="기계식 상투어 제거",
        icon="message-square",
        description="AI 특유의 진부한 서론/결론 배제, 실무 동료처럼 명확하고 생동감 넘치는 어조",
        system_instruction=(
            "기계적인 AI 상투어('~에 대해 안내해 드리겠습니다', '결론적으로 말씀드리면' 등)를 절대 쓰지 마십시오."
            "전문 실무 파트너로서 친근하면서도 정중하고 군더더기 없는 자연스러운 한국어 문체로 핵심을 먼저 전달하십시오."
        ),
        keywords=["자연스럽게", "어조", "말투", "상투어", "글", "문체"],
        synergy_skills=["k-biz-plan", "sns-copywriter"],
        sample_queries=["친구처럼 편하지만 전문적인 소개글", "딱딱하지 않은 고객 안내문"]
    )
}

class SkillOrchestrator:
    """사용자의 1줄 자연어 입력을 분석하고 최적의 스킬 체인을 조합하는 오케스트레이터"""

    def __init__(self):
        self.registry = SKILL_REGISTRY

    def get_all_skills(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": node.id,
                "name": node.name,
                "category": node.category,
                "badge_label": node.badge_label,
                "icon": node.icon,
                "description": node.description,
                "sample_queries": node.sample_queries
            }
            for node in self.registry.values()
        ]

    def route(self, query: str) -> Dict[str, Any]:
        """사용자 질문에 가장 적합한 스킬 체인을 라우팅"""
        query_lower = query.lower()
        scored_skills = []

        for key, node in self.registry.items():
            score = 0
            for kw in node.keywords:
                if kw in query_lower:
                    score += 2
            if score > 0:
                scored_skills.append((node, score))

        if not scored_skills:
            # 기본 클러스터: 기획 + 디자인 미감 + 인간적 어조
            primary = [self.registry["k-biz-plan"], self.registry["im-not-ai"]]
        else:
            scored_skills.sort(key=lambda x: x[1], reverse=True)
            primary = [item[0] for item in scored_skills[:2]]

        # 시너지 엣지 순회 (Graphify Traversal)
        chain = list(primary)
        visited = {n.id for n in chain}

        for n in primary:
            for syn_id in n.synergy_skills:
                if syn_id in self.registry and syn_id not in visited:
                    chain.append(self.registry[syn_id])
                    visited.add(syn_id)
                if len(chain) >= 4:
                    break

        # 조합된 시스템 프롬프트 조립
        master_system_prompt = (
            "당신은 '전국민 AI 평준화 플랫폼'의 통합 마스터 AI입니다.\n"
            "사용자의 요청에 맞춰 아래 전문 스킬들이 동적으로 활성화되었습니다:\n\n"
        )
        for idx, skill in enumerate(chain, 1):
            master_system_prompt += f"[{idx}. {skill.name} ({skill.badge_label})]\n{skill.system_instruction}\n\n"

        master_system_prompt += (
            "위 모든 스킬들의 원칙을 완벽히 융합하여, 일반적인 단순 답변을 압도하는 상위 1% 퀄리티의 산출물을 작성하십시오.\n"
            "답변 서두에는 불필요한 인사를 생략하고 바로 본론을 제시하십시오."
        )

        # 리터러시 팁(AI 평준화 교육용 추천 가이드)
        prompt_coach_tip = (
            f"💡 다음번엔 질문에 '구체적 타깃'과 '원하는 분량/포맷'을 함께 적어주시면 훨씬 정밀한 결과가 나옵니다. "
            f"(예: '{query} - 20대 대학생 타깃, A4 1장 분량의 표 형태')"
        )

        return {
            "query": query,
            "active_skills": [
                {
                    "id": s.id,
                    "name": s.name,
                    "badge_label": s.badge_label,
                    "category": s.category,
                    "icon": s.icon,
                    "description": s.description
                }
                for s in chain
            ],
            "master_system_prompt": master_system_prompt,
            "prompt_coach_tip": prompt_coach_tip
        }

orchestrator = SkillOrchestrator()

