---
name: ecc-code-review
description: "변경한 코드의 품질·보안·유지보수성 리뷰 (Gon 스킬 풀: ecc-code-review)"
---
<!-- gon-skill-stub -->
# ecc-code-review — Gon Agent Skill

> **용도**: 변경한 코드의 품질·보안·유지보수성 리뷰
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/agents/code-reviewer.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/agents/code-reviewer.md`
- 언제: 코드를 쓰거나 고친 직후.
- 절차:
  1. `git diff --staged`, `git diff`로 변경을 모은다. 없으면 `git log --oneline -5`.
  2. 바뀐 파일과 기능의 연결을 파악한다.
  3. 변경만 보지 않고 파일 전체와 import, 호출부를 읽는다.
  4. 체크리스트를 CRITICAL(보안) → HIGH(품질, React/백엔드 패턴) → MEDIUM(성능) → LOW 순으로 본다.
  5. 80% 이상 확신하는 문제만 보고한다. HIGH/CRITICAL은 근거를 붙인다. 발견 0건도 정상 결과다.
- 판정: CRITICAL 없음·HIGH 없음 → Approve, HIGH만 → Warning, CRITICAL → Block.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/agents/code-reviewer.md`)을 직접 확인한다.
