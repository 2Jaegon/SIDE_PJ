---
name: ecc-a11y
description: "프론트엔드 접근성(키보드, 스크린리더, 대비) (Gon 스킬 풀: ecc-a11y)"
---
<!-- gon-skill-stub -->
# ecc-a11y — Gon Agent Skill

> **용도**: 프론트엔드 접근성(키보드, 스크린리더, 대비)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/frontend-a11y/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch ECC`로 받는다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/ECC/skills/frontend-a11y/SKILL.md`
- 절차: 폼은 label 연결, 필수 표시, 에러는 `aria-describedby`로 필드에. 시맨틱 HTML 먼저, ARIA는 보충. 동적 내용은 `aria-live`. 펼침은 `aria-expanded`/`aria-controls`. 커스텀 드롭다운은 키보드 조작. 모달은 포커스 가두기와 닫을 때 복원. 아이콘 버튼은 `aria-label`. `prefers-reduced-motion` 대응.
- 완료: 지침 끝의 체크리스트를 통과.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/ECC/skills/frontend-a11y/SKILL.md`)을 직접 확인한다.
