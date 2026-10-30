---
name: anthropic-skills
description: "docx/pdf/pptx/xlsx 문서 제작, claude-api, 캔버스 디자인 등 공식 스킬 (Gon 스킬 풀: anthropic-skills)"
---
<!-- gon-skill-stub -->
# anthropic-skills — Gon Agent Skill

> **용도**: docx/pdf/pptx/xlsx 문서 제작, claude-api, 캔버스 디자인 등 공식 스킬
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/anthropics-skills/skills` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch anthropics-skills`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 레지스트리 경로(`ai/gon/skills/repos/anthropics-skills/skills`)가 이 PC에 없다(2026-10-29). docx·pdf·pptx·xlsx 제작이 필요하면 `gon fetch anthropic-skills` 후 해당 하위 폴더의 SKILL.md 하나만 연다.

### 외부 항목 (스킬 아님)
- `designmd-extension`: 웹사이트 스타일을 DESIGN.md로 추출하는 크롬 확장. 사용자가 직접 쓴다.
- `pixel-office`: 에이전트 상태 시각화 가이드 글. 읽을거리.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/anthropics-skills/skills`)을 직접 확인한다.
