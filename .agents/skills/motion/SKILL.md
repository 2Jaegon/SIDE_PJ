---
name: motion
description: "모션 설계·감사 (200~300ms ease-out 원칙) (Gon 스킬 풀: motion)"
---
<!-- gon-skill-stub -->
# motion — Gon Agent Skill

> **용도**: 모션 설계·감사 (200~300ms ease-out 원칙)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/design-motion-principles/skills/design-motion-principles/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch design-motion-principles`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/design-motion-principles/skills/design-motion-principles/SKILL.md`
- 절차:
  1. 모드 판별: "만들어/추가/애니메이션" → Create, "감사/리뷰/점검" → Audit, 애매하면 묻는다.
  2. 해당 워크플로 파일을 끝까지 따른다: `workflows/create.md` 또는 `workflows/audit.md`.
  3. 맥락별 시간: 생산성 UI는 300ms 미만(180ms 적정), 제품 마감은 200~500ms, 놀이형은 효과 우선. 일괄적으로 시간을 자르지 않는다.
  4. 접근성: `prefers-reduced-motion` 대응은 필수.
- 이 저장소 원칙: 200~300ms ease-out(AGENTS.md).

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/design-motion-principles/skills/design-motion-principles/SKILL.md`)을 직접 확인한다.
