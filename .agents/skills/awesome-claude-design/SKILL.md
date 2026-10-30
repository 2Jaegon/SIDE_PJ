---
name: awesome-claude-design
description: "DESIGN.md 레퍼런스 모음으로 브랜드 톤 참조 (Gon 스킬 풀: awesome-claude-design)"
---
<!-- gon-skill-stub -->
# awesome-claude-design — Gon Agent Skill

> **용도**: DESIGN.md 레퍼런스 모음으로 브랜드 톤 참조
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/awesome-claude-design/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch awesome-claude-design`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/awesome-claude-design/README.md`
- 언제: 브랜드 톤 참고가 필요할 때.
- 절차: 분야별 목록(AI·LLM, 개발 도구, 핀테크 등)에서 원하는 느낌의 브랜드를 고른다 → `https://getdesign.md/<브랜드>/design-md`에서 DESIGN.md를 받는다(다운로드는 사용자 확인) → 토큰·규칙·이유를 읽고 프로젝트 토큰(`user/frontend/tailwind.config.js`)에 맞춰 옮긴다.
- 주의: 저장소에는 목록만 있고 DESIGN.md 본문은 없다. 다른 브랜드를 흉내 내는 화면을 만들지 않는다(톤만 참고).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/awesome-claude-design/README.md`)을 직접 확인한다.
