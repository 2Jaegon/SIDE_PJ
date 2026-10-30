---
name: shadergradient
description: "움직이는 3D 그라디언트 배경 (React) (Gon 스킬 풀: shadergradient)"
---
<!-- gon-skill-stub -->
# shadergradient — Gon Agent Skill

> **용도**: 움직이는 3D 그라디언트 배경 (React)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/shadergradient/README.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch shadergradient`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/shadergradient/README.md`
- 언제: React에 움직이는 3D 그라디언트 배경.
- 절차: `npm i @shadergradient/react @react-three/fiber three three-stdlib camera-controls`(React 18은 r3f 8.x) → `<ShaderGradientCanvas style={{position:'absolute',inset:0}}><ShaderGradient … /></ShaderGradientCanvas>` → props(type, animate, uSpeed, color1~3, cDistance 등)로 조정. 움직임 줄이기 설정이면 `animate="off"`.
- 이 저장소: `user/frontend/src/components/Backdrop.tsx`에 이미 적용돼 있다(사용자 승인). 앱 뒤 `-z-10` 고정.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/shadergradient/README.md`)을 직접 확인한다.
