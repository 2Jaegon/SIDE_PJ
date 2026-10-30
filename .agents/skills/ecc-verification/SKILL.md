---
name: ecc-verification
description: "작업을 끝내기 전 검증 루프(빌드·테스트·리뷰·보안)를 돌린다 (Gon 스킬 풀: ecc-verification)"
---
<!-- gon-skill-stub -->
# ecc-verification — Gon Agent Skill

> **용도**: 작업을 끝내기 전 검증 루프(빌드·테스트·리뷰·보안)를 돌린다
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/verification-loop/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/verification-loop/SKILL.md`
- 언제: 기능·리팩터를 끝냈을 때, PR 전.
- 절차(이 저장소 기준 명령):
  1. 빌드: `cd frontend && npm run build`. 실패하면 멈추고 고친다.
  2. 타입: `cd frontend && npx tsc --noEmit`. 백엔드는 import 확인.
  3. 린트: 이 프로젝트에는 린터가 없다(건너뛰었다고 보고에 적는다).
  4. 테스트: `cd backend && python -m pytest -q`(conftest가 `GON_LLM=stub`을 강제해 실제 AI 호출 없음).
  5. 보안: 바뀐 파일에 비밀값(`sk-`, 비밀번호, 토큰)과 남은 `console.log`가 없는지 grep.
  6. 변경 범위: `git diff --stat`으로 의도한 파일만 바뀌었는지 본다.
- 완료: 아래 형식의 보고. 항목마다 PASS/FAIL과 수치. 돌리지 않은 단계는 "미실행"으로 적는다.
  `Build / Types / Lint / Tests (X/Y) / Security / Diff (N files) / Overall READY|NOT READY`

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/verification-loop/SKILL.md`)을 직접 확인한다.
