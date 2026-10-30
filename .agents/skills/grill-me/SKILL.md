---
name: grill-me
description: "요구사항 인터뷰: 결정 트리를 라운드로 물어 모호한 요청을 확정된 명세로 바꾼다 (추천 답 포함) (Gon 스킬 풀: grill-me)"
---
<!-- gon-skill-stub -->
# grill-me — Gon Agent Skill

> **용도**: 요구사항 인터뷰: 결정 트리를 라운드로 물어 모호한 요청을 확정된 명세로 바꾼다 (추천 답 포함)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/mattpocock-skills/skills/productivity/grilling/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch mattpocock-skills`로 받는다.
- 주의: 사용자 결정은 사용자에게 묻고, 환경 사실은 직접 찾는다. 사용자가 확정하기 전에는 실행하지 않는다

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/mattpocock-skills/skills/productivity/grilling/SKILL.md` (grill-me는 이 스킬을 부르는 얇은 진입점)
- 언제: 요청이 모호하거나 클 때, 팀을 꾸리거나 일을 시작하기 전. 인사·짧은 질문·이미 구체적인 요청에는 쓰지 않는다.
- 절차: 결정 트리를 그린다 → 앞선 결정이 필요 없는 질문(frontier)을 한 라운드에 모아 번호를 붙이고 질문마다 추천 답을 단다("네"로 받아들일 수 있게) → 답을 받으면 트리를 다시 계산해 다음 라운드 → frontier가 비면 끝. 환경 사실은 직접 찾고 사용자에게 묻지 않는다. 사용자가 이해가 맞다고 확인하기 전에는 실행하지 않는다.
- 서비스: `core/interview.py`가 같은 규칙으로 최대 두 번(간단 모드는 한 번)·한 번에 질문 4개까지 묻고 확정 명세(brief)를 팀에 넘긴다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/mattpocock-skills/skills/productivity/grilling/SKILL.md`)을 직접 확인한다.
