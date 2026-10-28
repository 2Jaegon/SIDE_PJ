from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.core.config import settings

app = FastAPI(
    title="Gon: 전국민 AI 평준화 Backend",
    version="1.0.0",
    description="자연어 요청을 분석하여 최적의 AI 스킬을 자동 라우팅 및 주입하는 API 서버"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api")

@app.get("/")
@app.get("/health")
async def root():
    return {
        "service": "Gon API",
        "status": "online",
        "version": "1.0.0",
        "mission": "전국민 AI 평준화"
    }

@app.get("/v1/models")
async def models():
    return {"object": "list", "data": [{"id": "gon-gemini", "object": "model", "owned_by": "gon"}]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

