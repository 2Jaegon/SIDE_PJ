# Gon 설치 (Windows). 어느 PC에서든:
#   git clone https://github.com/2Jaegon/SIDE_PJ.git; cd SIDE_PJ; .\install.ps1
$ErrorActionPreference = "Stop"
$GonHome = if ($env:GON_HOME) { $env:GON_HOME } else { Join-Path $HOME ".gon" }

if (Test-Path (Join-Path $PSScriptRoot "ai\gon\gon.py")) {
    $GonHome = $PSScriptRoot  # 이미 clone한 폴더에서 실행한 경우
} elseif (Test-Path (Join-Path $GonHome ".git")) {
    git -C $GonHome pull --ff-only
} else {
    git clone https://github.com/2Jaegon/SIDE_PJ.git $GonHome
}

# 쓰는 AI를 고른다. 터미널에서 실행하면 묻고, 미리 정하려면: .\install.ps1 --tools claude,gemini
python -I (Join-Path $GonHome "ai\gon\gon.py") install @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python -I (Join-Path $GonHome "ai\gon\gon.py") always on
