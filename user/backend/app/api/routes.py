import base64
import binascii
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Tuple

from app.core import experts, interview, pipeline, skillfinder

router = APIRouter()

MAX_IMAGES = 4
MAX_IMAGE_BYTES = 5 * 1024 * 1024
IMAGE_EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}
IMAGE_ONLY_QUERY = "첨부한 이미지를 보고 무엇을 도와야 할지 파악해서 처리해 주세요."


class ImageIn(BaseModel):
    mime: str
    data: str  # base64(접두사 없음)


class HistoryMsg(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field("", max_length=20000)


class InterviewAnswer(BaseModel):
    title: str = Field("", max_length=200)
    answer: str = Field("", max_length=1000)


class InterviewRequest(BaseModel):
    query: str = Field("", max_length=8000)
    history: List[HistoryMsg] = Field(default_factory=list, max_length=40)
    answers: List[InterviewAnswer] = Field(default_factory=list, max_length=12)  # 지금까지 라운드의 질문 제목과 사용자의 답
    round: int = Field(1, ge=1, le=interview.MAX_ROUNDS)
    max_rounds: int = Field(2, ge=2, le=interview.MAX_ROUNDS)  # 2=간단(한 번 묻고 확정), 3=심층(최대 두 번 묻고 확정). 마지막 라운드는 확정만 한다
    model: Optional[str] = Field(default=None, max_length=64, pattern=r"^[a-z0-9.\-]*$")


class SkillInstallRequest(BaseModel):
    ref: str = Field(..., max_length=200, pattern=r"^[A-Za-z0-9][\w.-]*/[A-Za-z0-9][\w.-]*@[A-Za-z0-9][\w.-]*$")  # owner/repo@skill


class DispatchRequest(BaseModel):
    query: str = ""
    selected_expert_ids: Optional[List[str]] = None
    images: List[ImageIn] = []
    history: List[HistoryMsg] = Field(default_factory=list, max_length=40)  # 같은 대화의 이전 질문과 답
    model: Optional[str] = Field(default=None, max_length=64, pattern=r"^[a-z0-9.\-]*$")  # 화면에서 고른 모델(목록에 없으면 기본 모델)
    depth: Literal["fast", "normal", "deep"] = "normal"  # 팀 인원 상한(빠르게 4 / 보통 8 / 깊게 16)과 QA 수정 라운드
    brief: str = Field("", max_length=6000)  # 요구사항 인터뷰로 확정한 명세(없으면 원문만으로 진행)
    answers: List["InterviewAnswer"] = Field(default_factory=list, max_length=12)  # 인터뷰에서 사용자가 고른 답


def _decode_images(images: List[ImageIn]) -> List[Tuple[str, bytes]]:
    """이름은 서버가 정한다(사용자가 준 파일 이름·경로는 쓰지 않는다)."""
    if len(images) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"이미지는 최대 {MAX_IMAGES}장까지 첨부할 수 있어요.")
    out: List[Tuple[str, bytes]] = []
    for i, img in enumerate(images, 1):
        ext = IMAGE_EXT.get(img.mime)
        if not ext:
            raise HTTPException(status_code=400, detail="png, jpg, webp, gif 이미지만 첨부할 수 있어요.")
        try:
            raw = base64.b64decode(img.data, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status_code=400, detail="이미지를 읽지 못했어요.")
        if not raw or len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail="이미지는 한 장에 5MB 이하만 첨부할 수 있어요.")
        out.append((f"attached-{i}.{ext}", raw))
    return out

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
    images = _decode_images(req.images)
    query = req.query.strip()
    if not query and not images:
        raise HTTPException(status_code=400, detail="요청을 입력해주세요.")
    query = query or IMAGE_ONLY_QUERY

    def lines():
        try:
            history = [m.model_dump() for m in req.history]
            answers = [a.model_dump() for a in req.answers]
            for event in pipeline.run(query, req.selected_expert_ids, images, history, req.model, req.depth, req.brief.strip(), answers):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"서버 오류: {e}"}, ensure_ascii=False) + "\n"

    return StreamingResponse(lines(), media_type="application/x-ndjson")


@router.post("/office/interview")
def office_interview(req: InterviewRequest):
    """요구사항 인터뷰 한 라운드(grill-me). 묻을 게 있으면 질문과 추천 답을, 없으면 팀에 넘길 확정 명세(brief)를 돌려준다."""
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="요청을 입력해주세요.")
    history = [m.model_dump() for m in req.history]
    return interview.run(query, [a.model_dump() for a in req.answers], req.round, pipeline._history_block(history), req.model, req.max_rounds)


@router.post("/office/skills/install")
def install_skill(req: SkillInstallRequest):
    """팀 편성 중 찾은 스킬 후보(skill_gap 이벤트)를 사용자가 고르면 받아서 레지스트리에 등록한다."""
    return skillfinder.install(req.ref)
