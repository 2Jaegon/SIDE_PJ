---
name: ecc-api-design
description: "REST API 설계(리소스, 오류 형식, 버전) (Gon 스킬 풀: ecc-api-design)"
---
<!-- gon-skill-stub -->
# ecc-api-design — Gon Agent Skill

> **용도**: REST API 설계(리소스, 오류 형식, 버전)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/api-design/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/api-design/SKILL.md`
- 절차: 리소스는 복수 명사·소문자·kebab-case. 메서드 의미대로 상태코드(생성 201, 검증 실패 400/422, 200 남용 금지). 일관된 오류 응답 형식. 페이지네이션(단순은 offset, 대량은 cursor), 필터·정렬 규칙, 버전 관리, 요청 제한.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/api-design/SKILL.md`)을 직접 확인한다.
