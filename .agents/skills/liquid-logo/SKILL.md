---
name: liquid-logo
description: "로고의 리퀴드 메탈 효과 (Gon 스킬 풀: liquid-logo)"
---
<!-- gon-skill-stub -->
# liquid-logo — Gon Agent Skill

> **용도**: 로고의 리퀴드 메탈 효과
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/liquid-logo/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch liquid-logo`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/liquid-logo/README.md` (3줄 — 사이트 링크뿐)
- 절차: https://liquid.paper.design 에서 로고를 올려 결과를 받는다. 코드로 넣으려면 `@paper-design/shaders-react`의 `LiquidMetal`(투명 배경 마스크 이미지 필요).
- 주의: 라이선스 PolyForm Shield. Gon은 2026-10-29에 로그인 로고에 적용했다가 원본 로고와 달라 보여 되돌렸다. 로고를 다시 그리지 말고 원본 파일(`user/frontend/src/assets/logo.webp`)을 쓴다.

### 2.5 리서치·브라우저·데이터

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/liquid-logo/README.md`)을 직접 확인한다.
