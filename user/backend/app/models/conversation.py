import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from app.core.database import Base

class ConversationRecord(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), index=True, nullable=True)  # nullable for guest/anon
    query = Column(Text, nullable=False)
    result_data = Column(Text, nullable=True)  # JSON-encoded result
    feed_data = Column(Text, nullable=True)    # JSON-encoded activity feed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        result = None
        if self.result_data:
            try:
                result = json.loads(self.result_data)
            except Exception:
                result = {"final_content": self.result_data}
        
        feed = []
        if self.feed_data:
            try:
                feed = json.loads(self.feed_data)
            except Exception:
                feed = []

        return {
            "id": self.id,
            "user_id": self.user_id,
            "query": self.query,
            "result": result,
            "feed": feed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

