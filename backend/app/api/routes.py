import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.core import experts, pipeline

router = APIRouter()

class DispatchRequest(BaseModel):
    query: str
    selected_expert_ids: Optional[List[str]] = None

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
def dispatch_office_stream(req: DispatchRequest):
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
