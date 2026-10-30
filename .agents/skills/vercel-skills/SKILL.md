---
name: vercel-skills
description: "npx skills CLI (스킬 설치·관리) (Gon 스킬 풀: vercel-skills)"
---
<!-- gon-skill-stub -->
# vercel-skills — Gon Agent Skill

> **용도**: npx skills CLI (스킬 설치·관리)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/vercel-skills/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch vercel-skills`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/vercel-skills/README.md`
- 절차: Node 22.20+. `npx skills add <source> [--skill <이름>] [-a <agent>] [-g]`, `find`, `list`, `use <source>@<skill>`(설치 없이 한 번), `check`, `update`, `remove`, `init <이름>`.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/vercel-skills/README.md`)을 직접 확인한다.
