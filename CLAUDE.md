# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@user/docs/ARCHITECTURE.md

공통 규칙은 `AGENTS.md`, 서비스 구조·명령·API는 `user/docs/ARCHITECTURE.md`가 원본이다. 여기에는 Claude Code에만 해당하는 것만 둔다.

- `.claude/`는 `agents/gon.md`와 `commands/Gon.md`만 git으로 추적한다. `.claude/skills/`는 `python -I ai/gon/gon.py skills-sync`가 레지스트리에서 만드는 안내 파일이다(스킬을 추가·삭제했거나 경로가 바뀌면 다시 실행).
- `/gon` 전역 등록과 쓸 AI 선택은 `gon install --tools …`/`gon always on|off`이며 선택은 `ai/gon/tools.local.json`(gitignore)에 저장된다. 이 PC는 메인 claude, 서브 gemini.
- `ai/gon/memory/`의 `MEMORY.md`·`log.md`·`observations.md`는 Claude, Gemini, Codex 공용이다. 직접 덮어쓰지 말고 `gon remember/log/observe`로 추가하고, 끝낼 때 `gon log --by claude "…"`를 남긴다.
