---
name: k-skill
description: "한국 서비스·공공데이터 조회(법원, 쿠팡, 통계 등)와 한국 실무 양식 (Gon 스킬 풀: k-skill)"
---
<!-- gon-skill-stub -->
# k-skill — Gon Agent Skill

> **용도**: 한국 서비스·공공데이터 조회(법원, 쿠팡, 통계 등)와 한국 실무 양식
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/k-skill/AGENTS.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch k-skill`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.
- 주의: 132개 하위 스킬 — 요청에 해당하는 폴더 하나만 연다

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/k-skill/AGENTS.md` (! 132개 하위 스킬 — 요청에 맞는 폴더 하나만 연다)
- 언제: 한국 서비스·공공데이터 조회(법령, 판례, 부동산, 날씨, 교통, 쇼핑, 주식, DART 공시 등)와 한국 실무 양식(HWP 등).
- 절차:
  1. `ls ai/gon/skills/repos/k-skill`에서 맞는 폴더를 찾는다(예: `korean-law-search`, `k-dart`, `korea-weather`, `real-estate-search`, `hwp`, `korean-spell-check`).
  2. 그 폴더의 `instruction.md`(사이트별 절차)와 `skill.json`을 읽는다. `SKILL.md`는 생성된 안내 파일이다.
  3. 도구 실행 전 `npx -y @nomadamas/k-skill@0 update`로 CLI 버전을 확인하고, 스크립트는 `npx -y @nomadamas/k-skill@0 exec <skill> scripts/<file> -- …`, 참고 문서는 `… read <skill> references/<file>`로 연다.
- 주의: API 키가 필요한 스킬은 키가 없으면 사용자에게 알린다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/k-skill/AGENTS.md`)을 직접 확인한다.
