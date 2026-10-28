import os
import re
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
        keywords=["기획", "사업계획", "보고서", "제안서", "전략", "정부지원", "공문", "사업", "창업", "예산"],
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
        keywords=["인스타", "마케팅", "카피", "홍보", "광고", "블로그", "유튜브", "피드", "카드뉴스", "콘텐츠", "이벤트"],
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
        keywords=["디자인", "웹디자인", "ui", "ux", "레이아웃", "랜딩페이지", "색상", "여백", "스타일", "웹", "화면", "포트폴리오"],
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
        keywords=["코드", "파이썬", "개발", "리팩토링", "알고리즘", "백엔드", "함수", "스크립트", "엔지니어링", "서버", "api", "아키텍처"],
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
        keywords=["검증", "논리", "반론", "팩트", "오류", "분석", "비판", "리스크", "한계", "주의사항"],
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
            primary = [self.registry["k-biz-plan"], self.registry["im-not-ai"]]
        else:
            scored_skills.sort(key=lambda x: x[1], reverse=True)
            primary = [item[0] for item in scored_skills[:2]]

        # 시너지 엣지 순회
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
            "당신은 '전국민 AI 평준화 플랫폼 (Gon)'의 통합 마스터 오케스트레이터입니다.\n"
            "사용자의 요청에 맞춰 아래 전문 스킬들이 동적으로 활성화되었습니다:\n\n"
        )
        for idx, skill in enumerate(chain, 1):
            master_system_prompt += f"[{idx}. {skill.name} ({skill.badge_label})]\n{skill.system_instruction}\n\n"

        master_system_prompt += (
            "위 모든 스킬들의 원칙을 완벽히 융합하여, 일반적인 단순 답변을 압도하는 상위 1% 퀄리티의 실무 산출물을 작성하십시오.\n"
            "답변 서두의 불필요한 AI식 상투어는 완전히 배제하고, 목차와 규격에 맞춘 실제 실무 문서를 도출하십시오."
        )

        coach_data = self._generate_prompt_coach(query, [s.name for s in chain])

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
            "prompt_coach": coach_data,
            "prompt_coach_tip": coach_data["coach_tip"]
        }

    def _generate_prompt_coach(self, query: str, active_skill_names: List[str]) -> Dict[str, Any]:
        """사용자의 1줄 질문을 상위 1% 프롬프트 전문가 레벨로 변환하고 학습 팁 제공"""
        q_lower = query.lower()

        if any(k in q_lower for k in ["카페", "커피", "인스타", "홍보", "카피", "마케팅"]):
            role = "성수동·한남동 F&B 브랜딩 디렉터 및 100만 바이럴 마케터"
            context = f"타깃: 2030 트렌드 세터 및 감성 소비층. 요청: '{query}'"
            structure = (
                "1. 브랜드 무드 및 슬로건 (Tone & Manner)\n"
                "2. 인스타그램 릴스/피드 후킹 카피 3종 (스토리텔링형, 호기심형, 감성 혜택형)\n"
                "3. 오프라인 방문 유도 오픈 이벤트 기획안 (경품, 참여 방법, 태그 전략)\n"
                "4. 런칭 D-14 주간 실행 타임라인"
            )
            coach_tip = (
                "단순히 '카피 써줘'라고 하기보다 [전문가 페르소나 지정] + [타깃 고객 층 한정] + "
                "[3가지 카피 앵글(스토리/호기심/혜택) 분리 요청]을 포함하면 AI가 상투적인 문구를 버리고 실전 카피를 씁니다."
            )
        elif any(k in q_lower for k in ["사업", "지원", "소상공인", "보고서", "제안서", "기획서"]):
            role = "정부지원사업 심사위원 및 10년 차 공공/기업 전략기획 수석"
            context = f"평가자 관점에서 설득력을 극대화할 공식 표준 문서. 요청: '{query}'"
            structure = (
                "1. 사업 추진 배경 및 시장의 치명적 Pain Point\n"
                "2. 핵심 비즈니스 모델 및 차별화 솔루션\n"
                "3. 정량적 목표치 및 분기별 마일스톤 (3단계 로드맵)\n"
                "4. 정부지원금 소요 예산 집행 계획 (인건비, 마케팅, 개발)\n"
                "5. 심사위원 관점의 예상 반론 및 리스크 대응책"
            )
            coach_tip = (
                "정부지원금 및 사업계획서는 '심사위원의 평가 지표'를 프롬프트에 명시해야 합니다. "
                "[배경-목적-현황분석-세부실행안-기대효과]의 5단계 공공 표준 목차를 지정해 주면 논리적 완성도가 300% 향상됩니다."
            )
        elif any(k in q_lower for k in ["코드", "백엔드", "서버", "개발", "파이썬", "api", "아키텍처"]):
            role = "Karpathy 스타일의 심플리시티 지향 수석 백엔드 아키텍트"
            context = f"오버엔지니어링 없는 즉시 구동 가능한 본질적 구조. 요청: '{query}'"
            structure = (
                "1. 시스템 아키텍처 다이어그램 및 핵심 인터페이스 설계\n"
                "2. FastAPI / 비동기 기반 고성능 핵심 핸들러 코드\n"
                "3. 데이터 모델(Pydantic/DB Schema) 및 예외 처리 가드\n"
                "4. 단일 파일 curl 테스트 명령어 및 실행 가이드"
            )
            coach_tip = (
                "개발 요청 시에는 '복잡한 프레임워크 남용 배제'와 'First-Principles 기반의 단일 파일 실행 가능 코드' 조건을 달아주세요. "
                "AI가 불필요한 보일러플레이트 없이 즉시 동작하는 핵심 로직에 집중합니다."
            )
        elif any(k in q_lower for k in ["디자인", "ui", "ux", "웹", "포트폴리오", "랜딩", "스타일"]):
            role = "Awwwards 심사위원급 디지털 프로덕트 UI/UX 총괄 디렉터"
            context = f"AI 슬롭(촌스러운 네온 그라데이션)을 철저히 배제한 절제된 미니멀리즘. 요청: '{query}'"
            structure = (
                "1. Visual Direction: 뉴트럴 흑회색(Zinc/Slate) 팔레트 및 타이포그래피 위계\n"
                "2. Section Blueprint: Hero → Problem/Solution → Features → Social Proof → CTA\n"
                "3. Micro-Interaction: 200~300ms 트랜지션 및 여백(Whitespace) 원칙\n"
                "4. Tailwind CSS 기반 핵심 컴포넌트 코드 규격"
            )
            coach_tip = (
                "디자인 프롬프트에는 '세련되게' 같은 주관적 단어 대신 'AI 클리셰 배제', 'Tailwind Zinc 계열 뉴트럴 팔레트', "
                "'8px 그리드 시스템'과 같은 구체적인 디자인 시스템 언어를 사용해야 전문가급 결과가 나옵니다."
            )
        else:
            role = "상위 1% 실무 총괄 디렉터 및 문제 해결 전문가"
            context = f"현업에서 즉시 통과되는 실무 산출물 도출. 과제: '{query}'"
            structure = (
                "1. 과제의 본질적 핵심 요약 및 추진 방향\n"
                "2. 3단계 구체적 실행 액션 플랜\n"
                "3. 실무 즉시 적용 가능한 완성형 결과물\n"
                "4. 잠재 리스크 점검 및 극복 방안"
            )
            coach_tip = (
                "프롬프트를 작성할 때 [배경(Context)] + [결과물의 형태(Format)] + [절대 하지 말아야 할 것(Constraints)]을 "
                "명시하는 것이 상위 1% 프롬프트 엔지니어의 핵심 비결입니다."
            )

        optimized_prompt = (
            f"당신은 '{role}'입니다.\n\n"
            f"[상황 및 맥락]\n{context}\n\n"
            f"[필수 작성 규격]\n{structure}\n\n"
            f"[작성 가이드라인]\n"
            f"- 기계식 상투어('~에 대해 안내해 드리겠습니다' 등)를 절대 쓰지 말 것\n"
            f"- 즉시 실무에 투입 가능한 완성형 데이터와 구체적인 수치/예시를 담을 것\n"
            f"- 논리적 비약과 미검증 과장을 배제할 것"
        )

        return {
            "before_query": query,
            "after_prompt": optimized_prompt,
            "role": role,
            "coach_tip": coach_tip
        }

    def generate_expert_content(self, query: str, active_skills: List[Dict[str, Any]]) -> str:
        """
        외부 API Key가 없거나 오프라인일 때도
        상위 1% 실무 규격에 맞춘 고밀도 전문가 실무 문서를 완벽히 합성
        """
        q_lower = query.lower()
        skill_tags = ", ".join([f"**[{s['name']}]**" for s in active_skills])

        # 1. 감성 카페 / F&B 마케팅 & 창업
        if any(k in q_lower for k in ["카페", "커피", "디저트", "베이커리", "식음료"]):
            return (
                f"# ☕ 감성 F&B 브랜드 런칭 & 마케팅 실무 전략서\n\n"
                f"> **적용 전문 스킬 체인:** {skill_tags}\n"
                f"> **의뢰 과제:** \"{query}\"\n\n"
                f"---\n\n"
                f"## 1. 브랜드 무드 및 포지셔닝 (Tone & Identity)\n"
                f"- **컨셉 키워드:** '도심 속 정적(靜寂)', '로우 에디션(Raw Edition)', '비움의 미학'\n"
                f"- **공간 및 비주얼 아이덴티티:**\n"
                f"  - 인더스트리얼 러프 콘크리트와 웜우드(오크)의 절제된 대비\n"
                f"  - 자연광 중심의 간접 조명(3000K), 시각적 소음을 최소화한 미니멀 오브제 배치\n"
                f"- **타깃 페르소나:** 업무와 일상에 지쳐 몰입과 휴식이 필요한 2535 전문직 및 크리에이터\n\n"
                f"## 2. 인스타그램 바이럴 카피라이팅 (3가지 앵글)\n\n"
                f"### [앵글 1: 감성 스토리텔링형 - 피드 메인]\n"
                f"```text\n"
                f"하루에 스쳐 지나간 소음은 몇 개였을까요.\n"
                f"문을 열고 들어서는 순간, 오직 원두를 내리는 소리와 따뜻한 그림자만 남습니다.\n\n"
                f"바쁜 당신의 타임라인에 잠시 쉼표를 찍어드리는 곳.\n"
                f"우리가 공간을 짓고 커피를 볶은 이유는 단 하나, '온전한 15분의 침묵' 때문이었습니다.\n\n"
                f"📍 [매장 위치] 서울 성동구 연무장길 12\n"
                f"⏰ Soft Opening : 11:00 - 20:00\n"
                f"```\n\n"
                f"### [앵글 2: 호기심 유발형 - 릴스 커버 & 인스타 스토리]\n"
                f"```text\n"
                f"\"여기 간판이 어디 있어요?\"\n"
                f"오시는 손님 열에 아홉이 묻는 질문입니다.\n\n"
                f"간판 대신 은은한 원두 향과 턴테이블 음악으로만 위치를 알립니다.\n"
                f"아는 사람만 골목 끝에서 찾아오는 숨은 아지트.\n"
                f"이번 주말, 당신만의 취향을 발견해보세요.\n"
                f"```\n\n"
                f"### [앵글 3: 명확한 행동유도(CTA)형 - 오픈 프로모션]\n"
                f"```text\n"
                f"[OPEN EVENT : First 100 Brewers]\n"
                f"첫 발걸음을 함께해 주시는 100분께, 바리스타가 직접 블렌딩한 시그니처 드립백(2종)과 브랜드 노트를 선물합니다.\n\n"
                f"✔ 참여 방법:\n"
                f"1. 본 게시물 저장 및 계정 팔로우\n"
                f"2. 프로필 링크에서 '오픈 멤버십 티켓' 캡처 후 방문 시 제시\n"
                f"✔ 기간: 11월 1일 ~ 11월 7일 (소진 시 조기 마감)\n"
                f"```\n\n"
                f"**추천 해시태그:**\n"
                f"`#감성카페 #성수신상카페 #신상카페투어 #핸드드립전문 #공간브랜딩 #필터커피 #카페인테리어 #미니멀라이프 #주말갈만한곳 #커피러버`\n\n"
                f"---\n\n"
                f"## 3. 오픈 이벤트 및 4주 런칭 실행 로드맵\n"
                f"| 일정 | 주요 과제 | 세부 실행 내용 | 책임 스킬 |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| **D-14** | 공간 마감 & 티징 | 인스타 계정 개설, 공간 무드 티저 영상 3편 릴리즈 | SNS 마케팅 |\n"
                f"| **D-7** | 인플루언서 프라이빗 데이 | 로컬 감성 인플루언서 15인 초대 및 시음회 진행 | 바이럴 카피 |\n"
                f"| **D-Day** | 그랜드 오픈 & First 100 | 현장 드립백 증정 및 방문 인증 스토리 이벤트 가동 | K-비즈니스 기획 |\n"
                f"| **D+14** | 시그니처 굿즈 런칭 | 원두 구독 및 텀블러 에디션 런칭, 2차 재방문 쿠폰 발송 | 전략 기획 |\n\n"
                f"---\n\n"
                f"## 4. 리스크 검증 및 방어 전략 (Court-Validator)\n"
                f"- **위험 요인 1 (상권 경쟁 과열):** 인근 기존 카페와의 차별점 부재 시 단발성 방문 후 이탈 위험.\n"
                f"  - *대응책:* 시각적 인테리어에만 의존하지 않고 '원두 큐레이션 카드(스토리 노트)'를 매 음료마다 제공해 경험의 질 차별화.\n"
                f"- **위험 요인 2 (오픈 초기 회전율 저하):** 감성 카페 특성상 긴 체류 시간으로 매출 한계 봉착.\n"
                f"  - *대응책:* 스탠딩 바 전용 에스프레소 메뉴(가격 할인 혜택)를 신설해 테이크아웃 및 빠른 회전 고객 동시 유입."
            )

        # 2. 사업계획서 / 공공지원 / 소상공인 기획
        elif any(k in q_lower for k in ["사업계획", "소상공인", "지원사업", "보고서", "제안서", "정부지원", "공문"]):
            return (
                f"# 📋 표준 비즈니스 사업계획서 및 지원사업 제안 규격\n\n"
                f"> **적용 전문 스킬 체인:** {skill_tags}\n"
                f"> **의뢰 과제:** \"{query}\"\n\n"
                f"---\n\n"
                f"## 1. 추진 배경 및 시장의 당면 과제\n"
                f"- **현 시장의 구조적 문제점:**\n"
                f"  - 급변하는 디지털/AI 환경에서 소상공인 및 중소기업의 디지털 전환(DX) 진입 장벽 극심\n"
                f"  - 기존 상용 소프트웨어의 높은 월 구독료와 복잡한 인터페이스로 인한 중도 포기율 67% 상회\n"
                f"- **사업 추진의 시의성:**\n"
                f"  - 현 정부의 소상공인 스마트 전환 지원 정책 및 공공 데이터 바우처 사업 연계 최적기\n\n"
                f"## 2. 사업 목적 및 정량적 목표\n"
                f"- **최종 비전:** '비전문가도 5분 만에 실무 보고서와 마케팅 카피를 완성하는 현장 밀착형 솔루션 구축'\n"
                f"- **1차년도 정량 목표:**\n"
                f"  - 유료/활성 가맹점 수: **500개 사 유치**\n"
                f"  - 사용자 업무 시간 단축률: **기존 대비 75% 절감** (건당 4시간 → 1시간 이내)\n"
                f"  - 고객 만족도(CSAT): **92점 이상 유지**\n\n"
                f"## 3. 세부 사업 내용 및 차별화 전략\n"
                f"1. **현장 맞춤형 경량 템플릿 엔진:**\n"
                f"   - 복잡한 프롬프트 작성 없이 업종(F&B, 도소매, 서비스) 선택만으로 공공 규격 자동 완성\n"
                f"2. **비용 효율적 하이브리드 아키텍처:**\n"
                f"   - 고비용 거대 언어 모델과 경량 도메인 모델을 적응형으로 분기하여 인프라 비용 60% 절감\n"
                f"3. **지속 가능한 리터러시 교육 연계:**\n"
                f"   - 결과물 도출에 그치지 않고 자생적 활용 역량을 기를 수 있는 단계별 가이드 실시간 제공\n\n"
                f"## 4. 소요 예산 집행 계획 (정부지원금 연계)\n"
                f"| 항목 | 세부 내역 | 금액 (천원) | 비율 (%) |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| **인건비** | 핵심 엔지니어 및 기획 전문 인력 2인 | 45,000 | 45.0% |\n"
                f"| **개발비** | 클라우드 인프라, API 사용료, 보안 감사 | 25,000 | 25.0% |\n"
                f"| **마케팅비**| 타깃 소상공인 협회 홍보 및 바이럴 콘텐츠 제작 | 20,000 | 20.0% |\n"
                f"| **수용비** | 지식재산권(특허) 출원 및 회계 정산비 | 10,000 | 10.0% |\n"
                f"| **합계** | **총 사업비** | **100,000** | **100.0%** |\n\n"
                f"---\n\n"
                f"## 5. 심사위원 관점 검증 및 기대 효과 (Court-Validator)\n"
                f"- **자체 반론 검토:** 대기업(네이버, 카카오 등)의 유사 무료 서비스 출시 시 방어 기제 존재 여부.\n"
                f"- **방어 논리:** 대기업의 범용 서비스와 달리, '골목 상권 및 소상공인 특화 행정 서식과 지자체 지원 사업 데이터'를 깊이 있게 연동하여 버티컬 락인(Lock-in) 형성."
            )

        # 3. 백엔드 / 시스템 아키텍처 / 엔지니어링
        elif any(k in q_lower for k in ["백엔드", "서버", "코드", "파이썬", "api", "아키텍처", "엔지니어링"]):
            return (
                f"# ⚡ 고성능 경량 백엔드 아키텍처 & 클린 코드 명세\n\n"
                f"> **적용 전문 스킬 체인:** {skill_tags}\n"
                f"> **의뢰 과제:** \"{query}\"\n\n"
                f"---\n\n"
                f"## 1. 아키텍처 철학 (Karpathy First-Principles)\n"
                f"- **단순함 최우선:** 불필요한 계층 분리와 거대한 ORM 배제, 표준 비동기 라이브러리(`FastAPI`, `AsyncIO`) 중심 설계\n"
                f"- **무상태(Stateless) 확장성:** 모든 비즈니스 로직을 상태 비의존적으로 구성하여 수평적 스케일아웃 용이\n\n"
                f"## 2. 핵심 구현 코드 (Production-Ready Python)\n"
                f"```python\n"
                f"import asyncio\n"
                f"from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect\n"
                f"from pydantic import BaseModel, Field\n"
                f"from typing import List, Dict, Any\n\n"
                f"app = FastAPI(title=\"High-Performance Core Engine\", version=\"1.0.0\")\n\n"
                f"class EventPayload(BaseModel):\n"
                f"    user_id: str = Field(..., description=\"고유 사용자 식별자\")\n"
                f"    topic: str = Field(..., description=\"구독 채널 및 이벤트 주제\")\n"
                f"    content: Dict[str, Any] = Field(default_factory=dict)\n\n"
                f"class ConnectionManager:\n"
                f"    \"\"\"경량 실시간 웹소켓 커넥션 브로커 (In-Memory PubSub)\"\"\"\n"
                f"    def __init__(self):\n"
                f"        self.active_connections: Dict[str, List[WebSocket]] = {{}}\n\n"
                f"    async def connect(self, topic: str, websocket: WebSocket):\n"
                f"        await websocket.accept()\n"
                f"        if topic not in self.active_connections:\n"
                f"            self.active_connections[topic] = []\n"
                f"        self.active_connections[topic].append(websocket)\n\n"
                f"    def disconnect(self, topic: str, websocket: WebSocket):\n"
                f"        if topic in self.active_connections:\n"
                f"            self.active_connections[topic].remove(websocket)\n\n"
                f"    async def broadcast(self, topic: str, message: dict):\n"
                f"        if topic in self.active_connections:\n"
                f"            tasks = [ws.send_json(message) for ws in self.active_connections[topic]]\n"
                f"            await asyncio.gather(*tasks, return_exceptions=True)\n\n"
                f"manager = ConnectionManager()\n\n"
                f"@app.post(\"/api/v1/publish\")\n"
                f"async def publish_event(payload: EventPayload):\n"
                f"    \"\"\"이벤트 브로드캐스트 엔드포인트\"\"\"\n"
                f"    await manager.broadcast(payload.topic, payload.model_dump())\n"
                f"    return {{\"status\": \"dispatched\", \"topic\": payload.topic}}\n\n"
                f"@app.websocket(\"/ws/{{topic}}\")\n"
                f"async def websocket_endpoint(websocket: WebSocket, topic: str):\n"
                f"    await manager.connect(topic, websocket)\n"
                f"    try:\n"
                f"        while True:\n"
                f"            data = await websocket.receive_text()\n"
                f"            # 핑퐁 헬스체크 및 클라이언트 메시지 수신\n"
                f"            await websocket.send_json({{\"type\": \"ack\", \"echo\": data}})\n"
                f"    except WebSocketDisconnect:\n"
                f"        manager.disconnect(topic, websocket)\n"
                f"```\n\n"
                f"## 3. 부하 분산 및 성능 최적화 가이드\n"
                f"- **Uvicorn 멀티 워커 구동:** `uvicorn app:app --workers 4 --loop uvloop`\n"
                f"- **메모리 누수 방지:** 비정상 소켓 연결 해제 시 `return_exceptions=True`를 통한 좀비 태스크 정리\n\n"
                f"## 4. 논리적 무결성 검증 (Court-Validator)\n"
                f"- **단일 서버 메모리 한계:** 멀티 인스턴스 클러스터 확장 시 Redis Pub/Sub 또는 NATS 연동이 필수적이므로, 현재 코드는 단일 노드 1만 동시 접속 처리에 최적화됨."
            )

        # 4. 디자인 / UI/UX / 포트폴리오
        elif any(k in q_lower for k in ["디자인", "ui", "ux", "웹", "포트폴리오", "랜딩", "스타일"]):
            return (
                f"# 🎨 테이스트 중심의 안티-슬롭(Anti-Slop) UI/UX 디자인 가이드\n\n"
                f"> **적용 전문 스킬 체인:** {skill_tags}\n"
                f"> **의뢰 과제:** \"{query}\"\n\n"
                f"---\n\n"
                f"## 1. 디자인 시스템 & 무드보드 (No Slop Principle)\n"
                f"- **과도한 AI 클리셰 배제:** 형광 보라/청록의 과도한 블러 그라디언트와 부유하는 장식 카드를 전면 금지\n"
                f"- **컬러 팔레트:**\n"
                f"  - **Background:** `zinc-950` (`#09090b`) - 깊이감 있는 흑연색\n"
                f"  - **Surface/Card:** `zinc-900/60` (`#18181b`) + 섬세한 `border-zinc-800/80`\n"
                f"  - **Text Primary:** `zinc-100` (`#f4f4f5`) / **Text Muted:** `zinc-400` (`#a1a1aa`)\n"
                f"  - **Accent:** 절제된 샴페인 골드 (`#d4af37`) 또는 클린 인디고 (`#6366f1`)\n\n"
                f"## 2. 화면 섹션별 블루프린트\n"
                f"1. **Hero Section:**\n"
                f"   - 80자 이내의 단호한 헤드라인 (사족 없는 가치 제안)\n"
                f"   - 마우스 호버에만 반응하는 절제된 인터랙션\n"
                f"2. **Work Showcase (Grid):**\n"
                f"   - 비대칭 2열 그리드, 넉넉한 48px 패딩으로 콘텐츠 집중도 극대화\n"
                f"   - 이미지 줌은 300ms ease-out으로 자연스럽고 정숙하게 작동\n"
                f"3. **Typography & Readability:**\n"
                f"   - 헤딩은 `font-black tracking-tight`, 본문은 `leading-relaxed`와 15px 크기 준수\n\n"
                f"## 3. 마감 검증 체크리스트 (Impeccable QA)\n"
                f"- [x] 모바일 375px 뷰포트에서 가로 스크롤(오버플로우)이 일절 발생하지 않는가?\n"
                f"- [x] 텍스트가 `...`으로 잘려 정보가 누락되는 레이아웃 파괴 현상이 없는가?\n"
                f"- [x] 키보드 Tab 키 이동 시 포커스 링이 명확하게 시각화되는가?"
            )

        # 5. 일반 실무 기획 및 과제
        else:
            return (
                f"# 🚀 전문가 스킬 통합 실무 솔루션 보고서\n\n"
                f"> **적용 전문 스킬 체인:** {skill_tags}\n"
                f"> **의뢰 과제:** \"{query}\"\n\n"
                f"---\n\n"
                f"## 1. 의뢰 과제의 본질 및 전략적 접근\n"
                f"- 사용자의 요청 '{query}'에 대해 기획, 디자인, 기술, 검증 스킬을 종합적으로 결합하여 분석을 완료했습니다.\n"
                f"- 모호한 단순 답변을 배제하고, 현업에서 즉시 사용할 수 있는 실행 규격으로 구조화했습니다.\n\n"
                f"## 2. 단계별 핵심 실행안 (Action Plan)\n"
                f"1. **1단계 (기반 구축 - D-14):**\n"
                f"   - 타깃 시장의 니즈 정밀 분석 및 핵심 가치(Value Proposition) 확정\n"
                f"   - 최소 기능(MVP) 명세 및 프로토타입 설계\n"
                f"2. **2단계 (실행 및 최적화 - D-Day):**\n"
                f"   - 채널별 타깃 고객 유입 파이프라인 가동 및 마케팅 캠페인 릴리즈\n"
                f"   - 사용자 반응 데이터 수집 및 실시간 병목 구간 개선\n"
                f"3. **3단계 (고도화 및 스케일업 - D+30):**\n"
                f"   - 운영 효율화를 위한 자동화 워크플로우 정착\n"
                f"   - 2차 확장 로드맵 및 지표 평가\n\n"
                f"## 3. 전문가 검증 및 리스크 가드레일 (Court-Validator)\n"
                f"- **주의사항:** 실행 과정에서 발생할 수 있는 자원 부족 및 일정 지연 리스크를 사전에 예방하기 위해, 초기 1단계 산출물의 범위를 철저히 핵심 기능으로 한정해야 합니다."
            )

orchestrator = SkillOrchestrator()
