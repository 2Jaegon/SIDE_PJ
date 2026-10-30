---
name: playwright-mcp
description: "Playwright 기반 브라우저 MCP (agent-browser의 대안) (Gon 스킬 풀: playwright-mcp)"
---
<!-- gon-skill-stub -->
# playwright-mcp — Gon Agent Skill

> **용도**: Playwright 기반 브라우저 MCP (agent-browser의 대안)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/playwright-mcp/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch playwright-mcp`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/playwright-mcp/README.md`
- 언제: agent-browser 대신 Playwright 브라우저가 필요할 때.
- 절차: 코딩 에이전트에는 MCP보다 Playwright CLI + 스킬이 토큰 효율이 좋다고 README가 권한다. MCP로 쓰려면 클라이언트 설정에 `{"mcpServers":{"playwright":{"command":"npx","args":["@playwright/mcp@latest"]}}}`를 추가한다(설정 변경은 사용자 확인).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/playwright-mcp/README.md`)을 직접 확인한다.
