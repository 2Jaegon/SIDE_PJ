import pytest
from app.core import llm


def test_decode_utf8_korean():
    text = "안녕하세요. 전국민 AI 평준화 Gon입니다."
    raw = text.encode("utf-8")
    assert llm._decode(raw) == text


def test_decode_cp949_korean():
    text = "안녕하세요. 전국민 AI 평준화 Gon입니다."
    raw = text.encode("cp949")
    assert llm._decode(raw) == text


def test_available_is_false_when_stub(monkeypatch):
    monkeypatch.setenv("GON_LLM", "stub")
    assert llm.available() is False

    monkeypatch.setenv("GON_LLM", "STUB")
    assert llm.available() is False


def test_available_respects_stub_even_with_agy_mocked(monkeypatch):
    monkeypatch.setenv("GON_LLM", "stub")
    monkeypatch.setattr(llm, "find_agy", lambda: "fake/path/to/agy")
    assert llm.available() is False


def _choice_file(monkeypatch, data):
    import json, os, tempfile
    from pathlib import Path
    fd, name = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    path = Path(name)
    if data is None:
        path.unlink()  # 메인 AI를 고른 적 없음
    else:
        path.write_text(json.dumps(data), encoding="utf-8")
    monkeypatch.setattr(llm, "CHOICE", path)
    return path


def test_auto_mode_uses_agy_only(monkeypatch):
    monkeypatch.setenv("GON_LLM", "auto")
    _choice_file(monkeypatch, None)
    monkeypatch.setattr(llm, "find_agy", lambda: None)
    monkeypatch.setattr(llm, "_find_exec", lambda name: f"/usr/bin/{name}")
    # agy가 없어도 다른 구독(claude, codex 등)으로 조용히 넘어가지 않는다
    assert llm.find_cli() is None
    assert llm.available() is False

    monkeypatch.setattr(llm, "find_agy", lambda: "/usr/bin/agy")
    assert llm.find_cli() == ("agy", "/usr/bin/agy")


@pytest.mark.parametrize(
    "choice, expected",
    [
        ({"tools": ["claude", "gemini"], "main": "claude"}, "claude"),
        ({"tools": ["gemini", "claude"], "main": "gemini"}, "agy"),
        ({"tools": ["codex"]}, "codex"),  # main이 없으면 첫 번째
        ({"tools": ["claude"], "main": "codex"}, "claude"),  # 목록 밖의 main은 무시
    ],
)
def test_auto_mode_follows_installed_main_ai(monkeypatch, choice, expected):
    f = _choice_file(monkeypatch, choice)
    monkeypatch.setenv("GON_LLM", "auto")
    monkeypatch.setattr(llm, "find_agy", lambda: "/usr/bin/agy")
    monkeypatch.setattr(llm, "_find_exec", lambda name: f"/usr/bin/{name}")
    try:
        assert llm.find_cli()[0] == expected
    finally:
        f.unlink()


def test_sub_ai_is_only_what_user_connected(monkeypatch):
    # 메인이 claude면 서브로 고른 gemini(agy)만 후보. 고르지 않은 codex는 설치돼 있어도 쓰지 않는다
    f = _choice_file(monkeypatch, {"tools": ["claude", "gemini"], "main": "claude"})
    monkeypatch.setenv("GON_LLM", "auto")
    monkeypatch.setattr(llm, "find_agy", lambda: "/usr/bin/agy")
    monkeypatch.setattr(llm, "_find_exec", lambda name: f"/usr/bin/{name}")
    try:
        assert llm.find_sub_cli() == ("agy", "/usr/bin/agy")
        f.write_text('{"tools": ["claude"], "main": "claude"}', encoding="utf-8")
        assert llm.find_sub_cli() is None
    finally:
        f.unlink()


def test_model_is_checked_against_list_and_passed_as_flag(monkeypatch):
    monkeypatch.setenv("GON_LLM", "claude")
    monkeypatch.setattr(llm, "_find_exec", lambda name: "/usr/bin/claude")
    assert llm.check_model("opus") == "opus"
    assert llm.check_model("gpt-9") is None  # 목록에 없으면 기본 모델
    assert llm.check_model(None) is None
    _, cmd, _ = llm._prepare("q", 60, None, "opus")
    assert cmd[-2:] == ["--model", "opus"]
    _, cmd, _ = llm._prepare("q", 60, None, None)
    assert "--model" not in cmd


def test_agy_models_parsed_from_cli(monkeypatch):
    class R:
        stdout = "Fetching available models...\ngemini-x-low\tGemini X (Low)\nbad id\tBad\n".encode()
    monkeypatch.setattr(llm, "_agy_models", None)
    monkeypatch.setattr(llm.subprocess, "run", lambda *a, **k: R())
    got = llm._list_agy_models("agy")
    assert [m["id"] for m in got] == ["", "gemini-x-low"]  # 첫 칸은 기본 모델


def test_explicit_mode_selects_other_cli(monkeypatch):
    monkeypatch.setattr(llm, "_find_exec", lambda name: f"/usr/bin/{name}")
    for kind in ("gemini", "claude", "codex"):
        monkeypatch.setenv("GON_LLM", kind)
        assert llm.find_cli() == (kind, f"/usr/bin/{kind}")
    monkeypatch.setenv("GON_LLM", "unknown-tool")
    assert llm.find_cli() is None


def test_build_cmd_agy_keeps_prompt_in_argv():
    cmd, stdin = llm._build_cmd("agy", "agy.exe", "hi", 60)
    assert "hi" in cmd
    assert stdin is None


@pytest.mark.parametrize("kind", ["gemini", "claude", "codex"])
def test_build_cmd_passes_prompt_via_stdin_not_argv(kind):
    # Windows의 .cmd 셸 스크립트는 인자의 줄바꿈 뒤를 자르고 &, | 같은 문자를 명령으로 실행한다
    prompt = 'line1\nline2 & echo INJECTED | "quote"'
    cmd, stdin = llm._build_cmd(kind, kind, prompt, 60)
    assert stdin == prompt.encode("utf-8")
    assert not any(ch in arg for arg in cmd for ch in ("\n", "&", "|", '"'))
    assert all(arg.isascii() for arg in cmd)


def test_ask_sends_prompt_on_stdin_for_cmd_clis(monkeypatch):
    seen = {}

    class FakeResult:
        returncode = 0
        stdout = "답변".encode("utf-8")
        stderr = b""

    def fake_run(cmd, **kw):
        seen.update(cmd=cmd, kw=kw)
        return FakeResult()

    monkeypatch.setenv("GON_LLM", "claude")
    monkeypatch.setattr(llm, "_find_exec", lambda name: "/usr/bin/claude")
    monkeypatch.setattr(llm, "_run", fake_run)
    assert llm.ask("a\nb & c") == "답변"
    assert seen["kw"]["input"] == b"a\nb & c"
    assert "stdin" not in seen["kw"]


class _Done:
    returncode = 0
    stdout = "ok".encode()
    stderr = b""


def test_ask_puts_images_in_cwd_for_agy(monkeypatch):
    seen = {}

    def fake_run(cmd, **kw):
        import os
        seen["cmd"] = cmd
        seen["files"] = sorted(os.listdir(kw["cwd"]))
        return _Done()

    monkeypatch.setattr(llm, "find_cli", lambda: ("agy", "fake-exe"))
    monkeypatch.setattr(llm, "_run", fake_run)
    assert llm.ask("질문", images=[("attached-1.png", b"x")]) == "ok"
    assert seen["files"] == ["attached-1.png"]
    assert "view_file" in seen["cmd"][2] and "attached-1.png" in seen["cmd"][2]


def test_ask_tells_other_cli_it_cannot_see_images(monkeypatch):
    seen = {}

    def fake_run(cmd, **kw):
        import os
        seen["input"] = kw["input"].decode()
        seen["files"] = os.listdir(kw["cwd"])
        return _Done()

    monkeypatch.setattr(llm, "find_cli", lambda: ("claude", "fake-exe"))
    monkeypatch.setattr(llm, "find_sub_cli", lambda: None)  # 이미지를 볼 서브 AI가 없을 때
    monkeypatch.setattr(llm, "_run", fake_run)
    llm.ask("질문", images=[("attached-1.png", b"x")])
    assert seen["files"] == []
    assert "볼 수 없" in seen["input"]


def test_image_request_goes_to_sub_agy_when_main_cannot_see(monkeypatch):
    # 메인이 claude라 이미지를 못 보면, 서브로 연결한 agy가 이미지가 붙은 요청을 맡는다
    monkeypatch.setattr(llm, "find_cli", lambda: ("claude", "claude-exe"))
    monkeypatch.setattr(llm, "find_sub_cli", lambda: ("agy", "agy-exe"))
    assert llm._pick([("a.png", b"x")]) == ("agy", "agy-exe")
    assert llm._pick(None) == ("claude", "claude-exe")  # 글만 있으면 메인이 그대로


def _quota_setup(monkeypatch):
    monkeypatch.setattr(llm, "_blocked_until", 0.0)
    monkeypatch.setattr(llm, "main_cli", lambda: ("claude", "claude-exe"))
    monkeypatch.setattr(llm, "find_sub_cli", lambda: ("agy", "agy-exe"))
    monkeypatch.setenv("GON_LLM", "auto")


def test_quota_error_switches_to_sub_then_returns_to_main(monkeypatch):
    import time
    _quota_setup(monkeypatch)
    used = []

    def fake_once(prompt, timeout, images, model, cli, web=False):
        used.append(cli[0])
        if cli[0] == "claude":
            raise llm.LLMError("Claude usage limit reached|%d" % (time.time() + 3600))
        return "서브 답"

    monkeypatch.setattr(llm, "_ask_once", fake_once)
    assert llm.ask("q") == "서브 답"
    assert used == ["claude", "agy"]  # 메인이 한도 오류 → 같은 요청을 서브로
    assert llm.main_blocked_until() is not None
    used.clear()
    assert llm.ask("q") == "서브 답"
    assert used == ["agy"]  # 막혀 있는 동안은 메인을 다시 부르지 않는다

    monkeypatch.setattr(llm, "_blocked_until", time.time() - 1)  # 리셋 시각이 지남
    used.clear()
    monkeypatch.setattr(llm, "_ask_once", lambda *a: used.append(a[4][0]) or "메인 답")
    assert llm.ask("q") == "메인 답"
    assert used == ["claude"]  # 바로 메인으로 복귀


def test_non_quota_error_does_not_switch(monkeypatch):
    _quota_setup(monkeypatch)
    monkeypatch.setattr(llm, "_ask_once", lambda *a: (_ for _ in ()).throw(llm.LLMError("빈 응답")))
    with pytest.raises(llm.LLMError):
        llm.ask("q")
    assert llm.main_blocked_until() is None


def test_info_reports_fallback_and_image_ability(monkeypatch):
    import time
    _quota_setup(monkeypatch)
    monkeypatch.setattr(llm, "available", lambda: True)
    monkeypatch.setattr(llm, "_list_agy_models", lambda exe: [])
    assert llm.info()["images"] is True  # 메인은 못 보지만 서브 agy가 대신 본다
    llm.mark_main_blocked(time.time() + 600)
    info = llm.info()
    assert info["kind"] == "agy" and info["fallback"]["from"] == "Claude"


def _fake_cli(monkeypatch, script, kind="codex"):
    import sys
    monkeypatch.setattr(llm, "find_cli", lambda: (kind, sys.executable))
    monkeypatch.setattr(llm, "_build_cmd", lambda kind, exe, prompt, timeout, **kwargs: ([sys.executable, "-c", script], prompt.encode("utf-8")))


def test_stream_yields_chunks_and_reads_stdin(monkeypatch):
    script = (
        "import sys,time\n"
        "p=sys.stdin.buffer.read().decode('utf-8')\n"
        "for part in ['  안녕', '하세요 ', p]:\n"
        "    sys.stdout.buffer.write(part.encode('utf-8')); sys.stdout.flush(); time.sleep(0.05)\n"
    )
    _fake_cli(monkeypatch, script)
    chunks = list(llm.stream("프롬프트", timeout=20))
    assert "".join(chunks) == "안녕하세요 프롬프트"
    assert len(chunks) >= 2  # 한 번에 모아 오지 않는다


def test_stream_falls_back_to_cp949(monkeypatch):
    script = "import sys\nsys.stdin.read()\nsys.stdout.buffer.write('한국어'.encode('cp949'))\n"
    _fake_cli(monkeypatch, script)
    assert "".join(llm.stream("x", timeout=20)) == "한국어"


def test_stream_raises_on_empty_output(monkeypatch):
    script = "import sys\nsys.stdin.read()\nsys.stderr.write('boom')\nsys.exit(1)\n"
    _fake_cli(monkeypatch, script)
    with pytest.raises(llm.LLMError, match="boom"):
        list(llm.stream("x", timeout=20))


def test_stream_reads_claude_json_deltas(monkeypatch):
    # claude는 stream-json 줄에서 text_delta만 뽑는다(생각·상태 줄은 버린다)
    script = (
        "import sys,json\n"
        "sys.stdin.read()\n"
        "assert '--include-partial-messages' in sys.argv\n"
        "def ev(e): print(json.dumps({'type':'stream_event','event':e}), flush=True)\n"
        "print(json.dumps({'type':'system','subtype':'init'}), flush=True)\n"
        "ev({'type':'content_block_delta','delta':{'type':'thinking_delta','thinking':'몰래'}})\n"
        "ev({'type':'content_block_delta','delta':{'type':'text_delta','text':'안녕'}})\n"
        "ev({'type':'content_block_delta','delta':{'type':'text_delta','text':'하세요'}})\n"
    )
    _fake_cli(monkeypatch, script, kind="claude")
    assert list(llm.stream("x", timeout=20)) == ["안녕", "하세요"]


def test_stream_reports_claude_result_error(monkeypatch):
    script = "import sys,json\nsys.stdin.read()\nprint(json.dumps({'type':'result','is_error':True,'result':'한도 초과'}))\n"
    _fake_cli(monkeypatch, script, kind="claude")
    with pytest.raises(llm.LLMError, match="한도 초과"):
        list(llm.stream("x", timeout=20))


def test_quota_re_matches_claude_5_hour_limit_and_stream_preserves_reset(monkeypatch):
    assert llm.is_quota_error("You've hit your 5-hour limit · resets 7:10pm (Asia/Seoul)")
    assert llm.is_quota_error("usage_limit_reached")
    # rate_limit_event 줄 뒤에 result(is_error=True) 줄이 와도 앞의 리셋 시각이 덮어써지지 않는다
    _quota_setup(monkeypatch)
    import sys, time
    reset_ts = int(time.time()) + 3600
    claude_script = (
        "import sys,json\n"
        "sys.stdin.read()\n"
        f"print(json.dumps({{'type':'rate_limit_event','rate_limit_info':{{'status':'rejected','resetsAt':{reset_ts}}}}}))\n"
        "print(json.dumps({'type':'result','is_error':True,'result':\"You've hit your 5-hour limit · resets 7:10pm (Asia/Seoul)\",'api_error':'usage_limit_reached'}))\n"
        "sys.exit(1)\n"
    )
    agy_script = "import sys\nprint('서브 스트리밍 응답')\n"

    def fake_build(kind, exe, prompt, timeout, **kwargs):
        if kind == "claude":
            return [sys.executable, "-c", claude_script], prompt.encode("utf-8")
        return [sys.executable, "-c", agy_script], None

    monkeypatch.setattr(llm, "_build_cmd", fake_build)
    chunks = list(llm.stream("안녕", timeout=20))
    assert "".join(chunks).strip() == "서브 스트리밍 응답"
    assert llm.main_blocked_until() == float(reset_ts)


def test_stream_kills_process_when_consumer_stops(monkeypatch):
    import time
    script = "import sys,time\nsys.stdin.read()\nprint('first', flush=True)\ntime.sleep(30)\n"
    _fake_cli(monkeypatch, script)
    gen = llm.stream("x", timeout=60)
    assert next(gen).strip() == "first"
    t = time.time()
    gen.close()  # 사용자가 멈추면 프로세스를 끝낸다
    assert time.time() - t < 5


def test_models_include_quota_exceeded_flag(monkeypatch):
    monkeypatch.setenv("GON_LLM", "claude")
    monkeypatch.setattr(llm, "_find_exec", lambda name: "/usr/bin/claude")
    claude_models = llm.models()
    assert len(claude_models) > 0
    for m in claude_models:
        assert "quota_exceeded" in m
        assert m["quota_exceeded"] is False


def test_info_includes_blocked_main_models_when_fallback_active(monkeypatch):
    import time
    _quota_setup(monkeypatch)
    monkeypatch.setattr(llm, "available", lambda: True)
    monkeypatch.setattr(llm, "_list_agy_models", lambda exe: [{"id": "gemini-flash", "label": "Gemini Flash"}])
    llm.mark_main_blocked(time.time() + 600)
    info = llm.info()
    assert info["kind"] == "agy"
    assert "fallback" in info
    assert "until_formatted" in info["fallback"]
    models = info["models"]
    
    # 서브 AI 모델 (gemini-flash) 확인
    sub_m = [m for m in models if m["id"] == "gemini-flash"]
    assert len(sub_m) == 1
    assert sub_m[0]["quota_exceeded"] is False
    
    # 한도 초과된 메인 AI 모델 (sonnet 등) 확인
    blocked_m = [m for m in models if m.get("quota_exceeded") is True]
    assert len(blocked_m) == len(llm.CLAUDE_MODELS)
    for m in blocked_m:
        assert m["label"].startswith("Claude ")
        assert "한도 초과" in m["note"] and "복귀" in m["note"]

    # check_model 검증: 서브 모델은 통과, 한도 초과된 메인 모델은 None
    assert llm.check_model("gemini-flash") == "gemini-flash"
    assert llm.check_model("sonnet") is None



def test_run_kills_child_processes_on_timeout():
    # 래퍼(cmd/.CMD)만 죽이면 자식이 파이프를 잡고 있어 timeout 뒤에도 매달린다. 트리 전체를 끝내야 빨리 돌아온다
    import os
    import sys
    import time
    cmd = ["cmd", "/c", sys.executable, "-c", "import time; time.sleep(30)"] if os.name == "nt" else ["sh", "-c", f"{sys.executable} -c 'import time; time.sleep(30)'"]
    import tempfile
    start = time.time()
    with tempfile.TemporaryDirectory() as d, pytest.raises(llm.subprocess.TimeoutExpired):
        llm._run(cmd, cwd=d, timeout=1)
    assert time.time() - start < 15
