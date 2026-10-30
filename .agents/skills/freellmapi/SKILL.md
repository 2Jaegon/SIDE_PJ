---
name: freellmapi
description: "무료 LLM 티어 집계 프록시 (Gon 백엔드 후보) (Gon 스킬 풀: freellmapi)"
---
<!-- gon-skill-stub -->
# freellmapi — Gon Agent Skill

> **용도**: 무료 LLM 티어 집계 프록시 (Gon 백엔드 후보)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/freellmapi/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch freellmapi`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.
- 주의: 제3자 릴리스 바이너리 — 실행 전 출처·코드 확인. 계정·API 공유/재판매 금지

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/freellmapi/README.md` (! 제3자 바이너리 — 실행 전 출처·코드 확인, 계정·API 공유·재판매 금지)
- 언제: 무료 LLM 티어를 하나의 OpenAI 호환 엔드포인트로 묶는 Gon 백엔드 후보를 검토할 때.
- 절차: 설치 스크립트를 파이프로 바로 실행하지 않는다. 스크립트를 먼저 읽고 사용자 승인 후 Docker로 띄운다(http://localhost:3001에서 키 등록).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/freellmapi/README.md`)을 직접 확인한다.
