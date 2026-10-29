"""
LLM 호출. 키 없이 구독 안에서 쓸 수 있는 터미널 AI CLI를 사용한다.

- GON_LLM=stub 이거나 사용할 CLI가 없으면 available()이 False이고, 호출하는 쪽은 시험용 결과로 대체한다.
- GON_LLM=auto(기본값)이면 Antigravity `agy`만 찾는다. 다른 구독(Claude, Codex 등)의 한도를 조용히 쓰지 않도록,
  `gemini`·`claude`·`codex`는 GON_LLM=gemini|claude|codex 로 직접 지정했을 때만 쓴다.
- agy 외의 CLI는 Windows에서 `.cmd` 셸 스크립트라서 프롬프트를 인자로 넘기면 줄바꿈 뒤가 잘리고 `&` 같은 문자가 명령으로 실행된다.
  그래서 프롬프트는 stdin으로 넘기고, 인자에는 고정된 ASCII 옵션만 둔다.
- 모든 CLI는 빈 임시 폴더에서 읽기 전용/비대화형으로 실행한다. 사용자 요청이 프로젝트 파일을 건드리지 못하게 하려는 것이다.
- 도구 실행 승인(--dangerously-skip-permissions 등)은 쓰지 않는다.
"""

import glob
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple


class LLMError(Exception):
    pass


def _find_exec(name: str) -> Optional[str]:
    found = shutil.which(name)
    if found:
        return found
    if os.name == "nt":
        appdata = os.getenv("APPDATA")
        if appdata:
            for ext in (".cmd", ".exe"):
                cand = os.path.join(appdata, "npm", f"{name}{ext}")
                if os.path.exists(cand):
                    return cand
    else:
        for d in (Path.home() / ".local" / "bin", Path.home() / ".npm-global" / "bin"):
            cand = d / name
            if cand.exists():
                return str(cand)
    return None


def find_agy() -> Optional[str]:
    explicit = os.getenv("AGY_PATH")
    if explicit and os.path.exists(explicit):
        return explicit
    found = _find_exec("agy")
    if found:
        return found
    local = os.getenv("LOCALAPPDATA")
    if local:  # winget 설치 위치 (서버를 띄운 셸의 PATH에 없을 수 있다)
        hits = glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "Google.AntigravityCLI_*", "agy.exe"))
        if hits:
            return hits[0]
    return None


def find_cli() -> Optional[Tuple[str, str]]:
    """사용 가능한 (cli_이름, 실행파일_경로) 튜플을 반환한다."""
    mode = os.getenv("GON_LLM", "auto").strip().lower()
    if mode == "stub":
        return None
    kind = "agy" if mode == "auto" else mode
    if kind == "agy":
        p = find_agy()
        return ("agy", p) if p else None
    if kind in ("gemini", "claude", "codex"):
        p = _find_exec(kind)
        return (kind, p) if p else None
    return None


def available() -> bool:
    return os.getenv("GON_LLM", "auto").lower() != "stub" and find_cli() is not None


def _decode(raw: bytes) -> str:
    # CLI가 파이프로 보낼 때 시스템 코드페이지(한국어 Windows는 cp949)로 내보내는 경우가 있다.
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp949", errors="replace")


def _build_cmd(kind: str, exe: str, prompt: str, timeout: int) -> Tuple[List[str], Optional[bytes]]:
    """(명령, stdin으로 보낼 프롬프트). stdin이 None이면 프롬프트가 인자에 들어 있다(agy는 .exe라 안전)."""
    if kind == "agy":
        return [exe, "-p", prompt, "--print-timeout", f"{timeout}s", "--effort", "low"], None
    stdin = prompt.encode("utf-8")
    if kind == "gemini":
        return [exe, "-p", "Follow the instructions given on stdin."], stdin
    if kind == "claude":
        return [exe, "-p", "--tools", ""], stdin
    if kind == "codex":
        return [exe, "exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-"], stdin
    raise LLMError(f"지원하지 않는 LLM CLI: {kind}")


def ask(prompt: str, timeout: int = 120) -> str:
    cli = find_cli()
    if not cli:
        raise LLMError("AI CLI를 찾지 못했어요 (agy, 또는 GON_LLM으로 지정한 gemini·claude·codex)")
    kind, exe = cli
    cmd, stdin_bytes = _build_cmd(kind, exe, prompt, timeout)
    feed = {"input": stdin_bytes} if stdin_bytes is not None else {"stdin": subprocess.DEVNULL}
    with tempfile.TemporaryDirectory() as empty_dir:
        try:
            r = subprocess.run(
                cmd,
                capture_output=True,
                cwd=empty_dir,
                timeout=timeout + 15,
                **feed,
            )
        except subprocess.TimeoutExpired:
            raise LLMError("응답 시간이 너무 오래 걸렸어요")
    out = _decode(r.stdout).strip()
    if r.returncode != 0 or not out:
        raise LLMError((_decode(r.stderr).strip() or "빈 응답")[:200])
    return out
