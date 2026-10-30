---
name: ecc-react
description: "React 컴포넌트·상태·훅 패턴 (Gon 스킬 풀: ecc-react)"
---
<!-- gon-skill-stub -->
# ecc-react — Gon Agent Skill

> **용도**: React 컴포넌트·상태·훅 패턴
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/react-patterns/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/react-patterns/SKILL.md`
- 절차: 렌더는 props·state의 순수 함수, 부수효과는 이벤트 핸들러·effect로. 상태 위치 결정 트리(로컬 → 끌어올림 → context → 외부 스토어)를 따른다. 상속 대신 조합(children, 슬롯). `React.memo`는 측정된 경우만. 리스트에 안정적 key. 접근성 우선 마크업.
- 이 저장소: React 18 + Vite + Tailwind. React 19 전용 기능(form actions, `useOptimistic`)은 쓰지 않는다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/react-patterns/SKILL.md`)을 직접 확인한다.
