---
name: context7
description: "라이브러리 최신 공식 문서 조회로 오래된 API 사용 방지 (Gon 스킬 풀: context7)"
---
<!-- gon-skill-stub -->
# context7 — Gon Agent Skill

> **용도**: 라이브러리 최신 공식 문서 조회로 오래된 API 사용 방지
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/context7/skills/context7-cli/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch context7`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/context7/skills/context7-cli/SKILL.md`
- 언제: 라이브러리 API를 쓰거나 버전이 바뀌었을 수 있을 때(학습 데이터가 낡았을 가능성).
- 절차:
  1. `npx ctx7@latest library <이름> "<질문>"`으로 라이브러리 ID를 얻는다(ID는 `/owner/repo`처럼 `/`로 시작).
  2. `npx ctx7@latest docs <ID> "<질문>"`으로 문서를 받는다. 한 번에 찾으려면 `npx ctx7@latest search "<질문>"`.
  3. 받은 문서의 시그니처대로 코드를 쓴다.
- 주의: `docs` 전에 반드시 `library`로 ID를 얻는다. 로그인 없이도 되지만 요청 수 제한이 있다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/context7/skills/context7-cli/SKILL.md`)을 직접 확인한다.
