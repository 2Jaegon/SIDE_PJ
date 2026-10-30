---
name: prompts-chat
description: "역할별 프롬프트 검색, 사용자 입력 보강 (Gon 스킬 풀: prompts-chat)"
---
<!-- gon-skill-stub -->
# prompts-chat — Gon Agent Skill

> **용도**: 역할별 프롬프트 검색, 사용자 입력 보강
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/prompts-chat/plugins/claude/prompts.chat/skills/prompt-lookup/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch prompts-chat`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/prompts-chat/plugins/claude/prompts.chat/skills/prompt-lookup/SKILL.md`
- 언제: 역할별 프롬프트 템플릿 검색·개선.
- 절차: prompts.chat MCP의 `search_prompts`(query, limit, type, category) → `get_prompt`(id, 변수 `${var}` 채우기) → `improve_prompt`. MCP가 연결돼 있지 않으면 사용자에게 알리고 직접 프롬프트를 다듬는다. 직접 쓰라고 하기 전에 먼저 검색한다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/prompts-chat/plugins/claude/prompts.chat/skills/prompt-lookup/SKILL.md`)을 직접 확인한다.
