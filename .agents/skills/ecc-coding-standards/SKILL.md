---
name: ecc-coding-standards
description: "언어 공통 코딩 표준과 가독성 규칙 (Gon 스킬 풀: ecc-coding-standards)"
---
<!-- gon-skill-stub -->
# ecc-coding-standards — Gon Agent Skill

> **용도**: 언어 공통 코딩 표준과 가독성 규칙
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/coding-standards/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/coding-standards/SKILL.md`
- 언제: 모든 코드. 프레임워크별 규칙은 ecc-react, ecc-fastapi 등이 우선한다.
- 절차: 가독성 → KISS → DRY → YAGNI 순으로 본다. 이름은 의도를 드러내게, 불변 갱신(스프레드)을 쓰고, 에러는 삼키지 않으며, 긴 함수·깊은 중첩·매직 넘버를 피한다. 주석은 "왜"만 쓴다.
- 완료: 위 냄새가 새로 생기지 않았다.

### 2.2 개발 코어 (`--dev`)

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/coding-standards/SKILL.md`)을 직접 확인한다.
