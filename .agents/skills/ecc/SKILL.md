---
name: ecc
description: "Claude Code 워크플로우·에이전트 모음. 1000+ 스킬이므로 필요한 것만 검색해 읽는다 (Gon 스킬 풀: ecc)"
---
<!-- gon-skill-stub -->
# ecc — Gon Agent Skill

> **용도**: Claude Code 워크플로우·에이전트 모음. 1000+ 스킬이므로 필요한 것만 검색해 읽는다
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/AGENTS.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.
- 주의: 전체를 읽지 말고 grep으로 해당 스킬만 연다

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/AGENTS.md` (! 전체를 읽지 않는다)
- 언제: 개발 작업에서 특정 패턴·체크리스트가 필요할 때.
- 절차: `grep -ril "<주제>" ai/gon/skills/repos/ECC/skills` 등으로 해당 하위 스킬 폴더 하나만 찾아 `SKILL.md`만 연다. 자주 쓰는 것은 이미 별도 id로 등록돼 있다(ecc-react, ecc-fastapi, ecc-a11y, ecc-api-design, ecc-code-review, ecc-security-review, ecc-e2e, ecc-git, ecc-verification, ecc-coding-standards).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/AGENTS.md`)을 직접 확인한다.
