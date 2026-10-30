# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

이 저장소 전체가 하나의 제품 **Gon**이다. `Gon/`(비서 에이전트: 프로토콜·CLI·스킬 레지스트리·메모리)과 `backend/`+`frontend/`(웹 서비스)가 같은 스킬 풀을 공유한다. 일하는 방식(`gon recent` → `gon pick` → 실행 → 검증 → `gon log`)은 `Gon/GON.md`가 정의하고 `AGENTS.md`가 상시 적용을 선언한다. 여기서는 반복하지 않는다. 서비스 결과가 이상하면 코드뿐 아니라 `Gon/registry/skills.json`과 `Gon/prompt/`도 원인일 수 있다.

## 명령

모두 저장소 루트에서 실행한다. 필요한 것: Git, Python 3.10+, Node 18+.

```
python -I Gon/gon.py run [--no-open]   # 의존성 설치 + 백엔드 :8000 + 프론트 :5173 (stop: gon stop, 상태: gon doctor)
cd backend && python -m app.main                        # 백엔드만 reload로 실행 (:8000, 프론트 없이 API 디버깅)
python -I Gon/gon.py <catalog|pick|recent|log|remember|observe|review|learn|fetch|install|always>   # README 참고

cd backend && python -m pytest -q                       # 전체 (test_gon_cli.py는 gon.py CLI를 검증)
cd backend && python -m pytest -q tests/test_pipeline.py -k plan   # 단일 파일/케이스
cd frontend && npx tsc --noEmit                          # 프론트 타입 검사 (린터 없음)
cd frontend && npm run build                             # tsc && vite build
```

- 테스트는 `backend/`에서 돌린다. `conftest.py`가 `GON_LLM=stub`을 강제하고 `agy` 실행을 막으므로 실제 AI 호출은 일어나지 않는다.
- 서비스 코드를 고친 뒤에는 프론트 `tsc`, 백엔드 `pytest`를 돌리고 실제로 띄워서 본다(UI는 브라우저). 이미 서버가 떠 있으면 `gon run`은 포트 충돌로 거절하니 먼저 `gon stop`.

## 서비스 구조

요청 한 건의 흐름은 `backend/app/core/pipeline.py`의 제너레이터 `run(query, selected_expert_ids, images, history, model, depth)` 하나에 있다. 이벤트(dict)를 `start → plan → agent* → synthesis → delta* → final`(실패 시 `error`) 순으로 내보내고, `api/routes.py`의 `POST /api/office/dispatch-stream`이 이를 NDJSON으로 흘려보낸다. 프론트 `App.tsx`가 이 스트림을 읽어 화면을 갱신한다. 이벤트 형태나 `DispatchRequest` 필드를 바꾸면 이 세 곳을 같이 본다.

1. **편성**: LLM이 전문가 풀 카탈로그에서 고르고(`_plan_prompt`/`_parse_plan`), 실패하거나 AI가 없으면 `_keyword_plan`(트리거 키워드 + synergy)으로 대체한다. 사용자가 직접 지정한 `selected_expert_ids`가 있으면 최우선. 편성 결과의 `route`가 `direct`이면 팀 없이 총괄이 바로 답하고(`_direct_prompt`, `agent` 이벤트 없음), `team`이면 아래 2~3으로 간다.
2. **병렬 작업**: `ThreadPoolExecutor`(`GON_LLM_WORKERS`)로 전문가별 프롬프트 + 질문 코칭을 동시에 호출. 한 명이 실패해도 나머지는 계속한다.
3. **종합**: 총괄 편집자 프롬프트로 합치고, 실패하면 전문가 결과를 이어 붙인다. 종합과 바로 답은 `_answer`가 `delta`(글자 조각) 이벤트로 스트리밍한 뒤 `final`에 전체 글을 싣는다.

같은 대화의 이전 턴은 요청의 `history`로 오고 `_history_block`이 모든 프롬프트 앞에 붙인다(서버는 대화 상태를 갖지 않는다). 첨부 이미지는 편성·전문가·바로 답에만 가고 코칭·종합은 글만 본다.

핵심 연결 고리:
- **전문가 풀 = 레지스트리**: `core/experts.py:load_pool()`이 `Gon/registry/skills.json`(status가 `external`이 아닌 것)과 `Gon/prompt/*.md` 일부를 읽어 전문가로 만든다. 화면 표시명은 `experts.NAMES`/`PROMPT_EXPERTS`에, 분야 라벨·색은 `CLUSTER_KO`/`CLUSTER_ACCENT`에 따로 있다. **스킬을 추가·삭제하면 레지스트리, `NAMES`, 풀 개수를 적은 문서(`README.md`, `docs/README.md`), 그리고 Codex·Gemini용 절차 문서 `Gon/WORKFLOWS.md`의 해당 절을 함께 맞춘다.**
- **지침 주입**: 전문가 프롬프트에는 해당 스킬 파일 3000자 발췌와 `Gon/prompt/outranks everything below.md`의 Core 1~4가 붙는다. 하위 스킬이 수백 개인 저장소(`MULTI_SKILL_IDS`)는 총괄이 낸 영문 `terms`로 `_find_sub_skill`이 세부 파일을 찾는다(한국어 키워드 사전은 두지 않는다).
- **스킬 저장소는 git 밖**: `Gon/skills/repos/`는 gitignore이고 `Gon/skills/repos.json`의 URL에서 처음 쓸 때 clone된다(`experts._ensure_repo` → `gon.py`). 새 PC에서는 `gon fetch all`. 우리가 만든 스킬만 `Gon/skills/local/`에 추적된다.
- **LLM 호출(`core/llm.py`)**: 외부 CLI를 서브프로세스로 부른다. 기본(`GON_LLM=auto`)은 `gon install`에서 고른 메인 AI(`Gon/tools.local.json`의 `main`)를 쓰고, 기록이 없으면 `agy`(Antigravity CLI)만 쓴다. `GON_LLM`으로 지정하면 그쪽이 우선한다. 화면에서 고른 모델은 `--model`로 넘긴다(claude 별칭, agy는 `agy models`). `agy`는 프롬프트를 인자로, 나머지는 stdin으로 넘긴다(.cmd 셸에서 줄바꿈이 잘리거나 명령이 실행되는 문제를 겪어서). 메인 AI가 사용량 한도에 걸리면(`is_quota_error`) 복귀 시각을 `Gon/.quota.local.json`에 저장하고 그동안 서브 AI로 넘어간다. `GON_LLM=stub`이거나 CLI가 없으면 "(시험용)" 응답을 내고 화면에 그렇다고 표시한다. 다른 환경변수: `GON_MAX_EXPERTS`(절대 상한, 기본 16), `AGY_PATH`.
- **팀 편성 규칙(`pipeline.py`)**: 사용자가 고른 깊이(`depth` fast/normal/deep → 상한 4/8/16, `DEPTHS`) 안에서 총괄이 요청 크기로 인원을 정하고, 전문가마다 관점(`lens`: dev=개발자 / service=서비스)을 붙인다. 종합은 분석 → 정리 → 시각화(```chart 막대 차트 JSON, 프론트 `Markdown.tsx`가 그림) → 개발(필요할 때 코드) 순서다.
- **인증·기록 저장(`core/database.py`, `core/auth.py`, `api/auth.py`, `api/history.py`, `models/`)**: SQLAlchemy 위에 있고 `main.py` 시작 시 `init_tables()`가 `create_all`을 돌린다. 마이그레이션 도구는 없고, 컬럼 추가는 `init_tables()` 안의 `ALTER TABLE`(실패 무시)로 한다. `DATABASE_URL`(또는 `SUPABASE_DB_PASSWORD`)로 Supabase PostgreSQL에 붙고, 비밀번호가 `[YOUR-PASSWORD]` 그대로이거나 연결에 실패하면 `backend/gon_dev.db`(SQLite)로 조용히 폴백한다. 어느 쪽에 붙었는지는 `GET /api/auth/status`(`get_db_status`)로 본다. 인증은 bcrypt + JWT(HS256, 7일)이고 Google 로그인은 `GOOGLE_CLIENT_ID`가 있어야 한다. 대화 기록(`/api/history`)은 `get_optional_user`라서 비로그인도 `user_id IS NULL` 기록으로 쓰인다. `JWT_SECRET`은 코드에 개발용 기본값이 있어 `.env` 없이도 서버가 뜨므로, 공개·배포 전에는 반드시 바꾼다. 테스트는 `test_auth.py`, `test_history.py`. **주의: `conftest.py`는 LLM만 막고 DB는 격리하지 않으므로, 인증·기록 테스트가 실제 앱 DB(`gon_dev.db` 또는 연결된 Supabase)에 `test_<ts>@example.com` 사용자를 만든다.** 인증·기록 테스트를 돌리기 전에 어느 DB에 붙는지 확인한다. DB 연결 실패 시 조용한 SQLite 폴백 때문에 한 서버 프로세스 동안 가입 데이터가 로컬 파일로 가서 두 DB로 갈라질 수 있으니, 가입이 안 보이면 `/api/auth/status`의 `mode`부터 확인한다.
- **프론트(`frontend/`)**: 로그인(`auth.ts`, `LoginPage.tsx`)과 기록(`history.ts`)이 위 API를 부른다. React 18 + Vite + Tailwind. `/api`는 vite proxy로 8000에 간다. 사무실 화면은 react-three-fiber 3D 직교 뷰(`components/office3d/`: `layout.ts`의 좌표·`MAX_ZOOM`이 총괄 책상 크기까지 묶음)이고, 총괄 패널(`GonPanel`)과 화면 좌표를 맞춰 전문가가 걸어가 전달하는 연출을 한다.

## UI 작업 전에
화면 구조는 피그마 Desktop-1(1440x1024) 기준이고, 사용자가 여러 번 바로잡은 결정(총괄 자리는 대화·사무실과 분리된 별도 카드, 프로젝트와 무관한 장식 기능 금지 등)이 `Gon/memory/MEMORY.md`에 있다. `frontend/`를 건드리기 전에 읽는다. 개발 스펙은 FastAPI, React+TypeScript, Supabase다(Supabase는 SQLAlchemy 경유 PostgreSQL 연결로만 쓰고 supabase SDK는 없다).

## CLI(`Gon/gon.py`)와 공유 상태

- `Gon/memory/MEMORY.md`(장기 메모리)·`log.md`(작업 이력)·`observations.md`(스킬 관찰)는 Claude, Gemini, Codex가 번갈아 읽고 쓰는 공용 파일이다. 직접 덮어쓰지 말고 `gon remember/log/observe`로 추가하고, 끝낼 때 `gon log --by claude "…"`를 남긴다.
- `.claude/`는 `agents/gon.md`와 `commands/Gon.md`만 추적된다. `/gon` 전역 등록과 쓸 AI 선택은 `gon install --tools …`/`gon always on|off`이며 선택은 `Gon/tools.local.json`(gitignore)에 저장된다. 이 PC는 claude, gemini.
- `backend/.env`(gitignore 대상, 예시는 `.env.example`)에 DB 비밀번호·`JWT_SECRET`이 들어간다. 커밋하지 않는다.
- `GEMINI.md`는 `@AGENTS.md` 한 줄이다. 상시 규칙은 `AGENTS.md` 한 곳만 고친다.
