---
name: headroom
description: "긴 로그·출력 압축으로 토큰 절약 (Gon 스킬 풀: headroom)"
---
<!-- gon-skill-stub -->
# headroom — Gon Agent Skill

> **용도**: 긴 로그·출력 압축으로 토큰 절약
> **지침 파일**: `../../../../AppData/Local/Temp/tmpwy23pw20/repos/headroom/wiki/cli.md` (저장소 루트 기준)

- 파일이 없으면 `python -I ai/gon/gon.py fetch headroom`로 받는다.
- 개요 문서일 수 있다. 세부 스킬이 있으면 같은 저장소에서 grep으로 찾아 해당 파일만 연다.

### 워크플로우 및 실행 지침 (WORKFLOWS.md)

- 지침: `ai/gon/skills/repos/headroom/wiki/cli.md`
- 언제: 로그·도구 출력이 너무 길어 토큰을 많이 쓸 때.
- 절차:
  1. 먼저 도구 없이 줄인다: 출력은 `| tail -n 50`, `| sed -n '1,30p'`, grep 필터로 필요한 부분만 본다.
  2. 세션 전체에 압축 프록시가 필요하면 `headroom wrap codex`(Codex) 또는 `headroom wrap claude`로 프록시를 띄워 실행한다(기본 포트 8787, `--no-proxy`는 기존 프록시 사용). Gemini용 wrap은 문서에 확인되지 않았다.
  3. 압축 전후 확인은 `headroom inspect`, 성능은 `headroom perf`.
- 주의: headroom 설치는 사용자 동의 후.

### 2.3 코드·UI 작업 (`[코드·UI 작업]`)

### Codex & Antigravity 실행 시 주의사항
- 원문 지침에 `AskUserQuestion`이 있으면 번호 목록 선택지 질문 또는 `ask_question` 도구를 쓴다.
- 서브에이전트 병렬 호출 지침이 있으면 순차 실행하거나 `invoke_subagent` 도구를 쓴다.
- 브라우저 상호작용은 `agent-browser` 스킬을 활용한다.
- 세부 전체 지침이 필요하면 `read_file`로 지침 파일(`../../../../AppData/Local/Temp/tmpwy23pw20/repos/headroom/wiki/cli.md`)을 직접 확인한다.
