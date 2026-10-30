"""Gon CLI(ai/gon/gon.py) 테스트: AI 도구 선택, 상시 적용, 스킬 관찰 기록. 실제 홈 폴더와 메모리 파일은 건드리지 않는다."""

import sys
import tempfile
from pathlib import Path

import pytest

GON_DIR = Path(__file__).resolve().parents[3] / "ai" / "gon"
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
        monkeypatch.setattr(gon, "REPOS", Path(tmp) / "repos")  # 실제 저장소를 받거나 지우지 않는다
        monkeypatch.setattr(gon, "fetch", lambda names: [])
        monkeypatch.setattr(gon, "CLAUDE_SKILLS", Path(tmp) / "claude-skills")  # 이 저장소의 .claude/skills를 건드리지 않는다

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


# ---------- 스킬 관찰 ----------

def test_observe_records_and_counts_open_observations(sandbox, capsys):
    assert gon.cmd_observe(["--by", "claude", "k-skill", "지원사업 양식을", "못 찾았다"]) == 0
    assert "열린 관찰 1개" in capsys.readouterr().out
    line = (gon.MEMORY / "observations.md").read_text(encoding="utf-8").splitlines()[0]
    assert "[claude] [k-skill] [관찰] 지원사업 양식을 못 찾았다" in line


def test_observe_rejects_unknown_target_and_empty_text(sandbox, capsys):
    assert gon.cmd_observe(["--by", "claude", "no-such-skill", "x"]) == 1
    assert "없는 대상" in capsys.readouterr().err
    assert gon.cmd_observe(["k-skill"]) == 2
    assert gon.cmd_observe(["k-skill", "   "]) == 2
    assert not (gon.MEMORY / "observations.md").exists()


def test_observe_accepts_new_skill_proposal(sandbox):
    assert gon.cmd_observe(["--by", "gemini", "new:release-notes", "릴리스 노트를 같은 순서로 세 번 썼다"]) == 0
    assert "new:release-notes" in gon.open_observations()
    assert gon.cmd_observe(["new:", "x"]) == 1  # 이름 없는 제안은 거절


def test_observe_collapses_newlines_into_one_record(sandbox):
    gon.cmd_observe(["--by", "claude", "k-skill", "첫 줄\n둘째 줄 [대괄호] 포함"])
    rows = gon.read_observations()
    assert len(rows) == 1 and rows[0]["text"] == "첫 줄 둘째 줄 [대괄호] 포함"


def test_second_observation_prompts_review(sandbox, capsys):
    gon.cmd_observe(["--by", "claude", "k-skill", "첫 번째"])
    capsys.readouterr()
    gon.cmd_observe(["--by", "gemini", "k-skill", "두 번째"])
    out = capsys.readouterr().out
    assert "열린 관찰 2개" in out and "review" in out and "구조적 장치" in out


def test_review_lists_ready_targets_first_and_done_closes_them(sandbox, capsys):
    gon.cmd_observe(["--by", "claude", "taste", "하나"])
    gon.cmd_observe(["--by", "claude", "k-skill", "가"])
    gon.cmd_observe(["--by", "gemini", "k-skill", "나"])
    capsys.readouterr()
    assert gon.cmd_review([]) == 0
    out = capsys.readouterr().out
    assert out.index("고칠 후보") < out.index("### k-skill") < out.index("더 지켜볼 것") < out.index("### taste")

    assert gon.cmd_review(["--done", "--by", "claude", "k-skill", "use_for를 고쳤다"]) == 0
    assert "k-skill" not in gon.open_observations()
    assert "taste" in gon.open_observations()  # 다른 대상은 그대로
    assert gon.cmd_review(["--done", "k-skill", "again"]) == 1  # 이미 닫힌 대상


def test_observation_after_done_starts_a_new_count(sandbox, capsys):
    gon.cmd_observe(["--by", "claude", "k-skill", "가"])
    gon.cmd_observe(["--by", "claude", "k-skill", "나"])
    gon.cmd_review(["--done", "k-skill", "고침"])
    capsys.readouterr()
    gon.cmd_observe(["--by", "claude", "k-skill", "다"])
    assert "열린 관찰 1개" in capsys.readouterr().out


def test_recent_shows_open_observations(sandbox, capsys):
    gon.cmd_observe(["--by", "claude", "k-skill", "가"])
    capsys.readouterr()
    gon.cmd_recent(1)
    assert "열린 스킬 관찰" in capsys.readouterr().out


def test_install_fetches_every_missing_skill_repo(sandbox, monkeypatch):
    got = []
    monkeypatch.setattr(gon, "fetch", lambda names: got.extend(names) or [])
    gon.cmd_install(["--tools", "claude"])
    assert set(got) == set(gon.json.loads(gon.MANIFEST.read_text(encoding="utf-8")))


def test_empty_repo_folder_counts_as_missing(sandbox):
    first = next(iter(gon.json.loads(gon.MANIFEST.read_text(encoding="utf-8"))))
    (gon.REPOS / first).mkdir(parents=True)  # 받다 만 빈 폴더
    assert first in gon.missing_repos()
    (gon.REPOS / first / "x").write_text("x")
    assert first not in gon.missing_repos()


def test_recent_and_doctor_report_missing_repos(sandbox, capsys):
    gon.cmd_recent()
    assert "스킬 저장소 미설치" in capsys.readouterr().out
    gon.cmd_doctor()
    assert "미설치:" in capsys.readouterr().out


def test_pick_dev_attaches_dev_core_and_project_skills(sandbox, capsys):
    registry = gon.load()
    expected = {s["id"] for s in registry.values() if s.get("core") in ("dev", "project")}
    assert expected and gon.cmd_pick(["--dev"]) == 0
    out = capsys.readouterr().out
    for sid in expected:
        assert f"{sid} |" in out
    assert "[핵심-항상]" in out  # 항상 적용 핵심은 그대로 붙는다


def test_skills_sync_registers_stubs_and_keeps_real_skills(sandbox):
    real = gon.CLAUDE_SKILLS / "agent-browser"
    real.mkdir(parents=True)
    (real / "SKILL.md").write_text("---\nname: agent-browser\n---\nreal", encoding="utf-8")
    old = gon.CLAUDE_SKILLS / "gone"
    old.mkdir()
    (old / "SKILL.md").write_text(gon.STUB_MARK, encoding="utf-8")

    written, skipped = gon.sync_skills()
    expected = {sid for sid, s in gon.load().items() if s["status"] != "external"}
    assert set(written) | set(skipped) == expected and "agent-browser" in skipped
    assert (real / "SKILL.md").read_text(encoding="utf-8").endswith("real")  # 진짜 스킬은 그대로
    assert not old.exists()  # 레지스트리에 없는 옛 안내 파일은 정리
    text = (gon.CLAUDE_SKILLS / "ecc-fastapi" / "SKILL.md").read_text(encoding="utf-8")
    assert text.startswith("---\nname: ecc-fastapi\n") and "fastapi-patterns/SKILL.md" in text
