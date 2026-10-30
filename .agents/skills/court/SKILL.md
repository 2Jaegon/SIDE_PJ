---
name: court
description: "아이디어·결론을 반론 배심으로 검증 (동조 방지) (Gon 스킬 풀: court)"
---
<!-- gon-skill-stub -->
# court — Gon Agent Skill

> **용도**: 아이디어·결론을 반론 배심으로 검증 (동조 방지)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/court-skill/skills/court/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch court-skill`로 받는다.
- 주의: 비용이 큼 — 중요 결정·최종 산출물에만

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/court-skill/skills/court/SKILL.md` (! 비용이 크다 — 중요 결정·최종 산출물에만)
- 언제: 사용자가 반론·검증을 원하거나 중요한 결정일 때.
- 절차:
  1. 규모: 플래그(`--jury N` 3~12, `--quick`=6명, `--seed`)를 정하고 `python ai/gon/skills/repos/court-skill/skills/court/court.py plan …`으로 규모를 사용자에게 한 줄로 알린다. 사용자가 요청하지 않았으면 먼저 묻는다.
  2. 사건 파일: `.court/case.md`. 첫 줄은 사건 한 문장(사용자 말 그대로), 이어서 사용자가 준 사실만. 내 의견·없는 사실을 넣지 않는다.
  3. `court.py init --case-file .court/case.md [--jury N|--quick]`.
  4. 재판: `court.py next`가 단계(opening → rebuttal → jury → judge)와 명령을 알려 준다. 단계마다 `court.py prompts <phase>`가 brief를 쓰고, 각 brief를 **서로 독립된 실행**이 읽고 따른다. Claude는 서브에이전트로 돌린다. Codex·Gemini는 brief마다 별도 비대화 실행(`codex exec "Read <brief> and follow it exactly."` / `gemini -p …`)으로 돌린다. 이 방식은 2026-10-29 기준 실제로 시험하지 않았다. 한 실행 안에서 brief를 직접 연기하면 독립 배심이 아니므로 하지 않는다.
  5. 끝나면 `court.py render` → `VERDICT.md`의 판결·투표표·판사 의견을 그대로 보여 준다. 판결을 바꾸거나 누그러뜨리지 않는다.
- 주의: 독립 실행을 할 수 없으면 court를 쓰지 말고 그 사실을 사용자에게 말한다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/court-skill/skills/court/SKILL.md`)을 직접 확인한다.
