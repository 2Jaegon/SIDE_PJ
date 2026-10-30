---
name: ecc-e2e
description: "E2E 테스트 설계와 실행 (Gon 스킬 풀: ecc-e2e)"
---
<!-- gon-skill-stub -->
# ecc-e2e — Gon Agent Skill

> **용도**: E2E 테스트 설계와 실행
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/e2e-testing/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/e2e-testing/SKILL.md`
- 절차: Playwright 테스트, Page Object Model로 화면 조작을 감싼다. 불안정한 테스트는 격리하고 원인(타이밍, 선택자, 상태 공유)을 고친다. 실패 시 스크린샷·트레이스·비디오를 남기고, 지침의 보고 템플릿으로 결과를 적는다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/e2e-testing/SKILL.md`)을 직접 확인한다.
