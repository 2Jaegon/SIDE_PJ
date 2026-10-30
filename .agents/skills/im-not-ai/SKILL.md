---
name: im-not-ai
description: "AI가 쓴 한글 문장을 사실·수치 그대로 두고 자연스럽게 윤문 (Gon 스킬 풀: im-not-ai)"
---
<!-- gon-skill-stub -->
# im-not-ai — Gon Agent Skill

> **용도**: AI가 쓴 한글 문장을 사실·수치 그대로 두고 자연스럽게 윤문
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/im-not-ai/skills/humanize-korean/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch im-not-ai`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/im-not-ai/skills/humanize-korean/SKILL.md` (346줄 — Phase 순서를 따른다)
- 언제: AI가 쓴 한국어 글을 사실·수치 그대로 두고 자연스럽게 윤문.
- 절차:
  1. Phase 0: 경로 결정. 사용자가 "정밀하게/--strict"면 heavy, "가볍게"면 light, 아니면 Phase 1 입력 shim이 계산한 `route_hint`(light|standard|heavy), 없으면 standard. 글 길이로 경로를 바꾸지 않는다.
  2. Phase 1: 입력 저장과 정량 사전 점수.
  3. 경로 실행: light(1회), standard(2회), heavy(진단 → 겨냥 윤문 → 구조 게이트 → finalize).
  4. 구조 게이트(결정적 검증)와 finalize.
  5. 결과 4가지: 한 줄 상태(경로/변경률/등급/자체검증 N/6), 윤문본, 요약 표, 등급 B 이하면 heavy 재실행 안내.
- 주의: 내용은 한 글자도 바꾸지 않는다. 스크립트 경로 규칙(`${SKILL_ROOT}`)은 지침 파일이 있는 폴더.

### 2.6 검증·보안·분석

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/im-not-ai/skills/humanize-korean/SKILL.md`)을 직접 확인한다.
