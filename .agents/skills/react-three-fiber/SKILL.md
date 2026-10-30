---
name: react-three-fiber
description: "React 3D 씬 (Gon 스킬 풀: react-three-fiber)"
---
<!-- gon-skill-stub -->
# react-three-fiber — Gon Agent Skill

> **용도**: React 3D 씬
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/react-three-fiber/readme.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch react-three-fiber`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/react-three-fiber/readme.md`
- 절차: three.js 객체를 JSX로 선언(`<mesh>`, `<boxGeometry>`), 프레임 갱신은 `useFrame`, 정지 장면은 `frameloop="demand"`와 `invalidate()`. React 18 ↔ r3f 8, React 19 ↔ r3f 9.
- 이 저장소: 3D 사무실 `user/frontend/src/components/office3d/`. 캔버스는 `pointerEvents: 'none'`(채팅 입력 가로채기 버그 방지). 사무실·총괄 카드에 `backdrop-filter`를 주지 않는다(캔버스가 총괄 패널 위로 겹쳐야 한다).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/react-three-fiber/readme.md`)을 직접 확인한다.
