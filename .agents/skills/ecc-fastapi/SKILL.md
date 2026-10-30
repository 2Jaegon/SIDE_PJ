---
name: ecc-fastapi
description: "FastAPI 백엔드 설계 패턴(라우터, 의존성, 비동기, 검증) (Gon 스킬 풀: ecc-fastapi)"
---
<!-- gon-skill-stub -->
# ecc-fastapi — Gon Agent Skill

> **용도**: FastAPI 백엔드 설계 패턴(라우터, 의존성, 비동기, 검증)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/fastapi-patterns/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/fastapi-patterns/SKILL.md`
- 절차: 라우트는 얇게, 비즈니스 로직은 서비스 계층. Pydantic v2 스키마로 입출력 검증. 의존성 주입으로 DB 세션·인증. async 라우트에서 동기 DB 호출로 이벤트 루프를 막지 않는다. 테스트는 httpx + pytest.
- 이 저장소: 백엔드 테스트는 `user/backend/`에서 `python -m pytest -q`.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/fastapi-patterns/SKILL.md`)을 직접 확인한다.
