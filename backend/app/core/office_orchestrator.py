from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class AgentDeskProfile:
    id: str
    name: str
    role_korean: str
    character_name: str  # The Office 모티브
    badge_label: str
    avatar_color: str
    desk_coord: Dict[str, int]  # x, y percentage
    description: str
    system_instruction: str
    keywords: List[str]

# Munder Difflin 스타일의 가상 오피스 에이전트 팀
OFFICE_ROSTER: Dict[str, AgentDeskProfile] = {
    "gon-boss": AgentDeskProfile(
        id="gon-boss",
        name="Gon (총괄 매니저)",
        role_korean="총괄 비서 & 업무 분배",
        character_name="Michael",
        badge_label="팀 리더",
        avatar_color="from-amber-400 to-orange-500",
        desk_coord={"x": 50, "y": 20},
        description="사용자의 의도를 분석하고 전문 에이전트들에게 업무를 할당하는 수석 비서",
        system_instruction="사용자의 자연어 질문을 분석하여 하위 에이전트들에게 명확한 하위 업무를 할당하십시오.",
        keywords=["총괄", "전체", "관리"]
    ),
    "k-planner": AgentDeskProfile(
        id="k-planner",
        name="K-기획자",
        role_korean="전략 기획 & 사업 보고서",
        character_name="Jim",
        badge_label="국내 표준 기획",
        avatar_color="from-blue-400 to-indigo-600",
        desk_coord={"x": 20, "y": 55},
        description="대한민국 공공/기업 표준 규격 기획서 작성",
        system_instruction="대한민국 표준 보고서 규격(추진배경-목적-현황분석-추진계획-기대효과)으로 기획서를 작성하십시오.",
        keywords=["기획", "사업계획", "보고서", "제안서", "전략", "정부지원", "공문"]
    ),
    "taste-designer": AgentDeskProfile(
        id="taste-designer",
        name="Taste 디자이너",
        role_korean="UI/UX & 브랜드 비주얼",
        character_name="Pam",
        badge_label="세련된 미감 (No-Slop)",
        avatar_color="from-purple-400 to-pink-500",
        desk_coord={"x": 40, "y": 55},
        description="절제된 타이포그래피, 넉넉한 여백, 현대적 미니멀 UI 명세",
        system_instruction="Awwwards 수상작 수준의 정제된 UI/UX 레이아웃, 컬러 팔레트, 타이포그래피 위계를 제시하십시오.",
        keywords=["디자인", "웹디자인", "UI", "UX", "레이아웃", "랜딩페이지", "색상", "여백", "스타일"]
    ),
    "karpathy-dev": AgentDeskProfile(
        id="karpathy-dev",
        name="Karpathy 엔지니어",
        role_korean="클린 코드 & 시스템 구현",
        character_name="Dwight",
        badge_label="본질적 클린 코드",
        avatar_color="from-emerald-400 to-teal-600",
        desk_coord={"x": 60, "y": 55},
        description="First-Principles 기반 군더더기 없는 즉시 실행 가능한 고성능 코드",
        system_instruction="불필요한 추상화 없는 가장 단순하고 본질적인 파이썬/타입스크립트 코드를 작성하십시오.",
        keywords=["코드", "파이썬", "개발", "리팩토링", "알고리즘", "백엔드", "함수", "스크립트"]
    ),
    "court-validator": AgentDeskProfile(
        id="court-validator",
        name="Court 검증관",
        role_korean="논리 검증 & 팩트체크",
        character_name="Angela",
        badge_label="반론 검증 & 무결성",
        avatar_color="from-rose-400 to-red-600",
        desk_coord={"x": 80, "y": 55},
        description="논리적 비약과 허점, 시장 리스크를 사전에 필터링하는 냉철한 감사관",
        system_instruction="결과물에 대해 냉철한 반론을 제기하고 리스크 극복 방안을 명확히 제시하십시오.",
        keywords=["검증", "논리", "반론", "팩트", "오류", "분석", "비판", "리스크"]
    )
}

class OfficeOrchestrator:
    def __init__(self):
        self.roster = OFFICE_ROSTER

    def get_office_layout(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": a.id,
                "name": a.name,
                "role_korean": a.role_korean,
                "character_name": a.character_name,
                "badge_label": a.badge_label,
                "avatar_color": a.avatar_color,
                "desk_coord": a.desk_coord,
                "description": a.description
            }
            for a in self.roster.values()
        ]

    def dispatch_office_tasks(self, query: str) -> Dict[str, Any]:
        """사용자 요청에 대해 가상 오피스 에이전트들이 각자 수행할 태스크 및 산출물 분배"""
        query_lower = query.lower()
        active_agents = ["gon-boss"]  # 총괄은 항상 활성

        for aid, agent in self.roster.items():
            if aid == "gon-boss":
                continue
            for kw in agent.keywords:
                if kw in query_lower:
                    active_agents.append(aid)
                    break

        # 매칭된 서브 에이전트가 없으면 기본으로 기획자 + 디자이너 투입
        if len(active_agents) == 1:
            active_agents.extend(["k-planner", "taste-designer", "court-validator"])

        # 각 에이전트별 개별 작업 로그(가상 터미널 출력용) 생성
        agent_logs: Dict[str, Dict[str, Any]] = {}
        for aid in active_agents:
            agent = self.roster[aid]
            if aid == "gon-boss":
                log = f"사용자 요구사항 '{query}' 접수 완료. 하위 {len(active_agents)-1}명의 전문 에이전트에게 업무 티켓 발송."
            elif aid == "k-planner":
                log = f"대한민국 공공/기업 표준 포맷으로 '{query}'에 대한 사업 배경 및 3단계 실행 로드맵 수립 완료."
            elif aid == "taste-designer":
                log = f"고급스러운 Zinc/Slate 모노톤 팔레트와 넉넉한 타이포그래피 계층을 설계하여 AI 티를 배제함."
            elif aid == "karpathy-dev":
                log = f"오버엔지니어링 없는 본질 중심의 미니멀 아키텍처 및 즉각 실행 가능한 클린 코드 도출."
            elif aid == "court-validator":
                log = f"논리적 비약과 잠재적 리스크(경쟁사 대응, 실행 예산 부족)에 대한 반론 검토 및 방어 대책 마련."
            else:
                log = f"{agent.name} 작업 완료."

            agent_logs[aid] = {
                "name": agent.name,
                "role": agent.role_korean,
                "status": "completed",
                "log": log
            }

        # 통합 산출물
        summary_content = (
            f"🏢 [Munder Difflin 가상 오피스] 통합 업무 완료 보고서\n\n"
            f"**요청 사항:** {query}\n"
            f"**참여 에이전트:** {', '.join([self.roster[aid].name for aid in active_agents])}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"1. [Jim: K-기획 표준] 전략 보고서\n"
            f"- 추진 배경: 시장 기회 요인 및 고객 페인포인트 정밀 분석\n"
            f"- 세부 계획: 1단계 진입 → 2단계 성장 → 3단계 안착 3단계 로드맵 구축\n\n"
            f"2. [Pam: Taste 디자인] 비주얼 & 인터페이스 가이드\n"
            f"- 디자인 철학: 절제된 여백과 고대비 텍스트 계층, 부드러운 200ms 모션 이징\n"
            f"- 스타일 팔레트: Slate 900 베이스 + Indigo 500 악센트\n\n"
            f"3. [Dwight: Karpathy 코어] 엔지니어링 실행안\n"
            f"- 아키텍처: 단일 책임 원칙(SRP) 기반의 가볍고 빠른 FastAPI / React 모듈\n"
            f"- 신뢰성: 0-Dependency 핵심 유틸리티 위주 설계\n\n"
            f"4. [Angela: Court 검증] 논리 검증 및 리스크 대책\n"
            f"- 사전 감사 결과: 시장 침투 시 예상되는 병목점을 사전에 식별하고 대응책 수립 완료."
        )

        coach_tip = (
            f"💡 [Michael's Tip] 다음번에 팀원들에게 일을 시키실 때는 '주요 타깃층'과 '마감 일정'을 함께 전달해주시면 "
            f"에이전트들이 더욱 정교한 세부 실행안을 뽑아냅니다!"
        )

        return {
            "query": query,
            "active_agent_ids": active_agents,
            "agent_logs": agent_logs,
            "final_content": summary_content,
            "prompt_coach_tip": coach_tip
        }

office_orchestrator = OfficeOrchestrator()
