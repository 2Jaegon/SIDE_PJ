---
name: scrapling
description: "파이썬 스크래핑 프레임워크 (대량·동적 페이지) (Gon 스킬 풀: scrapling)"
---
<!-- gon-skill-stub -->
# scrapling — Gon Agent Skill

> **용도**: 파이썬 스크래핑 프레임워크 (대량·동적 페이지)
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/Scrapling/agent-skill/Scrapling-Skill/SKILL.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch Scrapling`로 받는다.
- 주의: 대상 사이트의 약관·robots 확인. 접근 통제 우회 금지

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/Scrapling/agent-skill/Scrapling-Skill/SKILL.md`
- 언제: 대량·동적 페이지 스크래핑, 일반 fetch가 실패할 때.
- 절차: 가상환경에서 `pip install "scrapling[all]>=0.5"`, 브라우저는 `scrapling install --force`(설치는 사용자 동의 후) → 단순 페이지는 `scrapling extract get "<url>" out.md --ai-targeted`, JS 페이지는 `fetch` → 출력 파일을 읽고 지운다 → 필요한 부분만 `-s <css>`.
- 금지: 접근 권한 없는 콘텐츠, robots.txt·약관 위반, 페이월·인증 우회, 개인·민감 정보 수집. 대량 크롤링은 지연을 둔다.

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/Scrapling/agent-skill/Scrapling-Skill/SKILL.md`)을 직접 확인한다.
