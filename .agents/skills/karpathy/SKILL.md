---
name: karpathy
description: "코드 작성·수정 시 단순함 우선, 요청 범위만 변경 (Gon 스킬 풀: karpathy)"
---
<!-- gon-skill-stub -->
# karpathy — Gon Agent Skill

> **용도**: 코드 작성·수정 시 단순함 우선, 요청 범위만 변경
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch andrej-karpathy-skills`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`
- 언제: 모든 코드 작성·수정·리뷰.
- 절차:
  1. 코딩 전에 가정을 말한다. 해석이 여럿이면 고르지 말고 제시한다. 더 단순한 길이 있으면 말한다. 불분명하면 멈추고 묻는다.
  2. 요청한 것만 최소 코드로 만든다. 한 번 쓰는 코드에 추상화, 요청 없는 옵션, 불가능한 경우의 에러 처리를 넣지 않는다.
  3. 필요한 곳만 고친다. 옆 코드·주석·포맷을 "개선"하지 않고 기존 스타일을 따른다. 내 변경으로 안 쓰게 된 import·변수만 지운다. 기존 죽은 코드는 말만 하고 지우지 않는다.
  4. 작업을 검증 가능한 목표로 바꾼다("버그 수정" → 재현 테스트 작성 후 통과). 여러 단계면 `단계 → 확인 방법` 계획을 짧게 적고 확인될 때까지 반복한다.
- 완료: 바뀐 모든 줄이 요청으로 설명된다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`)을 직접 확인한다.
