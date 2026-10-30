---
name: liquid-glass
description: "리퀴드 글래스 UI 효과 (Gon 스킬 풀: liquid-glass)"
---
<!-- gon-skill-stub -->
# liquid-glass — Gon Agent Skill

> **용도**: 리퀴드 글래스 UI 효과
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/liquid-glass-js/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch liquid-glass-js`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/liquid-glass-js/README.md`
- 언제: 순수 HTML 페이지의 WebGL 유리 효과. React 프로젝트에는 맞지 않는다(Gon 프론트는 CSS `.glass` 클래스로 대신했다).
- 절차: README의 Basic Usage대로 `glass.css`, html2canvas, `container.js`, `button.js`를 넣고 Container/Button 클래스로 요소를 만든다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/liquid-glass-js/README.md`)을 직접 확인한다.
