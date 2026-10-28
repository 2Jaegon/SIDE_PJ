Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SkillBridge: 전국민 AI 평준화 플랫폼 통합 실행기" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] FastAPI 백엔드 서버 구동 중 (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; python backend/app/main.py"

Write-Host "[2/2] Vite 프론트엔드 웹 서버 구동 중 (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "서비스가 시작되었습니다!" -ForegroundColor Green
Write-Host "웹 브라우저를 열고 접속하세요: http://localhost:5173" -ForegroundColor Cyan

