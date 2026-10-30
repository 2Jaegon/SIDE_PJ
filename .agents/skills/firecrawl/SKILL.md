---
name: firecrawl
description: "웹 검색·스크랩·크롤을 클린 마크다운으로 (Gon 스킬 풀: firecrawl)"
---
<!-- gon-skill-stub -->
# firecrawl — Gon Agent Skill

> **용도**: 웹 검색·스크랩·크롤을 클린 마크다운으로
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/firecrawl/skills/firecrawl-build-scrape/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch firecrawl`로 받는다.
- 주의: FIRECRAWL_API_KEY 필요. 키 없으면 agent-browser나 WebSearch로 대체

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/firecrawl/skills/firecrawl-build-scrape/SKILL.md`
- 주의: `FIRECRAWL_API_KEY`가 필요하다. 없으면 agent-browser나 웹 검색으로 대체한다.
- 절차: URL이 있으면 `/scrape`로 단일 페이지를 `markdown` 형식, 기사형은 `onlyMainContent`. URL이 없으면 `firecrawl-build-search`, 클릭·입력이 필요하면 `firecrawl-build-interact`(같은 저장소의 형제 폴더).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/firecrawl/skills/firecrawl-build-scrape/SKILL.md`)을 직접 확인한다.
