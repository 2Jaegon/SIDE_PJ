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


def test_auto_mode_uses_agy_only(monkeypatch):
    monkeypatch.setenv("GON_LLM", "auto")
    monkeypatch.setattr(llm, "find_agy", lambda: None)
    monkeypatch.setattr(llm, "_find_exec", lambda name: f"/usr/bin/{name}")
    # agy가 없어도 다른 구독(claude, codex 등)으로 조용히 넘어가지 않는다
    assert llm.find_cli() is None
    assert llm.available() is False

    monkeypatch.setattr(llm, "find_agy", lambda: "/usr/bin/agy")
    assert llm.find_cli() == ("agy", "/usr/bin/agy")


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
    monkeypatch.setattr(llm.subprocess, "run", fake_run)
    assert llm.ask("a\nb & c") == "답변"
    assert seen["kw"]["input"] == b"a\nb & c"
    assert "stdin" not in seen["kw"]
