import re
import uuid
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, get_db_status
from app.models.user import User
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None  # Google Identity Services ID 토큰
    email: Optional[str] = None       # 개발 및 직접 연동용
    name: Optional[str] = None
    picture: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: dict
    status: dict

@router.get("/status")
def auth_status():
    """데이터베이스 및 인증 인프라 상태 조회"""
    st = get_db_status()
    st["google_client_id"] = settings.GOOGLE_CLIENT_ID
    st["google_auth_configured"] = bool(settings.GOOGLE_CLIENT_ID)
    return st

@router.post("/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """새로운 사용자 회원가입"""
    email = req.email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="올바른 이메일 주소를 입력해 주세요."
        )
    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호는 최소 6자 이상이어야 합니다."
        )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 가입된 이메일 주소입니다."
        )

    hashed = hash_password(req.password)
    new_user = User(
        email=email,
        hashed_password=hashed,
        name=req.name.strip() if req.name else None,
        provider="email"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return {
        "token": token,
        "user": new_user.to_dict(),
        "status": get_db_status()
    }

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """이메일과 비밀번호로 로그인"""
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_password or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "token": token,
        "user": user.to_dict(),
        "status": get_db_status()
    }

@router.post("/google", response_model=AuthResponse)
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Google 계정으로 로그인 또는 자동 회원가입"""
    google_email = None
    google_name = req.name
    google_picture = req.picture

    # 1. Google ID Token(credential)이 전송된 경우 Google 토큰 검증
    if req.credential:
        try:
            token_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}"
            with httpx.Client(timeout=8.0) as client:
                res = client.get(token_url)
            if res.status_code == 200:
                payload = res.json()
                google_email = payload.get("email")
                google_name = google_name or payload.get("name")
                google_picture = google_picture or payload.get("picture")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="유효하지 않거나 만료된 Google 인증 토큰입니다."
                )
        except httpx.RequestError as e:
            # 네트워크 단절 시 예외 처리
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Google 인증 서버와 통신할 수 없습니다: {e}"
            )
    elif req.email:
        # 2. 로컬 개발/데모 환경 등 직접 이메일 전달 시 검증
        e = req.email.strip().lower()
        if not EMAIL_REGEX.match(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="올바른 Google 이메일 주소를 입력해 주세요."
            )
        google_email = e
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google 인증 정보가 전달되지 않았습니다."
        )

    google_email = google_email.strip().lower()

    # 3. DB 사용자 조회 또는 신규 생성
    user = db.query(User).filter(User.email == google_email).first()
    if not user:
        # 무작위 비밀번호 해시 생성하여 신규 생성
        random_pw = hash_password(str(uuid.uuid4()))
        user = User(
            email=google_email,
            hashed_password=random_pw,
            name=google_name or google_email.split("@")[0],
            avatar_url=google_picture,
            provider="google"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # 기존 사용자 정보 최신화 (이름, 프로필 사진)
        updated = False
        if not user.name and google_name:
            user.name = google_name
            updated = True
        if not user.avatar_url and google_picture:
            user.avatar_url = google_picture
            updated = True
        if user.provider != "google" and not user.provider:
            user.provider = "google"
            updated = True
        if updated:
            db.commit()
            db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "token": token,
        "user": user.to_dict(),
        "status": get_db_status()
    }

@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """현재 로그인된 사용자 정보 반환"""
    return {
        "user": user.to_dict(),
        "status": get_db_status()
    }

@router.post("/logout")
def logout():
    """로그아웃 처리 (클라이언트에서 토큰 삭제)"""
    return {"ok": True, "message": "로그아웃되었습니다."}
