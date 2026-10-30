---
name: scientific
description: "논문·생명과학·통계 등 177개 연구 스킬 (Gon 스킬 풀: scientific)"
---
<!-- gon-skill-stub -->
# scientific — Gon Agent Skill

> **용도**: 논문·생명과학·통계 등 177개 연구 스킬
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/scientific-agent-skills/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch scientific-agent-skills`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.
- 주의: 177개 중 해당 스킬만 연다

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/scientific-agent-skills/README.md` (! 177개 중 해당 스킬만 연다)
- 절차: README의 Skill Categories에서 분야(생물정보·임상·통계 등)를 찾고 → `ai/gon/skills/repos/scientific-agent-skills/skills/<이름>/SKILL.md` 하나만 연다 → 그 스킬의 의존성·검증 범위를 따른다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/scientific-agent-skills/README.md`)을 직접 확인한다.
