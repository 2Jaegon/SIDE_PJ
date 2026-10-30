---
name: impeccable
description: "UI 결함 탐지·마감 QA (결정론적 규칙 검사) (Gon 스킬 풀: impeccable)"
---
<!-- gon-skill-stub -->
# impeccable — Gon Agent Skill

> **용도**: UI 결함 탐지·마감 QA (결정론적 규칙 검사)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/impeccable/.claude/skills/impeccable/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch impeccable`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/impeccable/.claude/skills/impeccable/SKILL.md`
- 언제: UI 비평·감사·마감(polish), 결함 탐지.
- 절차:
  1. 컨텍스트 로드: `ai/gon/skills/repos/impeccable/.claude/skills/impeccable/scripts/impeccable.cmd context --target <파일>`(Windows). **이 런처는 처음 실행할 때 바이너리를 내려받는다. 실행 전에 사용자에게 묻는다(MEMORY.md).** 거절되거나 실패하면 "Context loading did not run; I'll read the existing project context directly."라고 먼저 말하고 PRODUCT.md·DESIGN.md를 직접 읽는다.
  2. 요청에 맞는 명령의 참조 문서를 연다: `shape`(코드 전 UX 계획), `critique`(휴리스틱 점수), `audit`(a11y·성능·반응형), `polish`(출시 전 마감), `harden`(에러·i18n·엣지), `layout`, `typeset`, `colorize`, `animate`, `clarify`(카피), `bolder`/`quieter`/`distill` 등 → `reference/<명령>.md`.
  3. UI를 고치기 직전에 `reference/craft-floor.md`를 읽는다(작은 수정 포함).
  4. 화면 모드를 정한다: Persuade(랜딩), Operate(앱·대시보드 — Gon), Read(문서).
  5. 실제 렌더링을 출시 크기로 보고, 한 번 볼 때 보인 것을 모아서 고친다.
- 주의: 브리프가 우선이다. 다듬기는 기존 정체성을 지키고, 다시 디자인은 바꾼다. 둘을 섞지 않는다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/impeccable/.claude/skills/impeccable/SKILL.md`)을 직접 확인한다.
