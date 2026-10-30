---
name: strix
description: "자기 소유 코드·앱의 보안 취약점 점검과 수정 (Gon 스킬 풀: strix)"
---
<!-- gon-skill-stub -->
# strix — Gon Agent Skill

> **용도**: 자기 소유 코드·앱의 보안 취약점 점검과 수정
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/strix/skills/owasp-top-10-testing/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch strix`로 받는다.
- 주의: 본인 소유·승인된 대상만. 외부 서비스 대상 금지

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/strix/skills/owasp-top-10-testing/SKILL.md` (! 본인 소유·승인된 대상만)
- 절차: OWASP Top 10:2025 기준. 소스 + 실행 중 인스턴스 + 권한이 다른 계정 2~3개를 주고 `strix -n -t <repo> -t <staging> --scan-mode deep --instruction "…"`. 결과 `strix_runs/<run>/vulnerabilities/*.md`를 범주별로 묶어 시도한 것 / 증명된 것 / 평가 못 한 것(A09는 항상)을 적는다. PoC는 직접 확인한 뒤 보고한다. 수정 후 재시험.
- 금지: 외부 서비스·제3자 대상.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/strix/skills/owasp-top-10-testing/SKILL.md`)을 직접 확인한다.
