---
name: agency-agents
description: "직무별 전문가 페르소나 약 325개(마케팅·디자인·제품·영업·재무·보안·프로젝트관리 등). 사람 직무 한 명을 맡겨야 하는 일(릴스 기획, 기획전 문구, 영업 제안 등)에서 맞는 직무 파일을 골라 그 역할로 작업 (Gon 스킬 풀: agency-agents)"
---
<!-- gon-skill-stub -->
# agency-agents — Gon Agent Skill

> **용도**: 직무별 전문가 페르소나 약 325개(마케팅·디자인·제품·영업·재무·보안·프로젝트관리 등). 사람 직무 한 명을 맡겨야 하는 일(릴스 기획, 기획전 문구, 영업 제안 등)에서 맞는 직무 파일을 골라 그 역할로 작업
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/agency-agents/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch agency-agents`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.
- 주의: 약 325개 파일 — 폴더(marketing, design, product, sales …)를 grep해 직무 파일 1~2개만 연다. 영어 원문이라 산출물은 한국어로 쓴다

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/agency-agents/README.md` (! 약 325개 — 폴더를 grep해 직무 파일 1~2개만 연다)
- 언제: 사람 직무 한 명을 맡겨야 하는 일(릴스 기획, 기획전 문구, 영업 제안 등).
- 절차: 분야 폴더(marketing, design, product, sales, finance, security, project-management, paid-media, strategy, support, testing 등)에서 `grep -ril "<직무 키워드>" ai/gon/skills/repos/agency-agents/<폴더>` → 직무 파일의 정체성·미션·워크플로·산출물·성공 지표를 읽는다 → 그 역할로 작업한다.
- 주의: 원문이 영어여도 산출물은 한국어로 쓴다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/agency-agents/README.md`)을 직접 확인한다.
