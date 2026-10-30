---
name: emilkowalski
description: "디테일한 UI 애니메이션·성능·마이크로 인터랙션 (Gon 스킬 풀: emilkowalski)"
---
<!-- gon-skill-stub -->
# emilkowalski — Gon Agent Skill

> **용도**: 디테일한 UI 애니메이션·성능·마이크로 인터랙션
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/emilkowalski-skills/skills/emil-design-eng/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch emilkowalski-skills`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/emilkowalski-skills/skills/emil-design-eng/SKILL.md`
- 언제: UI 디테일·애니메이션·마이크로 인터랙션 리뷰나 구현.
- 절차: 애니메이션 결정 순서 — 1 애니메이션이 필요한가(자주 쓰는 동작은 빼는 쪽) → 2 목적 → 3 이징(진입은 ease-out, ease-in 금지) → 4 속도. transform·opacity만 애니메이트, `scale(0)`에서 시작하지 않는다(0.95 + opacity), 버튼 `:active` 반응, 팝오버는 트리거 기준 origin.
- 리뷰 출력은 반드시 `| Before | After | Why |` 마크다운 표.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/emilkowalski-skills/skills/emil-design-eng/SKILL.md`)을 직접 확인한다.
