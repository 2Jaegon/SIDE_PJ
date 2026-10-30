import os
import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("gon.database")

Base = declarative_base()

_engine = None
_SessionLocal = None
_db_mode = "unknown"
_db_status_message = ""

def _init_db():
    global _engine, _SessionLocal, _db_mode, _db_status_message

    # resolved_database_url을 사용하여 SUPABASE_DB_PASSWORD 및 특수문자(# 등)가 안전하게 인코딩된 URL 적용
    db_url = settings.resolved_database_url.strip()

    # [YOUR-PASSWORD] 플레이스홀더가 남아있는 경우 안전하게 로컬 SQLite 폴백
    if "[YOUR-PASSWORD]" in db_url or not db_url:
        _db_mode = "sqlite_dev"
        _db_status_message = "Supabase 비밀번호([YOUR-PASSWORD])가 아직 설정되지 않아 로컬 SQLite로 동작 중입니다."
        logger.info(_db_status_message)
        
        # 프로젝트 루트의 backend 폴더에 gon_dev.db 저장
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        sqlite_path = os.path.join(base_dir, "gon_dev.db")
        sqlite_url = f"sqlite:///{sqlite_path}"
        _engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        return

    # 실제 PostgreSQL 연결 시도
    # postgresql:// -> psycopg2 기본 사용
    try:
        pg_engine = create_engine(db_url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _engine = pg_engine
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        _db_mode = "supabase"
        _db_status_message = f"Supabase PostgreSQL ({settings.SUPABASE_PROJECT_REF})에 정상 연결되었습니다."
        logger.info(_db_status_message)
    except Exception as e:
        logger.warning(f"Supabase 연결 실패 ({e}). 로컬 SQLite 폴백을 사용합니다.")
        _db_mode = "sqlite_dev"
        _db_status_message = f"Supabase 연결 실패로 로컬 SQLite 사용 중: {e}"
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        sqlite_path = os.path.join(base_dir, "gon_dev.db")
        sqlite_url = f"sqlite:///{sqlite_path}"
        _engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

def get_engine():
    if _engine is None:
        _init_db()
    return _engine

def get_session_factory():
    if _SessionLocal is None:
        _init_db()
    return _SessionLocal

def get_db() -> Generator[Session, None, None]:
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_status() -> dict:
    if _engine is None:
        _init_db()
    return {
        "mode": _db_mode,
        "is_supabase": _db_mode == "supabase",
        "has_placeholder": "[YOUR-PASSWORD]" in settings.DATABASE_URL,
        "project_ref": settings.SUPABASE_PROJECT_REF,
        "message": _db_status_message,
        "host": "aws-0-ap-northeast-2.pooler.supabase.com"
    }

def init_tables():
    # 모델들이 Base.metadata에 등록되도록 명시적 import
    from app.models.user import User  # noqa: F401
    from app.models.conversation import ConversationRecord  # noqa: F401

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    # 기존 DB 테이블에 컬럼 누락 시 자동 마이그레이션
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'email'"))
            conn.commit()
        except Exception:
            pass
