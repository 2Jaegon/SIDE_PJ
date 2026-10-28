import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

TEMPLATES_DIR = Path(__file__).parent / "agent_templates"

class MunderDifflinOrchestrator:
    """Munder Difflin 실제 36개 공식 에이전트 템플릿 기반 오케스트레이터"""

    def __init__(self):
        self.templates: Dict[str, Dict[str, Any]] = {}
        # 현재 오피스에 기본 출근한 5인 팀 (Michael + 기본 4인)
        self.current_team_ids: List[str] = [
            "frontend-developer",
            "product-designer",
            "backend-and-full-stack-engineer",
            "qa-and-test-engineer",
            "growth-marketer"
        ]
        self.load_all_templates()

    def categorize_agent(self, agent_id: str, capabilities: List[str]) -> str:
        aid = agent_id.lower()
        caps = " ".join(capabilities).lower()
        if any(k in aid or k in caps for k in ["engineer", "developer", "devops", "security", "ml", "ai"]):
            return "Engineering"
        elif any(k in aid or k in caps for k in ["designer", "video", "motion", "brand"]):
            return "Design & Creative"
        elif any(k in aid or k in caps for k in ["marketing", "marketer", "seo", "social", "sales", "growth"]):
            return "Marketing & Sales"
        elif any(k in aid or k in caps for k in ["product", "project", "researcher", "analyst"]):
            return "Product & Strategy"
        else:
            return "Operations & Legal"

    def load_all_templates(self):
        if not TEMPLATES_DIR.exists():
            return

        for file_path in TEMPLATES_DIR.glob("*.agent.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    agent_id = file_path.stem.replace(".agent", "")
                    caps = data.get("configs", {}).get("capabilities", [])
                    category = self.categorize_agent(agent_id, caps)
                    
                    self.templates[agent_id] = {
                        "id": agent_id,
                        "name": data.get("name", agent_id),
                        "description": data.get("description", ""),
                        "character": data.get("configs", {}).get("character", "worker"),
                        "accent": data.get("configs", {}).get("accent", "slate"),
                        "role": data.get("configs", {}).get("role", ""),
                        "goal": data.get("configs", {}).get("goal", ""),
                        "capabilities": caps,
                        "category": category,
                        "mcp_servers": data.get("mcpServers", {}).get("catalog", []),
                        "skills": data.get("skills", {}).get("catalog", [])
                    }
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

    def get_all_templates(self) -> List[Dict[str, Any]]:
        """36개 전체 템플릿 목록 반환"""
        return list(self.templates.values())

    def set_active_team(self, agent_ids: List[str]) -> List[Dict[str, Any]]:
        """사용자가 커스텀 선택한 에이전트 목록으로 오피스 데스크 팀 교체 (최대 5명)"""
        valid_ids = [aid for aid in agent_ids if aid in self.templates]
        if valid_ids:
            self.current_team_ids = valid_ids[:5]
        return self.get_active_office_team()

    def get_active_office_team(self, query: str = "") -> List[Dict[str, Any]]:
        """현재 출근 중인 5인 에이전트 데스크 정보 반환"""
        selected_ids = list(self.current_team_ids)

        # 2D 오피스 좌표 계산 (하단 4인 데스크 + 상단 Michael/팀장 데스크)
        coords = [
            {"x": 20, "y": 62},
            {"x": 40, "y": 62},
            {"x": 60, "y": 62},
            {"x": 80, "y": 62},
            {"x": 50, "y": 25}
        ]

        team = []
        for idx, aid in enumerate(selected_ids):
            tmpl = self.templates.get(aid, {
                "id": aid,
                "name": aid.replace("-", " ").title(),
                "character": "worker",
                "accent": "slate",
                "role": "Agent Worker",
                "goal": "Complete the assigned mission.",
                "capabilities": ["Generalist"],
                "category": "General",
                "skills": [],
                "mcp_servers": []
            })
            
            coord = coords[idx] if idx < len(coords) else {"x": 50, "y": 50}
            team.append({
                "id": tmpl["id"],
                "name": tmpl["name"],
                "character_name": tmpl["character"].capitalize(),
                "role_korean": tmpl["name"],
                "badge_label": tmpl["capabilities"][0] if tmpl.get("capabilities") else "전문가",
                "accent": tmpl["accent"],
                "category": tmpl.get("category", "General"),
                "desk_coord": coord,
                "desk_index": idx,
                "description": tmpl.get("description", ""),
                "role_prompt": tmpl.get("role", ""),
                "goal": tmpl.get("goal", ""),
                "skills": tmpl.get("skills", []),
                "mcp_servers": tmpl.get("mcp_servers", [])
            })

        return team

    def dispatch_tasks(self, query: str) -> Dict[str, Any]:
        """현재 출근한 커스텀 에이전트 팀원들의 role & goal 기반 합동 작업 산출"""
        team = self.get_active_office_team(query)
        agent_logs = {}

        for agent in team:
            agent_logs[agent["id"]] = {
                "name": agent["name"],
                "character": agent["character_name"],
                "role": agent["role_korean"],
                "status": "completed",
                "log": (
                    f"[{agent['character_name']} : {agent['name']} ({agent['category']})]\n"
                    f"• 역할: {agent['role_prompt']}\n"
                    f"• 목표: {agent['goal']}\n"
                    f"• 수행 내역: '{query}'에 대해 {agent['badge_label']} 관점의 전문 실행안 분석 및 도출 완료."
                )
            }

        # 출근한 팀원들의 직무에 맞춘 유기적 종합 보고서 조립
        sections_md = []
        for idx, agent in enumerate(team, 1):
            sections_md.append(
                f"{idx}. [{agent['character_name']} : {agent['name']}] 전문 보고서\n"
                f"- 직무 영역: {agent['category']} · {agent['badge_label']}\n"
                f"- 실행 제안: 사용자의 요청 과제에 대해 '{agent['goal']}' 기준을 충족하는 맞춤형 실행 전략 수립\n"
                f"- 산출 디테일: {agent['description']}"
            )

        final_report = (
            f"🏢 [Munder Difflin AI Office] 커스텀 팀원 합동 작업 보고서\n\n"
            f"**의뢰 과제:** {query}\n"
            f"**출근한 전문 에이전트 팀:** {', '.join([f'{a['character_name']}({a['name']})' for a in team])}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            + "\n\n".join(sections_md)
        )

        coach_tip = (
            f"💡 [Michael's AI 코칭] 현재 팀에 출근한 [{team[0]['name']}], [{team[1]['name']}] 등에게 "
            f"더 날카로운 결과를 얻으시려면 '목표 타깃 고객'과 '선호하는 구체적 예시'를 프롬프트에 덧붙여보세요!"
        )

        return {
            "query": query,
            "active_agent_ids": [a["id"] for a in team],
            "team": team,
            "agent_logs": agent_logs,
            "final_content": final_report,
            "prompt_coach_tip": coach_tip
        }

office_orchestrator = MunderDifflinOrchestrator()
