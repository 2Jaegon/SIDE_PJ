"""Gon CLI(Gon/gon.py) 테스트: AI 도구 선택, 상시 적용, 스킬 관찰 기록. 실제 홈 폴더와 메모리 파일은 건드리지 않는다."""

import sys
import tempfile
from pathlib import Path

import pytest

GON_DIR = Path(__file__).resolve().parents[2] / "Gon"
if str(GON_DIR) not in sys.path:
    sys.path.insert(0, str(GON_DIR))
import gon  # noqa: E402


@pytest.fixture
def sandbox(monkeypatch):
    """임시 홈·선택 파일·메모리 폴더. 설치된 AI 도구는 없는 것으로 한다."""
    with tempfile.TemporaryDirectory() as tmp:
        home = Path(tmp) / "home"
        home.mkdir()
        monkeypatch.setenv("USERPROFILE", str(home))
        monkeypatch.setenv("HOME", str(home))
        monkeypatch.delenv("GON_TOOLS", raising=False)
        monkeypatch.setattr(gon, "CHOICE", Path(tmp) / "tools.local.json")
        monkeypatch.setattr(gon, "MEMORY", Path(tmp) / "memory")
        monkeypatch.setattr(gon, "find_tool", lambda name: None)

        class NoTty:
            def isatty(self):
                return False

        monkeypatch.setattr(sys, "stdin", NoTty())
        yield home


def test_install_writes_only_chosen_tools(sandbox):
    assert gon.cmd_install(["--tools", "claude,gemini"]) == 0
    assert (sandbox / ".claude/commands/gon.md").exists() and (sandbox / ".claude/commands/Gon.md").exists()
    assert (sandbox / ".gemini/commands/gon.toml").exists()
    assert not (sandbox / ".codex").exists()
    assert gon.load_choice() == ["claude", "gemini"]


def test_install_without_choice_asks_instead_of_guessing(sandbox, capsys):
    assert gon.cmd_install([]) == 2
    err = capsys.readouterr().err
    assert "install --tools" in err and "codex" in err
    assert not any(sandbox.iterdir())  # 아무것도 쓰지 않는다
    assert gon.load_choice() is None


def test_install_rejects_unknown_tool(sandbox, capsys):
    assert gon.cmd_install(["--tools", "claude,vim"]) == 2
    assert "vim" in capsys.readouterr().err
    assert not any(sandbox.iterdir())


def test_install_uses_saved_choice_next_time(sandbox):
    gon.cmd_install(["--tools", "gemini"])
    (sandbox / ".gemini/commands/gon.toml").unlink()
    assert gon.cmd_install([]) == 0  # 다시 묻지 않는다
    assert (sandbox / ".gemini/commands/gon.toml").exists()
    assert not (sandbox / ".claude").exists()


def test_install_interactive_prompt(sandbox, monkeypatch):
    class Tty:
        def isatty(self):
            return True

    monkeypatch.setattr(sys, "stdin", Tty())
    monkeypatch.setattr("builtins.input", lambda prompt="": "codex")
    assert gon.cmd_install([]) == 0
    assert (sandbox / ".codex/prompts/gon.md").exists()
    assert not (sandbox / ".claude").exists()
    assert gon.load_choice() == ["codex"]


def test_always_on_touches_only_chosen_and_keeps_user_text(sandbox):
    claude_md = sandbox / ".claude/CLAUDE.md"
    claude_md.parent.mkdir(parents=True)
    claude_md.write_text("내 규칙\n", encoding="utf-8")
    assert gon.cmd_always(True, ["--tools", "claude"]) == 0
    text = claude_md.read_text(encoding="utf-8")
    assert text.startswith("내 규칙") and gon.BEGIN in text
    assert not (sandbox / ".gemini").exists() and not (sandbox / ".codex").exists()


def test_always_off_removes_block_everywhere_and_deletes_block_only_files(sandbox):
    gon.cmd_always(True, ["--tools", "claude,codex"])
    claude_md = sandbox / ".claude/CLAUDE.md"
    claude_md.write_text("내 규칙\n\n" + claude_md.read_text(encoding="utf-8"), encoding="utf-8")
    assert gon.cmd_always(False, []) == 0  # --tools 없이 끄면 모든 AI에서 걷어낸다
    assert claude_md.read_text(encoding="utf-8").strip() == "내 규칙"
    assert not (sandbox / ".codex/AGENTS.md").exists()  # Gon 블록뿐이던 파일은 삭제


def test_doctor_flags_unchosen_tool_with_gon_block(sandbox, capsys):
    gon.cmd_always(True, ["--tools", "codex"])
    gon.CHOICE.write_text('{"tools": ["claude"]}', encoding="utf-8")
    gon.cmd_doctor()
    out = capsys.readouterr().out
    assert "고르지 않은 codex" in out and "always off --tools codex" in out
