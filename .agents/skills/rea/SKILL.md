---
name: rea
description: "합법적 분석: 보안 연구, 상호운용, 본인 소유 소프트웨어 디버깅 (Gon 스킬 풀: rea)"
---
<!-- gon-skill-stub -->
# rea — Gon Agent Skill

> **용도**: 합법적 분석: 보안 연구, 상호운용, 본인 소유 소프트웨어 디버깅
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/rea/.agents/skills/reverse-engineer-anything/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch rea`로 받는다.
- 주의: DISCLAIMER 준수. 상용 소프트웨어 복제·보호 조치 우회 금지 (Munder Difflin 복제 요청은 거절됨)

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/rea/.agents/skills/reverse-engineer-anything/SKILL.md` (! 합법적 분석만)
- 절차: 대상 유형으로 첫 도구를 고른다(Electron/JS는 `analyze_javascript_application`, 바이너리·패키지는 `open_binary`) → 요약부터(`detail: "summary"`) 보고 필요한 부분만 펼친다 → 근거와 함께 쉬운 말로 설명 → 열었던 세션은 `close_binary`로 닫는다. 일반 소스 저장소의 구조 분석에는 쓰지 않는다(graphify).
- 금지: 상용 소프트웨어 복제, 보호 조치 우회(Munder Difflin 복제 요청은 거절됨).

### 2.7 도구·메타

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/rea/.agents/skills/reverse-engineer-anything/SKILL.md`)을 직접 확인한다.
