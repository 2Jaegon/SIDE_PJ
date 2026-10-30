---
name: ui-ux-pro-max
description: "컴포넌트·디자인시스템·상태(로딩/빈/에러)·반응형 완성도 (Gon 스킬 풀: ui-ux-pro-max)"
---
<!-- gon-skill-stub -->
# ui-ux-pro-max — Gon Agent Skill

> **용도**: 컴포넌트·디자인시스템·상태(로딩/빈/에러)·반응형 완성도
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ui-ux-pro-max-skill`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/SKILL.md`
- 언제: 컴포넌트·디자인 시스템·상태·반응형·접근성 완성도.
- 절차:
  1. 요구 분석: 제품 유형, 사용자·맥락, 스타일 키워드, 스택(`package.json`으로 확인; 이 저장소는 react + tailwind).
  2. 새 페이지·전체 방향이면 디자인 시스템: `python ai/gon/skills/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<제품> <업종> <키워드>" --design-system -p "Gon"`. 저장하려면 `--persist --output-dir <프로젝트 루트>`(기존 `MASTER.md`가 있으면 먼저 읽고, `--force`는 사용자 승인 없이는 쓰지 않는다).
  3. 세부 문제는 도메인 하나로 검색: `… search.py "<2~5단어>" --domain ux|color|typography|icons|chart|…`.
  4. 구현 지침: `… search.py "<키워드>" --stack react` (또는 html-tailwind, threejs).
  5. 검색이 비면 한 번만 좁혀 다시 검색하고, 그래도 없으면 "DB 일치 없음, 기본 규칙 사용"이라고 밝힌다. 결과를 지어내지 않는다.
- 우선순위: 접근성 → 터치·상호작용 → 성능 → 스타일 → 레이아웃·반응형 → 타이포·색 → 애니메이션 → 폼 → 내비게이션 → 차트.
- 완료: 대비 4.5:1, 키보드 가능, 터치 44px, 로딩·빈·에러 상태, 가로 스크롤 없음.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/SKILL.md`)을 직접 확인한다.
