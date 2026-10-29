#!/usr/bin/env sh
# Gon 설치 (macOS / Linux / WSL). 어느 PC에서든:
#   git clone https://github.com/2Jaegon/SIDE_PJ.git && cd SIDE_PJ && ./install.sh
set -e
GON_HOME="${GON_HOME:-$HOME/.gon}"
HERE="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"

if [ -f "$HERE/Gon/gon.py" ]; then
  GON_HOME="$HERE"
elif [ -d "$GON_HOME/.git" ]; then
  git -C "$GON_HOME" pull --ff-only
else
  git clone https://github.com/2Jaegon/SIDE_PJ.git "$GON_HOME"
fi

PY="$(command -v python3 || command -v python)"
# 쓰는 AI를 고른다. 터미널에서 실행하면 묻고, 미리 정하려면: ./install.sh --tools claude,gemini
"$PY" -I "$GON_HOME/Gon/gon.py" install "$@"
"$PY" -I "$GON_HOME/Gon/gon.py" always on
