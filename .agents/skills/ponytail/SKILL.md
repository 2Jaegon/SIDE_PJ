---
name: ponytail
description: "코드 감사·리뷰·기술부채 점검 (audit/review/debt) (Gon 스킬 풀: ponytail)"
---
<!-- gon-skill-stub -->
# ponytail — Gon Agent Skill

> **용도**: 코드 감사·리뷰·기술부채 점검 (audit/review/debt)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ponytail/skills/ponytail/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ponytail`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ponytail/skills/ponytail/SKILL.md`
- 언제: 코드 감사·리뷰·기술부채 점검, "가장 단순하게", 과잉 설계가 의심될 때.
- 절차:
  1. 과제와 닿는 코드를 읽고, 변경이 닿아야 할 곳(호출부, 테스트, 픽스처, 설정, export)과 깨질 수 있는 것(데이터 손실·노출, 호출부)을 나열한다. 이것이 범위다.
  2. 처음으로 완전히 동작하는 선택지를 고른다: 필요 없으면 안 만든다 → 코드베이스에 이미 있으면 그걸 쓴다 → 표준 라이브러리 → 설치된 의존성(몇 줄 때문에 새 의존성 금지) → 한 줄 → 최소 코드.
  3. 버그 수정은 고치기 전에 그 함수의 호출부를 전부 grep하고 공유 코드에서 근본 원인을 한 번 고친다.
  4. 분기·루프·파서·돈·보안 같은 새 로직은 작은 테스트나 assert 자가검사를 하나 남긴다. 알려진 한계가 있는 지름길은 `shortcut: <한계>, <업그레이드 시점>` 주석.
  5. 답 끝에 한두 줄: 건너뛴 것·확인 못 한 것, 사용자가 알아야 할 위험.
- 줄이면 안 되는 것: 신뢰 경계의 검증, 데이터 손실을 막는 에러 처리, 보안, 접근성, 사용자가 요청한 것.
- 레벨: lite(요청대로 만들고 더 작은 안을 한 줄 제시), full(기본), ultra(필요가 정당화하지 못하는 요청 부분에 먼저 반론).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ponytail/skills/ponytail/SKILL.md`)을 직접 확인한다.
