import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_optional_user
from app.models.user import User
from app.models.conversation import ConversationRecord

router = APIRouter(prefix="/history", tags=["history"])

class SaveTurnRequest(BaseModel):
    query: str
    result: Optional[dict] = None
    feed: Optional[list] = None

@router.get("", response_model=List[dict])
def list_history(
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    query = db.query(ConversationRecord)
    if user:
        query = query.filter(ConversationRecord.user_id == user.id)
    else:
        query = query.filter(ConversationRecord.user_id.is_(None))
    
    records = query.order_by(ConversationRecord.created_at.asc()).limit(limit).all()
    return [r.to_dict() for r in records]

@router.post("", status_code=status.HTTP_201_CREATED)
def save_turn(
    req: SaveTurnRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    record = ConversationRecord(
        user_id=user.id if user else None,
        query=req.query,
        result_data=json.dumps(req.result, ensure_ascii=False) if req.result else None,
        feed_data=json.dumps(req.feed, ensure_ascii=False) if req.feed else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"status": "saved", "id": record.id}

@router.delete("")
def clear_history(
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(ConversationRecord)
    if user:
        query = query.filter(ConversationRecord.user_id == user.id)
    else:
        query = query.filter(ConversationRecord.user_id.is_(None))
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "cleared", "count": count}

@router.delete("/{conversation_id}")
def delete_turn(
    conversation_id: str,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(ConversationRecord).filter(ConversationRecord.id == conversation_id)
    if user:
        query = query.filter(ConversationRecord.user_id == user.id)
    record = query.first()
    if not record:
        raise HTTPException(status_code=404, detail="대화 기록을 찾을 수 없습니다.")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "id": conversation_id}

