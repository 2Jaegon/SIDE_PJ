---
name: skill-observer
description: "스킬이 틀렸거나 선택이 어긋난 신호(사용자 교정, 지침 위반, 낡은 지침, 반복되는 작업)를 기록하고 모아, 스킬 지침을 고치거나 새 스킬을 제안할 때 (Gon 스킬 풀: skill-observer)"
---
<!-- gon-skill-stub -->
# skill-observer — Gon Agent Skill

> **용도**: 스킬이 틀렸거나 선택이 어긋난 신호(사용자 교정, 지침 위반, 낡은 지침, 반복되는 작업)를 기록하고 모아, 스킬 지침을 고치거나 새 스킬을 제안할 때
> **지침 파일**: `ai/gon/skills/local/skill-observer/SKILL.md` (저장소 루트 기준)



### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/local/skill-observer/SKILL.md`
- 기록: 스킬 규칙이 어겨졌을 때, 사용자가 스킬대로 한 결과를 고쳐 줬을 때, 스킬 내용이 실제와 다를 때(낡은 지침), 고른 스킬이 맞지 않았을 때, 같은 순서를 반복했을 때(`new:<이름>`). 일반화 테스트 4문항(다른 프로젝트에도? 다른 작업에도? 빠진 규칙을 가리키나? 다시 일어날 근거?)을 통과한 것만 `gon observe --by <이름> <대상> "<무엇이 / 근거 / 필요한 규칙>"`.
- 점검: `gon review` → 본문을 읽고 대상별로 개수를 세어 분류 → 사용자에게 개수와 고칠 방향을 보이고 승인받기 → 로컬 스킬은 SKILL.md 수정, 외부 스킬은 레지스트리 `guard`·`use_for`만 수정, `new:`는 `gon learn` → `gon review --done <대상> "<한 일>"`.
- 같은 규칙이 두 번 어겨지면 문구를 키우지 말고 장치(검증 명령, 체크리스트, 자동 검사)로 바꾼다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`ai/gon/skills/local/skill-observer/SKILL.md`)을 직접 확인한다.
