---
name: ecc-git
description: "브랜치·커밋·PR 워크플로 (Gon 스킬 풀: ecc-git)"
---
<!-- gon-skill-stub -->
# ecc-git — Gon Agent Skill

> **용도**: 브랜치·커밋·PR 워크플로
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/git-workflow/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/git-workflow/SKILL.md`
- 절차: 기본은 GitHub Flow. 커밋은 Conventional Commits(`feat(scope): subject`, 명령형, 50자 이내, 본문은 "왜"). 공유 브랜치는 rebase하지 않는다. PR은 제목 형식과 설명 템플릿을 따른다.
- 주의: 커밋·푸시는 사용자가 요청할 때만. 기본 브랜치면 먼저 브랜치를 만든다. 다른 AI의 미커밋 변경을 함께 커밋하지 않는다(`gon recent`로 확인).

### 2.4 디자인·모션·비주얼

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/git-workflow/SKILL.md`)을 직접 확인한다.
