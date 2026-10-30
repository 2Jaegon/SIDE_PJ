import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    ]
    
    # Supabase 프로젝트 기본 정보
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://wdnyhnfooqmqlgtrdshn.supabase.co")
    SUPABASE_PROJECT_REF: str = os.getenv("SUPABASE_PROJECT_REF", "wdnyhnfooqmqlgtrdshn")
    SUPABASE_DB_HOST: str = os.getenv("SUPABASE_DB_HOST", "aws-0-ap-northeast-2.pooler.supabase.com")
    SUPABASE_DB_PORT: int = int(os.getenv("SUPABASE_DB_PORT", "5432"))
    SUPABASE_DB_USER: str = os.getenv("SUPABASE_DB_USER", f"postgres.{os.getenv('SUPABASE_PROJECT_REF', 'wdnyhnfooqmqlgtrdshn')}")
    SUPABASE_DB_NAME: str = os.getenv("SUPABASE_DB_NAME", "postgres")
    
    # 비밀번호에 # 등 특수문자가 있을 경우를 대비한 단독 환경변수 지원
    SUPABASE_DB_PASSWORD: str = os.getenv("SUPABASE_DB_PASSWORD", "").strip()

    DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip()

    @property
    def resolved_database_url(self) -> str:
        """
        DATABASE_URL 또는 SUPABASE_DB_PASSWORD를 바탕으로 특수문자(# 등)가
        안전하게 URL 인코딩된 최종 PostgreSQL 연결 문자열을 생성합니다.
        """
        # 1. SUPABASE_DB_PASSWORD가 직접 주어졌을 때
        if self.SUPABASE_DB_PASSWORD and self.SUPABASE_DB_PASSWORD != "[YOUR-PASSWORD]":
            encoded_pw = urllib.parse.quote_plus(self.SUPABASE_DB_PASSWORD)
            return f"postgresql://{self.SUPABASE_DB_USER}:{encoded_pw}@{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}"
        
        # 2. DATABASE_URL이 설정된 경우
        if self.DATABASE_URL:
            raw_url = self.DATABASE_URL
            # [YOUR-PASSWORD] 플레이스홀더 체크
            if "[YOUR-PASSWORD]" in raw_url:
                return raw_url
            
            # DATABASE_URL 내부의 비밀번호에 # 등 인코딩되지 않은 특수문자가 있는 경우 자동 인코딩
            try:
                # postgresql://user:password@host:port/dbname 구조 파싱
                if "://" in raw_url and "@" in raw_url:
                    prefix, rest = raw_url.split("://", 1)
                    userinfo, hostinfo = rest.split("@", 1)
                    if ":" in userinfo:
                        user, pw = userinfo.split(":", 1)
                        # [YOUR-PASSWORD]가 아닌데 대괄호 [pw]로 감싸서 입력한 경우 대괄호 제거
                        if pw != "[YOUR-PASSWORD]" and pw.startswith("[") and pw.endswith("]"):
                            pw = pw[1:-1]
                        # 만약 이미 % 인코딩이 안 된 특수문자가 있으면 인코딩
                        encoded_pw = urllib.parse.quote_plus(urllib.parse.unquote_plus(pw))
                        return f"{prefix}://{user}:{encoded_pw}@{hostinfo}"
            except Exception:
                pass
            return raw_url

        # 기본값
        return f"postgresql://{self.SUPABASE_DB_USER}:[YOUR-PASSWORD]@{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}"

    JWT_SECRET: str = os.getenv("JWT_SECRET", "gon-dev-secret-key-supabase-auth-2026")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7  # 7 days

    # Google OAuth 설정
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()

settings = Settings()
