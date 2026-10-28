"""
LLM 호출. 키 없이 Google AI Pro 구독 안에서 쓸 수 있는 Antigravity CLI(`agy -p`)를 사용한다.

- agy가 없거나 SKILLBRIDGE_LLM=stub 이면 available()이 False이고, 호출하는 쪽은 시험용 결과로 대체한다.
- agy는 빈 임시 폴더에서 실행한다. 사용자 요청이 프로젝트 파일을 건드리지 못하게 하려는 것이다.
- 도구 실행 승인(--dangerously-skip-permissions)은 쓰지 않는다.
"""

import glob
import os
import shutil
import subprocess
import tempfile
from typing import Optional


class LLMError(Exception):
    pass


def find_agy() -> Optional[str]:
    explicit = os.getenv("AGY_PATH")
    if explicit and os.path.exists(explicit):
        return explicit
    found = shutil.which("agy")
    if found:
        return found
    local = os.getenv("LOCALAPPDATA")
    if local:  # winget 설치 위치 (서버를 띄운 셸의 PATH에 없을 수 있다)
        hits = glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "Google.AntigravityCLI_*", "agy.exe"))
        if hits:
            return hits[0]
    return None


def available() -> bool:
    return os.getenv("SKILLBRIDGE_LLM", "auto").lower() != "stub" and find_agy() is not None


def _decode(raw: bytes) -> str:
    # agy는 파이프로 보낼 때 시스템 코드페이지(한국어 Windows는 cp949)로 내보내는 경우가 있다.
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp949", errors="replace")


def ask(prompt: str, timeout: int = 120) -> str:
    agy = find_agy()
    if not agy:
        raise LLMError("agy(Antigravity CLI)를 찾지 못했어요")
    with tempfile.TemporaryDirectory() as empty_dir:
        try:
            r = subprocess.run(
                [agy, "-p", prompt, "--print-timeout", f"{timeout}s", "--effort", "low"],
                capture_output=True,
                stdin=subprocess.DEVNULL,
                cwd=empty_dir,
                timeout=timeout + 15,
            )
        except subprocess.TimeoutExpired:
            raise LLMError("응답 시간이 너무 오래 걸렸어요")
    out = _decode(r.stdout).strip()
    if r.returncode != 0 or not out:
        raise LLMError((_decode(r.stderr).strip() or "빈 응답")[:200])
    return out
