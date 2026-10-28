import json
import os
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.core import experts, pipeline
from app.core.orchestrator import orchestrator
from app.core.config import settings

router = APIRouter()

class RouteRequest(BaseModel):
    query: str
    selected_expert_ids: Optional[List[str]] = None

class GenerateRequest(BaseModel):
    query: str
    custom_skills: Optional[List[str]] = None

@router.get("/office/pool")
def office_pool():
    """전문가 풀(스킬 + 프롬프트) 요약: 전체 수, 분야별 수, AI 연결 여부"""
    return pipeline.pool_summary()

@router.get("/office/experts")
def list_office_experts():
    """46명 전체 전문가 카탈로그 반환"""
    pool = experts.load_pool()
    return {
        "experts": [
            {
                "id": e["id"],
                "name": e["name"],
                "kind": e["kind"],
                "cluster": e["cluster"],
                "cluster_ko": experts.CLUSTER_KO.get(e["cluster"], e["cluster"]),
                "accent": e["accent"],
                "use_for": e["use_for"],
                "triggers": e.get("triggers", []),
                "synergy": e.get("synergy", []),
                "guard": e.get("guard", "")
            }
            for e in pool.values()
        ]
    }

@router.post("/office/dispatch-stream")
def dispatch_office_stream(req: RouteRequest):
    """전문가별 작업을 실제로 실행하며, 끝나는 대로 한 줄씩(NDJSON) 흘려보낸다."""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="요청을 입력해주세요.")

    def lines():
        try:
            for event in pipeline.run(req.query, req.selected_expert_ids):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"서버 오류: {e}"}, ensure_ascii=False) + "\n"

    return StreamingResponse(lines(), media_type="application/x-ndjson")

@router.get("/skills")
async def get_skills():
    """등록된 모든 스킬 카탈로그 반환"""
    return {"skills": orchestrator.get_all_skills()}

@router.post("/route")
async def route_query(req: RouteRequest):
    """사용자의 자연어 질문을 분석하여 최적의 스킬 체인과 시스템 지침 도출"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="질문을 입력해주세요.")
    return orchestrator.route(req.query)

@router.post("/generate")
async def generate_response(req: GenerateRequest):
    """스킬이 주입된 상태로 최종 결과물 및 AI 평준화 코칭 데이터 생성"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="질문을 입력해주세요.")
    
    route_info = orchestrator.route(req.query)
    master_prompt = route_info["master_system_prompt"]
    prompt_coach = route_info.get("prompt_coach", {})
    coach_tip = route_info["prompt_coach_tip"]
    active_skills = route_info["active_skills"]

    output_content = ""
    if settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "system_instruction": {"parts": [{"text": master_prompt}]},
                "contents": [{"parts": [{"text": req.query}]}]
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    output_content = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini API 호출 예외: {e}")

    if not output_content:
        output_content = orchestrator.generate_expert_content(req.query, active_skills)

    return {
        "query": req.query,
        "active_skills": active_skills,
        "content": output_content,
        "prompt_coach": prompt_coach,
        "prompt_coach_tip": coach_tip
    }
