---
name: ecc-security-review
description: "입력 검증, 인증, 비밀값 처리 등 보안 점검 (Gon 스킬 풀: ecc-security-review)"
---
<!-- gon-skill-stub -->
# ecc-security-review — Gon Agent Skill

> **용도**: 입력 검증, 인증, 비밀값 처리 등 보안 점검
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/security-review/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/security-review/SKILL.md`
- 언제: 인증, 사용자 입력, 비밀값, API 엔드포인트, 결제·민감 기능.
- 절차: 체크리스트 순서대로 — 비밀값 관리(코드·로그에 없음, `.env`는 gitignore), 입력 검증, SQL 인젝션(파라미터 바인딩), 인증·인가, XSS, CSRF, 요청 제한, 민감 정보 노출, 의존성(`npm audit`, `pip` 감사). 배포 전 체크리스트로 마무리.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/security-review/SKILL.md`)을 직접 확인한다.
