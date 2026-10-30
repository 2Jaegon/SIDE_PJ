---
name: harness2
description: "에이전트 하네스 설계 참고 (모델을 둘러싼 시스템) (Gon 스킬 풀: harness2)"
---
<!-- gon-skill-stub -->
# harness2 — Gon Agent Skill

> **용도**: 에이전트 하네스 설계 참고 (모델을 둘러싼 시스템)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/harness2/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch harness2`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/harness2/README.md`
- 언제: 에이전트 하네스(모델을 둘러싼 시스템) 설계를 참고할 때. 읽을거리다.
- 절차: 8개 구성요소(system prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins)를 기준으로 Gon의 구조(GON.md, 레지스트리, 메모리, CLI)를 비교·개선한다. 벤치마크 실행은 Vertex AI 설정이 필요하다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/harness2/README.md`)을 직접 확인한다.
