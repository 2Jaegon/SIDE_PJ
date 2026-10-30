---
name: graphify
description: "코드·문서·PDF를 지식 그래프로 매핑해 구조 파악 (Gon 스킬 풀: graphify)"
---
<!-- gon-skill-stub -->
# graphify — Gon Agent Skill

> **용도**: 코드·문서·PDF를 지식 그래프로 매핑해 구조 파악
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/graphify/graphify/skill.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch graphify`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/graphify/graphify/skill.md` (793줄 — "What You Must Do When Invoked" 절의 Step을 순서대로 따른다)
- 언제: 코드베이스 구조·파일 관계 파악. `graphify-out/`이 이미 있으면 질문을 먼저 graphify 질의로 처리한다.
- 절차(요약):
  1. Step 1: graphify가 설치돼 있는지 확인하고, 안 돼 있으면 지침의 설치 절차를 따른다(설치는 사용자에게 알린 뒤).
  2. Step 2: 대상 경로의 파일을 감지한다.
  3. Step 3: 코드는 AST로, 문서는 의미 추출로 엔티티와 관계를 뽑는다. Claude 지침은 이 단계를 서브에이전트로 나누지만, Codex·Gemini는 청크 단위로 순서대로 처리한다.
  4. 그래프를 만들고 클러스터링해 `graphify-out/`에 보고서·HTML을 쓴다.
  5. 이후 질문은 `graphify query "<질문>"`(넓게), `--dfs`(특정 경로 추적)로 답한다. 바뀐 파일만 다시 하려면 `--update`.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/graphify/graphify/skill.md`)을 직접 확인한다.
