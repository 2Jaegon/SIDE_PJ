#!/usr/bin/env sh
exec "$(command -v python3 || command -v python)" "$(dirname "$0")/Gon/gon.py" "$@"
