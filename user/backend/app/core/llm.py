"""
LLM 호출. 키 없이 구독 안에서 쓸 수 있는 터미널 AI CLI를 사용한다.

- GON_LLM=stub 이거나 사용할 CLI가 없으면 available()이 False이고, 호출하는 쪽은 시험용 결과로 대체한다.
- GON_LLM=auto(기본값)이면 `gon install`에서 사용자가 고른 메인 AI(ai/gon/tools.local.json의 main)를 쓴다.
  고른 적이 없으면 Antigravity `agy`만 찾는다. 사용자가 고르지 않은 구독의 한도를 조용히 쓰지 않기 위해서다.
  GON_LLM=gemini|claude|codex|agy 로 직접 지정하면 그쪽이 우선한다.
- agy 외의 CLI는 Windows에서 `.cmd` 셸 스크립트라서 프롬프트를 인자로 넘기면 줄바꿈 뒤가 잘리고 `&` 같은 문자가 명령으로 실행된다.
  그래서 프롬프트는 stdin으로 넘기고, 인자에는 고정된 ASCII 옵션만 둔다.
- 모든 CLI는 빈 임시 폴더에서 읽기 전용/비대화형으로 실행한다. 사용자 요청이 프로젝트 파일을 건드리지 못하게 하려는 것이다.
- 도구 실행 승인(--dangerously-skip-permissions 등)은 쓰지 않는다. claude는 도구·MCP·사용자 설정까지 끄고,
  스트리밍은 stream-json 출력의 text_delta를 읽는다(일반 출력은 답이 끝날 때 한꺼번에 나온다).
- 첨부 이미지는 그 빈 임시 폴더에 파일로 두고, agy가 승인 없이 쓸 수 있는 view_file로만 보게 한다(셸 명령은 승인이 필요해 자동 거부된다).
  다른 CLI는 이미지를 넘길 방법이 없어서, 이미지가 있었지만 볼 수 없었다고 프롬프트에 적는다.
"""

import codecs
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from typing import Iterator, List, Optional, Tuple


def kill_tree(proc: "subprocess.Popen") -> None:
    """프로세스와 그 자식을 모두 끝낸다. Windows에서 claude.CMD 같은 래퍼만 죽이면 자식(node)이 남아
    파이프가 닫히지 않아 timeout 뒤에도 수 분씩 매달린다."""
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True, timeout=10)
        proc.kill()
    except Exception:
        pass


def _run(cmd: List[str], cwd: str, timeout: int, input: Optional[bytes] = None, stdin: Optional[int] = None) -> "subprocess.CompletedProcess":
    """subprocess.run과 같지만, 시간이 지나면 자식 프로세스까지 끝낸다(kill_tree). TimeoutExpired를 던진다."""
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=cwd,
                            stdin=subprocess.PIPE if input is not None else (stdin if stdin is not None else subprocess.DEVNULL))
    try:
        stdout, stderr = proc.communicate(input=input, timeout=timeout)
    except subprocess.TimeoutExpired:
        kill_tree(proc)
        try:
            proc.communicate(timeout=10)
        except Exception:
            pass
        raise
    return subprocess.CompletedProcess(cmd, proc.returncode, stdout, stderr)


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
    if local:  # 기본/winget 설치 위치 (서버를 띄운 셸의 PATH에 없을 수 있다)
        for pat in (
            os.path.join(local, "agy", "bin", "agy.exe"),
            os.path.join(local, "Microsoft", "WinGet", "Packages", "Google.AntigravityCLI_*", "agy.exe"),
        ):
            hits = glob.glob(pat)
            if hits:
                return hits[0]
    return None


# `gon install`에서 고른 메인 AI. 서비스의 모든 대화는 이 AI로 간다(GON_LLM을 지정하면 그쪽이 우선).
_DEFAULT_CHOICE = Path(__file__).resolve().parents[4] / "ai" / "gon" / "tools.local.json"
CHOICE = _DEFAULT_CHOICE
_QUOTA_STATE = Path(__file__).resolve().parents[4] / "ai" / "gon" / ".quota.local.json"


def main_tool() -> Optional[str]:
    try:
        data = json.loads(CHOICE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    tools = [t for t in data.get("tools") or [] if t in ("claude", "gemini", "codex")]
    main = data.get("main")
    return main if main in tools else (tools[0] if tools else None)


def main_cli() -> Optional[Tuple[str, str]]:
    """메인 AI의 (cli_이름, 실행파일_경로). 한도 소진 여부와 상관없이 원래 메인."""
    mode = os.getenv("GON_LLM", "auto").strip().lower()
    if mode == "stub":
        return None
    kind = mode
    if mode == "auto":
        # 메인 AI가 gemini면 Antigravity(agy)를 먼저 쓴다. 설치 기록이 없으면 예전처럼 agy만 쓴다.
        main = main_tool()
        kind = main if main in ("claude", "codex") else "agy"
        if main == "gemini" and not find_agy():
            kind = "gemini"
    if kind == "agy":
        p = find_agy()
        return ("agy", p) if p else None
    if kind in ("gemini", "claude", "codex"):
        p = _find_exec(kind)
        return (kind, p) if p else None
    return None


# ---------- 메인 한도 소진 → 서브로 전환, 한도가 풀리면 복귀 ----------
# 메인이 사용 한도 오류를 내면 그 리셋 시각(모르면 PROBE_SECONDS 뒤)까지 서브로 보낸다.
# 그 시각이 지나면 다음 요청은 다시 메인으로 간다. 다시 막혀 있으면 또 서브로 넘어간다.
PROBE_SECONDS = 600
QUOTA_RE = re.compile(
    r"usage[_\s-]?limit|rate[_\s-]?limit|quota|limit[_\s-]?reached|hit your\b[^\n]{0,40}\blimit|out of (?:credits|usage|tokens)|resource[_\s-]?exhausted|too many requests|\b429\b",
    re.I,
)
def _in_pytest() -> bool:
    return "pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ


def _load_saved_block() -> float:
    if _in_pytest():
        return 0.0
    try:
        return float(json.loads(_QUOTA_STATE.read_text(encoding="utf-8")).get("blocked_until") or 0.0)
    except (OSError, ValueError, TypeError):
        return 0.0


_blocked_until = _load_saved_block()
_last_probed = 0.0
_lock = threading.Lock()


def is_quota_error(text: str) -> bool:
    return bool(QUOTA_RE.search(text or ""))


def _reset_from(text: str) -> Optional[float]:
    """오류 문구 속 리셋 시각(유닉스 초). claude는 'usage limit reached|1793779200' 또는 'resets 7:10pm' 형태로 준다."""
    m = re.search(r"\b(1[7-9]\d{8})\b", text or "")
    if m:
        return float(m.group(1))
    tm = re.search(r"resets\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)", text or "", re.I)
    if tm:
        import datetime
        hr = int(tm.group(1)) % 12 + (12 if tm.group(3).lower() == "pm" else 0)
        mn = int(tm.group(2) or 0)
        now_dt = datetime.datetime.now()
        target = now_dt.replace(hour=hr, minute=mn, second=0, microsecond=0)
        if target <= now_dt:
            target += datetime.timedelta(days=1)
        return target.timestamp()
    return None


def mark_main_blocked(until: Optional[float] = None) -> None:
    global _blocked_until
    now = time.time()
    with _lock:
        _blocked_until = until if until and until > now else now + PROBE_SECONDS
        if not _in_pytest() and CHOICE == _DEFAULT_CHOICE:
            try:
                _QUOTA_STATE.write_text(json.dumps({"blocked_until": _blocked_until}), encoding="utf-8")
            except OSError:
                pass


def main_blocked_until() -> Optional[float]:
    """메인이 막혀 있으면 복귀 예정 시각, 아니면 None."""
    return _blocked_until if time.time() < _blocked_until else None


def _probe_claude_quota() -> None:
    """서버 시작·첫 화면 조회 시 메인 claude의 한도 소진 여부를 stream-json의 rate_limit_event 줄로 빠르게 확인한다."""
    global _last_probed
    if _in_pytest() or CHOICE != _DEFAULT_CHOICE or main_blocked_until():
        return
    now = time.time()
    if now - _last_probed < PROBE_SECONDS:
        return
    main = main_cli()
    if not main or main[0] != "claude" or not find_sub_cli():
        return
    _last_probed = now
    cmd = [
        main[1], "-p", "--tools", "", "--strict-mcp-config", "--disable-slash-commands",
        "--no-session-persistence", "--setting-sources", "", "--effort", "low",
        "--output-format", "stream-json", "--verbose",
    ]
    try:
        with tempfile.TemporaryDirectory() as empty_dir:
            proc = subprocess.Popen(
                cmd, cwd=empty_dir, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
            )
            try:
                proc.stdin.write(b"hi")
                proc.stdin.close()
                deadline = time.time() + 4.0
                while time.time() < deadline:
                    line = proc.stdout.readline()
                    if not line:
                        break
                    try:
                        o = json.loads(line)
                    except ValueError:
                        continue
                    if o.get("type") == "rate_limit_event":
                        rl = o.get("rate_limit_info") or {}
                        if rl.get("status") == "rejected":
                            reset_ts = rl.get("resetsAt")
                            mark_main_blocked(float(reset_ts) if reset_ts else None)
                        break
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()
    except OSError:
        pass


def find_cli() -> Optional[Tuple[str, str]]:
    """지금 쓸 AI. 평소에는 메인, 메인이 한도에 걸려 있으면 서브(있을 때만)."""
    main = main_cli()
    if main and main_blocked_until():
        sub = find_sub_cli()
        if sub:
            return sub
    return main


def find_sub_cli() -> Optional[Tuple[str, str]]:
    """메인 외에 이미지 생성이나 보조 작업을 맡길 서브 AI. `gon install`에서 서브로 고른 것만 쓴다
    (사용자가 연결하지 않은 구독을 조용히 쓰지 않는다). 설치 기록이 없으면 None."""
    main = main_tool()
    try:
        tools = json.loads(CHOICE.read_text(encoding="utf-8")).get("tools") or []
    except (OSError, ValueError):
        return None
    for name in tools:
        if name == main:
            continue
        if name == "gemini":
            p = find_agy()
            if p:
                return ("agy", p)
        if name in ("gemini", "codex", "claude"):
            p = _find_exec(name)
            if p:
                return (name, p)
    return None


def sub_cli_for(via: Optional[str]) -> Optional[Tuple[str, str]]:
    """업무를 맡길 서브 AI(via: 'gemini' | 'codex'). `gon install`에서 서브로 고른 것이고 메인과 다를 때만 돌려준다.
    GON_LLM을 직접 지정했거나 서브로 연결하지 않았거나 설치돼 있지 않으면 None(그러면 메인이 한다)."""
    if via not in ("gemini", "codex") or os.getenv("GON_LLM", "auto").strip().lower() != "auto":
        return None
    try:
        tools = json.loads(CHOICE.read_text(encoding="utf-8")).get("tools") or []
    except (OSError, ValueError):
        return None
    if via not in tools or via == main_tool():
        return None
    if via == "gemini":
        agy = find_agy()
        if agy:
            return ("agy", agy)
    exe = _find_exec(via)
    return (via, exe) if exe else None


def can_generate_image() -> Tuple[bool, Optional[str]]:
    """이미지 생성을 맡길 수 있는 AI 후보(가능 여부, AI 이름). 메인이 claude면 서브에서 찾는다.
    주의: 헤드리스 agy -p는 시험에서 이미지를 만들지 못했고, codex는 미확인이다. 후보일 뿐 생성 보장이 아니다."""
    main_cli = find_cli()
    if main_cli and main_cli[0] in ("agy", "gemini", "codex"):
        return True, main_cli[0]
    sub = find_sub_cli()
    if sub:
        return True, sub[0]
    return False, None


def available() -> bool:
    return os.getenv("GON_LLM", "auto").lower() != "stub" and find_cli() is not None


LABELS = {"agy": "Gemini · Antigravity", "gemini": "Gemini CLI", "claude": "Claude", "codex": "Codex"}


# 사용자가 고를 수 있는 모델. claude는 CLI가 받는 별칭(항상 최신 버전을 가리킨다), agy는 `agy models` 결과.
# 첫 번째가 기본값이다. gemini·codex는 목록을 받을 방법이 없어 고르지 않고 CLI 기본 모델을 쓴다.
CLAUDE_MODELS = [
    {"id": "sonnet", "label": "Sonnet 5.5", "note": "빠르고 균형 잡힌 기본", "quota_exceeded": False},
    {"id": "opus", "label": "Opus 5.5", "note": "복잡한 분석·긴 글", "quota_exceeded": False},
    {"id": "haiku", "label": "Haiku 5.5", "note": "가장 빠름", "quota_exceeded": False},
    {"id": "fable", "label": "Fable 5.1", "note": "가장 강력함, 느림", "quota_exceeded": False},
]
MODEL_ID = re.compile(r"^[a-z0-9][a-z0-9.\-]{0,63}$")
_agy_models: Optional[List[dict]] = None


def _list_agy_models(exe: str) -> List[dict]:
    """`agy models`의 '아이디<TAB>이름' 줄을 읽는다. 실패하면 빈 목록(모델을 고르지 않고 기본값을 쓴다)."""
    global _agy_models
    if _agy_models is not None:
        return _agy_models
    try:
        r = subprocess.run([exe, "models"], capture_output=True, timeout=30, stdin=subprocess.DEVNULL)
        rows = [ln.split("\t", 1) for ln in _decode(r.stdout).splitlines() if "\t" in ln]
        found = [{"id": i.strip(), "label": n.strip(), "quota_exceeded": False} for i, n in rows if MODEL_ID.match(i.strip())]
    except (OSError, subprocess.TimeoutExpired):
        return []  # 다음에 다시 시도한다
    _agy_models = [{"id": "", "label": "기본 모델", "note": "Antigravity 설정을 따름", "quota_exceeded": False}] + found if found else []
    return _agy_models


def models(cli: Optional[Tuple[str, str]] = None) -> List[dict]:
    cli = cli or (find_cli() if available() else None)
    if not cli:
        return []
    if cli[0] == "claude":
        return [dict(m, quota_exceeded=m.get("quota_exceeded", False)) for m in CLAUDE_MODELS]
    if cli[0] == "agy":
        return [dict(m, quota_exceeded=m.get("quota_exceeded", False)) for m in _list_agy_models(cli[1])]
    return []


def check_model(model: Optional[str]) -> Optional[str]:
    """화면에서 고른 모델을 검증한다. 목록에 없거나 한도 초과된 모델이면 None(=CLI 기본 모델)."""
    if not model:
        return None
    usable = [m["id"] for m in models() if not m.get("quota_exceeded")]
    return model if model in usable and MODEL_ID.match(model) else None


def _format_until(ts: Optional[float]) -> str:
    """유닉스 초 타임스탬프를 사람이 읽기 편한 'HH:MM' 형태(예: '14:20')로 변환."""
    if not ts:
        return ""
    try:
        import datetime
        return datetime.datetime.fromtimestamp(ts).strftime("%H:%M")
    except Exception:
        return ""


def info() -> dict:
    """화면에 보여 줄 연결된 AI.
    images: 첨부 이미지를 볼 수 있는지(agy만 가능. 메인이 못 보면 서브 agy가 이미지가 붙은 요청을 맡는다) — image_label이 그 AI.
    fallback: 메인이 한도에 걸려 서브로 답하는 중이면 {from: 메인 이름, until: 복귀 예정 유닉스 초}.
    models: 지금 답하는 AI에서 고를 수 있는 모델."""
    _probe_claude_quota()
    cli = find_cli() if available() else None
    if not cli:
        return {"kind": None, "label": "시험용(AI 미연결)", "images": False, "models": []}
    curr_models = [dict(m, quota_exceeded=False) for m in models(cli)]
    out = {"kind": cli[0], "label": LABELS.get(cli[0], cli[0]), "images": cli[0] == "agy", "models": curr_models}
    if not out["images"]:
        sub = find_sub_cli()
        if sub and sub[0] == "agy":
            out["images"] = True
            out["image_label"] = LABELS["agy"]
    main, until = main_cli(), main_blocked_until()
    if main and until and cli != main:
        until_str = _format_until(until)
        fb = {"from": LABELS.get(main[0], main[0]), "until": int(until)}
        if until_str:
            fb["until_formatted"] = until_str
        out["fallback"] = fb
        main_model_list = models(main) or (CLAUDE_MODELS if main[0] == "claude" else [])
        note_text = f"한도 초과 ({until_str} 복귀)" if until_str else "한도 초과"
        prefix = "Claude " if main[0] == "claude" else f"{LABELS.get(main[0], main[0])} "
        blocked_models = []
        for m in main_model_list:
            lbl = m.get("label", "")
            prefixed_lbl = lbl if lbl.startswith(prefix.strip()) else f"{prefix}{lbl}"
            blocked_models.append(
                dict(
                    m,
                    label=prefixed_lbl,
                    quota_exceeded=True,
                    note=note_text,
                )
            )
        out["models"] = curr_models + blocked_models
    return out


def _pick(images: Optional[List[Tuple[str, bytes]]] = None) -> Optional[Tuple[str, str]]:
    """이번 호출에 쓸 AI. 이미지가 있는데 지금 AI가 못 보면, 볼 수 있는 서브(agy)로 보낸다."""
    cli = find_cli()
    if cli and images and cli[0] != "agy":
        sub = find_sub_cli()
        if sub and sub[0] == "agy":
            return sub
    return cli


def _is_main(cli: Optional[Tuple[str, str]]) -> bool:
    main = main_cli()
    return bool(main and cli and main[0] == cli[0])


def _decode(raw: bytes) -> str:
    # CLI가 파이프로 보낼 때 시스템 코드페이지(한국어 Windows는 cp949)로 내보내는 경우가 있다.
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp949", errors="replace")


def _extract_effort(model: Optional[str]) -> Optional[str]:
    if not model:
        return None
    m = re.search(r"[-_](low|medium|high)$", model, re.I)
    return m.group(1).lower() if m else None


def _build_cmd(kind: str, exe: str, prompt: str, timeout: int, effort: Optional[str] = None, web: bool = False) -> Tuple[List[str], Optional[bytes]]:
    """(명령, stdin으로 보낼 프롬프트). stdin이 None이면 프롬프트가 인자에 들어 있다(agy는 .exe라 안전)."""
    eff = effort if effort in ("low", "medium", "high", "xhigh", "max") else "low"
    if kind == "agy":
        return [exe, "-p", prompt, "--print-timeout", f"{timeout}s", "--effort", eff, "--disable-slash-commands"], None
    stdin = prompt.encode("utf-8")
    if kind == "gemini":
        return [exe, "-p", "Follow the instructions given on stdin."], stdin
    if kind == "claude":
        # 도구·MCP·스킬·사용자 설정(전역 CLAUDE.md)을 모두 꺼서, 개발용 지침이 서비스 답에 섞이거나 도구가 실행되지 않게 한다
        # web=True는 조사 전문가용: 읽기 전용 웹 도구(검색·페이지 읽기)만 연다. 파일·셸 도구는 계속 막는다
        tools = ["--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch"] if web else ["--tools", ""]
        return [exe, "-p", *tools, "--strict-mcp-config", "--disable-slash-commands",
                "--no-session-persistence", "--setting-sources", "", "--effort", eff], stdin
    if kind == "codex":
        return [exe, "exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-"], stdin
    raise LLMError(f"지원하지 않는 LLM CLI: {kind}")


def _image_note(kind: str, names: List[str]) -> str:
    if kind == "agy":
        return (
            f"\n\n[첨부 이미지] 현재 폴더에 사용자가 첨부한 이미지 파일이 있습니다: {', '.join(names)}. "
            "view_file 도구로 이 파일들만 열어 내용을 확인하고 답에 반영하세요. 전역 규칙(GON.md 등)의 외부 파일은 절대 열지 말고(read_file 금지), 셸 명령과 파일 쓰기는 하지 마세요."
        )
    return "\n\n[첨부 이미지] 사용자가 이미지를 첨부했지만 이 AI로는 볼 수 없습니다. 이미지 내용은 알 수 없다고 밝히고, 글로 된 요청만 근거로 답하세요."


_AGY_WEB_NOTE = "[중요: 웹 검색과 웹 페이지 읽기 도구만 쓰세요. 파일 읽기·쓰기와 셸 명령(read_file, view_file, run_command 등)은 절대 쓰지 말고, 전역 규칙(GON.md 등)의 파일 읽기도 생략하세요.]\n\n"
_AGY_TEXT_ONLY_NOTE = "[중요: 도구(read_file, view_file, run_command 등)를 절대 호출하지 말고 텍스트로만 즉시 답하세요. 전역 규칙(GON.md 등)의 파일 읽기도 생략하세요.]\n\n"


def _prepare(prompt: str, timeout: int, images: Optional[List[Tuple[str, bytes]]], model: Optional[str] = None,
             cli: Optional[Tuple[str, str]] = None, web: bool = False) -> Tuple[str, List[str], Optional[bytes]]:
    """model: 화면에서 고른 모델. 이번에 쓰는 AI의 목록에 있을 때만 붙인다(서브로 넘어가면 그 AI의 기본 모델)."""
    cli = cli or _pick(images)
    if not cli:
        raise LLMError("AI CLI를 찾지 못했어요 (agy, 또는 GON_LLM으로 지정한 gemini·claude·codex)")
    kind, exe = cli
    if images:
        prompt += _image_note(kind, [n for n, _ in images])
    elif kind == "agy":
        prompt = (_AGY_WEB_NOTE if web else _AGY_TEXT_ONLY_NOTE) + prompt
    eff = _extract_effort(model)
    cmd, stdin_bytes = _build_cmd(kind, exe, prompt, timeout, effort=eff, web=web)
    if model and MODEL_ID.match(model) and any(m["id"] == model for m in models(cli)):
        cmd = cmd + ["--model", model]
    return kind, cmd, stdin_bytes


_CLAUDE_STREAM = ["--output-format", "stream-json", "--verbose", "--include-partial-messages"]


def _claude_delta(line: bytes) -> Tuple[str, str]:
    """claude stream-json 한 줄에서 (답 조각, 오류 메시지). 해당 없으면 빈 문자열."""
    try:
        o = json.loads(line)
    except ValueError:
        return "", ""
    if o.get("type") == "result" and o.get("is_error"):
        res = str(o.get("result") or "")
        api_err = str(o.get("api_error") or "")
        return "", f"{res} ({api_err})".strip() if api_err and api_err not in res else res
    if o.get("type") == "assistant" and o.get("error") == "rate_limit":
        return "", "usage_limit_reached"
    rl = o.get("rate_limit_info") or {}
    if o.get("type") == "rate_limit_event" and rl.get("status") == "rejected":
        return "", f"usage limit reached|{rl.get('resetsAt', '')}"  # 한도 소진: 리셋 시각을 함께 넘긴다
    ev = o.get("event") or {}
    d = ev.get("delta") or {}
    if ev.get("type") == "content_block_delta" and d.get("type") == "text_delta":
        return d.get("text") or "", ""
    return "", ""


def stream(prompt: str, timeout: int = 140, images: Optional[List[Tuple[str, bytes]]] = None, model: Optional[str] = None) -> Iterator[str]:
    """ask()와 같지만 CLI가 내보내는 대로 조각을 돌려준다. CLI가 출력을 모아 한 번에 내면 한 조각으로 온다.
    소비하는 쪽이 중간에 멈추면(사용자가 멈춤·연결 끊김) 프로세스를 끝낸다.
    메인이 한도 오류를 내면(아직 아무것도 보내지 않았을 때) 서브로 같은 요청을 다시 한다."""
    cli = _pick(images)
    sent = False
    try:
        for chunk in _stream_once(prompt, timeout, images, model, cli):
            sent = True
            yield chunk
    except LLMError as e:
        nxt = _after_quota(cli, str(e), images) if not sent else None
        if not nxt:
            raise
        yield from _stream_once(prompt, timeout, images, model, nxt)


def _after_quota(cli: Optional[Tuple[str, str]], err: str, images: Optional[List[Tuple[str, bytes]]]) -> Optional[Tuple[str, str]]:
    """메인이 한도 오류를 냈으면 메인을 막고, 대신 쓸 AI를 돌려준다. 해당 없으면 None."""
    if not (_is_main(cli) and is_quota_error(err)):
        return None
    mark_main_blocked(_reset_from(err))
    nxt = _pick(images)
    return nxt if nxt and nxt != cli else None


def _stream_once(prompt: str, timeout: int, images: Optional[List[Tuple[str, bytes]]], model: Optional[str],
                 cli: Optional[Tuple[str, str]]) -> Iterator[str]:
    kind, cmd, stdin_bytes = _prepare(prompt, timeout, images, model, cli)
    jsonl = kind == "claude"  # claude는 일반 출력이 끝에 한꺼번에 나와서, 조각 단위 JSON 출력을 읽는다
    if jsonl:
        cmd = cmd + _CLAUDE_STREAM
    with tempfile.TemporaryDirectory() as empty_dir:
        if images and kind == "agy":
            for name, data in images:
                Path(empty_dir, name).write_bytes(data)
        proc = subprocess.Popen(
            cmd,
            cwd=empty_dir,
            stdin=subprocess.PIPE if stdin_bytes is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        err_chunks: List[bytes] = []
        drain = threading.Thread(target=lambda: err_chunks.append(proc.stderr.read()), daemon=True)
        drain.start()
        watchdog = threading.Timer(timeout + 15, kill_tree, args=(proc,))
        watchdog.start()
        try:
            if stdin_bytes is not None:
                proc.stdin.write(stdin_bytes)
                proc.stdin.close()
            decoder = codecs.getincrementaldecoder("utf-8")()
            held = b""  # utf-8이 아니면(cp949 등) 끝까지 모아서 한 번에 푼다
            started = False
            fail = ""
            while jsonl:
                line = proc.stdout.readline()
                if not line:
                    break
                text, err = _claude_delta(line)
                if err:
                    fail = f"{fail}\n{err}".strip() if fail else err
                if not started:
                    text = text.lstrip()
                    started = bool(text)
                if text:
                    yield text
            while not jsonl:
                raw = proc.stdout.read1(4096)
                if not raw:
                    break
                if held:
                    held += raw
                    continue
                try:
                    text = decoder.decode(raw)
                except UnicodeDecodeError:
                    held = raw
                    continue
                if not started:
                    text = text.lstrip()
                    started = bool(text)
                if text:
                    yield text
            if held:
                text = _decode(held).strip()
                if text:
                    started = True
                    yield text
            proc.wait()
            if not watchdog.is_alive() and proc.returncode != 0:
                raise LLMError("응답 시간이 너무 오래 걸렸어요")
            if not started:
                drain.join(timeout=2)
                raise LLMError((fail or _decode(b"".join(err_chunks)).strip() or "빈 응답")[:200])
        finally:
            watchdog.cancel()
            if proc.poll() is None:
                proc.kill()
                proc.wait()


def ask(prompt: str, timeout: int = 120, images: Optional[List[Tuple[str, bytes]]] = None, model: Optional[str] = None,
        via: Optional[str] = None, web: bool = False) -> str:
    """images: (파일 이름, 내용) 목록. 파일 이름은 호출하는 쪽에서 검증한 안전한 이름이어야 한다.
    web: 조사 전문가용. 읽기 전용 웹 도구(검색·페이지 읽기)를 열어 준다(claude·agy만, codex는 해당 없음).
    via: 이 일을 맡길 서브 AI('gemini'|'codex'). 서브가 연결돼 있고 이미지가 없을 때만 쓰고, 서브가 실패하면 메인이 같은 일을 한다.
    메인이 한도 오류를 내면 서브로 같은 요청을 다시 한다."""
    sub = sub_cli_for(via) if via and not images else None
    if sub:
        try:
            return _ask_once(prompt, timeout, None, None, sub, web)  # 화면에서 고른 모델은 메인 AI의 것이라 서브에는 넘기지 않는다
        except LLMError:
            pass
    cli = _pick(images)
    try:
        return _ask_once(prompt, timeout, images, model, cli, web)
    except LLMError as e:
        nxt = _after_quota(cli, str(e), images)
        if not nxt:
            raise
        return _ask_once(prompt, timeout, images, model, nxt, web)


def _ask_once(prompt: str, timeout: int, images: Optional[List[Tuple[str, bytes]]], model: Optional[str],
              cli: Optional[Tuple[str, str]], web: bool = False) -> str:
    kind, cmd, stdin_bytes = _prepare(prompt, timeout, images, model, cli, web)
    feed = {"input": stdin_bytes} if stdin_bytes is not None else {"stdin": subprocess.DEVNULL}
    with tempfile.TemporaryDirectory() as empty_dir:
        if images and kind == "agy":
            for name, data in images:
                Path(empty_dir, name).write_bytes(data)
        try:
            r = _run(cmd, cwd=empty_dir, timeout=timeout + 15, **feed)
        except subprocess.TimeoutExpired:
            raise LLMError("응답 시간이 너무 오래 걸렸어요")
    out = _decode(r.stdout).strip()
    err = _decode(r.stderr).strip()
    if r.returncode != 0 or not out:
        raise LLMError((err or out or "빈 응답")[:200])  # 한도 안내는 stdout으로 오기도 한다
    if len(out) < 300 and is_quota_error(out) and _is_main(cli):
        raise LLMError(out)  # 정상 종료했지만 답 대신 한도 안내만 온 경우
    return out
