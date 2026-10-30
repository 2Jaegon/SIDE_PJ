import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    provider = Column(String(50), default="email")  # "email", "google"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name or self.email.split("@")[0],
            "avatar_url": self.avatar_url,
            "provider": self.provider or "email",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
