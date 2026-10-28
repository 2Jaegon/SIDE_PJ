@echo off
echo ========================================================
echo   SkillBridge: 전국민 AI 평준화 플랫폼 통합 실행기
echo ========================================================
echo.

echo [1/2] FastAPI 백엔드 서버 구동 중 (Port 8000)...
start "SkillBridge Backend" cmd /k "set PYTHONPATH=backend&& python backend/app/main.py"

echo [2/2] Vite 프론트엔드 웹 서버 구동 중 (Port 5173)...
start "SkillBridge Frontend" cmd /k "cd frontend&& npm run dev"

echo.
echo 서비스가 백그라운드 터미널에서 구동되었습니다!
echo 브라우저에서 아래 주소로 접속하세요:
echo 👉 http://localhost:5173
echo.
pause

