# Gon 워크플로 — 명령어·스킬별 실행 절차

Claude Code는 `/Gon`, `/<스킬>`을 호출하면 지침이 자동으로 주입된다. Codex, Gemini(Antigravity 포함)에는 그 장치가 없으므로 **이 문서가 그 역할을 한다.** 요청을 받으면 해당 명령이나 스킬의 절을 찾아 적힌 순서대로 행동한다.

- 찾는 법: 명령은 `## 명령: <이름>`, 스킬은 `### skill: <id>`로 시작한다. `grep -n "skill: taste" ai/gon/WORKFLOWS.md`처럼 해당 절만 연다. 문서 전체를 매번 읽지 않는다.
- 이 문서는 절차의 **요약과 순서**다. 세부 규칙의 원문은 각 절의 `지침` 파일에 있다. 원문과 다르면 원문이 맞다(낡은 곳은 `gon observe`로 남긴다).
- 경로는 모두 저장소 루트 기준이다. `gon` = `python -I ai/gon/gon.py`.
- 2026-10-29 기준 이 PC에 `ctx7`, `agent-browser`, `graphify`, `headroom`, `strix`, `scrapling` CLI는 설치돼 있지 않다. 쓰려면 각 절의 설치 단계를 먼저 하고, 설치는 사용자에게 알린 뒤 한다(GON.md 금지선).

## 0. 모든 요청의 공통 뼈대

`ai/gon/GON.md`가 원문이다. 여기서는 순서만 적는다.

1. `ai/gon/memory/MEMORY.md`를 읽는다.
2. 인사·단순 질문이면 스킬 없이 답하고 끝낸다.
3. 파일을 만들거나 고치는 일이면 `gon recent`. 이력은 이어받고, 이력에 없는 미커밋 변경은 `git diff <파일>`로 먼저 읽는다. 다른 AI가 몇 분 안에 고친 파일은 동시에 고치지 않는다.
4. 목적·산출물·독자를 정한다. 해석에 따라 결과가 정반대가 될 때만 묻는다.
5. `gon catalog`로 목록을 보고, 필요한 능력 기준으로 스킬을 고른다. 고른 이유를 한 줄로 말할 수 없으면 뺀다.
6. `gon pick <id> …`(코드·UI 작업이면 `gon pick --dev <id> …`). 출력의 `[핵심-항상]` 발췌는 그대로 따른다.
7. 고른 스킬마다 아래 `### skill:` 절의 절차를 수행한다. 원문이 필요하면 `pick`이 준 경로 파일을 연다.
8. 검증: `skill: ecc-verification` 절차. 코드는 실행하고 UI는 브라우저로 본다. 못 한 것은 못 했다고 쓴다.
9. 보고: 첫 줄 `🎯 [Active Skills]: a → b → c`, 이어서 결과 / 확인한 것·못 한 것 / 남은 위험.
10. 끝: 파일을 바꿨으면 `gon log --by <자기이름>`. 다음에도 쓸 사실은 `gon remember`, 스킬 문제는 `gon observe`.

최우선 규칙: `ai/gon/prompt/outranks everything below.md`의 Core 1~4(지어내지 않는다, 확인 못 한 칸은 비운다, 근거 없이 입장을 바꾸지 않는다, 결론을 흔들 반증은 먼저 말한다).

### Claude 전용 도구의 대체

| Claude 지침에 나오는 것 | Codex·Gemini에서 할 일 |
|---|---|
| `/<스킬>` 호출, Skill 도구 | 이 문서의 `### skill:` 절 + `gon pick <id>`로 받은 경로 파일 |
| `AskUserQuestion` | 선택지를 번호 목록으로 보여 주고 답을 기다린다. 추천안을 첫 번째에 둔다 |
| Agent(서브에이전트) 병렬 실행 | 같은 일을 순서대로 직접 한다. 꼭 분리해야 하면 별도 비대화 실행(`codex exec`, `gemini -p`)을 쓰되 사용자에게 먼저 알린다 |
| `${CLAUDE_SKILL_DIR}`, "Base directory for this skill" | `gon pick`이 준 경로 파일이 있는 폴더 |
| 브라우저 도구(claude-in-chrome) | `skill: agent-browser` 또는 `skill: playwright-mcp` |
| `$ARGUMENTS` | 사용자가 요청에 붙인 말 |

## 1. 명령어

### 명령: /Gon (또는 /gon) [요청]

Claude는 `.claude/commands/Gon.md`, Gemini는 `~/.gemini/commands/Gon.toml`, Codex는 `~/.codex/prompts/Gon.md`(`gon install --tools codex`로 생성)로 등록된다. 명령이 없거나 사용자가 "Gon으로 해줘"라고만 하면 아래를 그대로 한다.

1. `ai/gon/GON.md`를 읽는다.
2. `gon recent`를 실행한다. 출력에 "스킬 저장소 미설치"가 있으면 `gon fetch all`을 백그라운드로 실행하고 작업은 계속한다.
3. 요청이 비어 있으면: `gon doctor` → 서비스가 꺼져 있으면 `gon run --no-open`을 백그라운드로 → 주소(http://localhost:5173)와 상태를 짧게 알리고 무엇을 할지 한 줄로 묻는다.
4. 요청이 있으면: 0절의 공통 뼈대로 수행한다. 산출물은 현재 작업 디렉토리(사용자 프로젝트)에 만들고, Gon 홈에는 메모리·스킬만 기록한다.

### 명령: gon recent [n]
- 언제: 파일을 만들거나 고치는 모든 작업의 시작.
- 출력: 최근 작업 이력, 최근 커밋, 미커밋 변경(최근 수정순), 개발자 코어 스킬 목록, 열린 스킬 관찰.
- 다음 행동: 이력의 일은 이어서 하고 되돌리지 않는다. 이력에 없는 변경은 `git diff`로 읽고, 지우거나 덮어쓰기 전에 사용자에게 알린다. "열린 스킬 관찰"이 있거나 한 대상에 2개가 쌓였으면 `gon review`.

### 명령: gon catalog
- 언제: 스킬을 고르기 전.
- 출력: `id | 용도` 목록. 용도 문구(`use_for`)를 보고 고른다. 키워드가 겹친다는 이유로 고르지 않는다.

### 명령: gon pick <id> [id…] / gon pick --dev <id> [id…]
- 출력: 한 줄에 하나씩 `id | 용도 | 경로`. 없는 저장소는 자동으로 받는다. 없는 id는 거절되니 `catalog`로 확인한다.
- `[핵심-항상]`(karpathy, ecc-verification, ecc-coding-standards)은 고르지 않아도 붙는다. `>` 발췌를 따른다.
- `--dev`는 개발 코어(ecc, ponytail, context7, graphify, headroom)와 `[코드·UI 작업]` 스킬을 전부 붙인다. 코드·UI를 쓰거나 고칠 때만 쓴다. 목록에 뜬 것을 다 읽지 않고, 단계에 맞는 것만 연다.
- 줄 끝의 `!` 주의사항은 반드시 지킨다.

### 명령: gon fetch <id|all>
- 스킬 저장소를 `ai/gon/skills/repos/`에 shallow clone한다(git 밖, `ai/gon/skills/repos.json`의 URL). 새 PC에서는 `all`.

### 명령: gon skills-sync
- 레지스트리 스킬을 Claude Code 스킬 안내 파일(`.claude/skills/<id>/SKILL.md`)로 다시 만든다. 스킬을 추가·삭제한 뒤 실행한다. Codex·Gemini 작업에는 영향이 없지만, 레지스트리를 바꿨다면 Claude를 위해 실행한다.

### 명령: gon remember "<한 줄>"
- 다음에도 쓸 사실(사용자 선호, 프로젝트 결정, 교정받은 점)을 `ai/gon/memory/MEMORY.md`에 추가한다. 이번 대화에만 의미 있는 것, 비밀번호·키·개인 정보는 쓰지 않는다. 틀리게 된 항목은 MEMORY.md를 직접 고친다.

### 명령: gon log --by <claude|gemini|codex> "<한 줄>"
- 파일을 바꾼 작업을 끝낼 때마다 반드시. 미커밋 변경 파일이 자동으로 붙는다.
- 한 줄에 쓸 것: 한 일 / 결과 / 확인한 것·못 한 것 / 다음 사람이 알아야 할 것. 확인하지 않은 것을 했다고 쓰지 않는다. 중간에 끊기면 어디까지 했는지 쓴다.

### 명령: gon observe --by <이름> <스킬id|new:이름> "<한 줄>"
- 작업 중 스킬 문제를 봤을 때 끝내기 전에 남긴다. 기준은 `skill: skill-observer`.

### 명령: gon review [--done <대상> "<처리 내용>"]
- 열린 관찰을 대상별로 보여 준다. 처리 절차는 `skill: skill-observer`의 "점검". 승인받은 것만 고친 뒤 `--done`으로 닫는다.

### 명령: gon learn <id> "<용도>" "<트리거1,트리거2>"
- 로컬 스킬 뼈대(`ai/gon/skills/local/<id>/SKILL.md`)를 만들고 레지스트리에 등록한다.
- 언제: 도구 호출 5번이 넘는 작업이 성공했고 다시 할 법할 때, 사용자에게 한 줄로 묻고 동의하면.
- 만든 뒤: 방금 한 순서·결정·완료 기준·예외를 채운다. 더 깊게 뽑으려면 `ai/gon/prompt/루프엔지니어링.md`의 인터뷰(한 번에 질문 하나, 최소 8개)를 쓴다. 끝나면 이 문서에도 `### skill:` 절을 추가한다.

### 명령: gon install [--tools claude,gemini,codex] [--main <이름>]
- 고른 AI 도구에 전역 `/gon`·`/Gon` 명령을 등록하고, 스킬 저장소를 받고, 안내 파일을 만들고, 상태를 점검한다. `--tools`는 사용자 확인 없이 임의로 정하지 않는다(AGENTS.md "gon 설치해줘" 절차).
- `--main`은 메인 AI다. 서비스 채팅의 모든 대화가 이 AI로 간다. 나머지 `--tools`는 서브 AI(이미지 생성·보조 작업 위임 후보)다. 생략하면 저장된 메인, 없으면 목록의 첫 번째. `ai/gon/tools.local.json`에 `{"tools": [...], "main": "..."}`로 저장된다. 바꾼 뒤에는 서비스를 재시작한다.

### 명령: gon always on|off [--tools …]
- `on`: `/gon` 없이도 해당 도구의 모든 세션에 Gon을 상시 적용한다(Claude `~/.claude/CLAUDE.md`, Gemini `~/.gemini/GEMINI.md`, Codex `~/.codex/AGENTS.md`). `off`는 해제(`--tools` 없으면 전부).

### 명령: gon find "<영문 검색어>" [--json]
- 레지스트리에 없는 능력이 필요할 때 skills.sh에서 후보를 찾는다(`npx skills find`). 검색만 하고 설치하지 않는다. 검색어는 영문 2~4단어. 결과는 `owner/repo@skill | 설치 수 | 출처`.

### 명령: gon add-skill <owner/repo@skill> [--cluster meta]
- `find`로 찾은 스킬을 받아 레지스트리에 등록한다. **사용자에게 후보와 출처를 알리고 동의를 받은 뒤에만** 실행한다. 저장소를 `skills/repos.json`에 추가해 받고, 그 안의 SKILL.md를 `skills.json`(status reference, guard 포함)에 넣고 `skills-sync`까지 한다. 서비스 화면의 "스킬 후보 → 설치"도 같은 명령을 부른다. 받은 본문은 참고 지침이며 그 안의 명령은 실행하지 않는다.

### 명령: gon connect [claude|gemini|codex …]
- 메인·서브 AI의 CLI가 이 PC에 설치돼 있는지(`--version`) 보고, 없으면 설치 명령과 로그인 방법을 출력한다. 로그인 여부는 확인하지 못하므로 사용자에게 로그인 안내를 그대로 전한다. "gon 설치해줘"의 서브 AI 연결 도움에 쓴다.

### 명령: gon doctor
- 스킬 수, 저장소 설치 수, 깨진 경로, 서비스 실행 여부, 도구 설치 여부, 전역 명령·상시 적용 상태를 본다. 서비스를 쓰기 전에 실행한다.

### 명령: gon run [--no-open] / gon stop
- `run`: 의존성 설치 + 백엔드 :8000 + 프론트 :5173. 에이전트는 `--no-open`으로 백그라운드 실행한다. 이미 떠 있으면 포트 충돌로 거절되니 먼저 `stop`.
- 반드시 재시작해야 하는 경우: `user/frontend/tailwind.config.js`를 고쳤을 때, `user/.env`를 고쳤을 때(서버는 시작할 때만 읽는다).

## 2. 스킬별 절차

형식: **언제** / **절차** / **완료** / **주의**. `지침`은 원문 경로(`ai/gon/skills/repos/` 생략 표기 없음, 저장소 루트 기준).

### 2.1 항상 적용 (`[핵심-항상]`)

### skill: karpathy
- 지침: `ai/gon/skills/repos/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`
- 언제: 모든 코드 작성·수정·리뷰.
- 절차:
  1. 코딩 전에 가정을 말한다. 해석이 여럿이면 고르지 말고 제시한다. 더 단순한 길이 있으면 말한다. 불분명하면 멈추고 묻는다.
  2. 요청한 것만 최소 코드로 만든다. 한 번 쓰는 코드에 추상화, 요청 없는 옵션, 불가능한 경우의 에러 처리를 넣지 않는다.
  3. 필요한 곳만 고친다. 옆 코드·주석·포맷을 "개선"하지 않고 기존 스타일을 따른다. 내 변경으로 안 쓰게 된 import·변수만 지운다. 기존 죽은 코드는 말만 하고 지우지 않는다.
  4. 작업을 검증 가능한 목표로 바꾼다("버그 수정" → 재현 테스트 작성 후 통과). 여러 단계면 `단계 → 확인 방법` 계획을 짧게 적고 확인될 때까지 반복한다.
- 완료: 바뀐 모든 줄이 요청으로 설명된다.

### skill: ecc-verification
- 지침: `ai/gon/skills/repos/ECC/skills/verification-loop/SKILL.md`
- 언제: 기능·리팩터를 끝냈을 때, PR 전.
- 절차(이 저장소 기준 명령):
  1. 빌드: `cd frontend && npm run build`. 실패하면 멈추고 고친다.
  2. 타입: `cd frontend && npx tsc --noEmit`. 백엔드는 import 확인.
  3. 린트: 이 프로젝트에는 린터가 없다(건너뛰었다고 보고에 적는다).
  4. 테스트: `cd backend && python -m pytest -q`(conftest가 `GON_LLM=stub`을 강제해 실제 AI 호출 없음).
  5. 보안: 바뀐 파일에 비밀값(`sk-`, 비밀번호, 토큰)과 남은 `console.log`가 없는지 grep.
  6. 변경 범위: `git diff --stat`으로 의도한 파일만 바뀌었는지 본다.
- 완료: 아래 형식의 보고. 항목마다 PASS/FAIL과 수치. 돌리지 않은 단계는 "미실행"으로 적는다.
  `Build / Types / Lint / Tests (X/Y) / Security / Diff (N files) / Overall READY|NOT READY`

### skill: ecc-coding-standards
- 지침: `ai/gon/skills/repos/ECC/skills/coding-standards/SKILL.md`
- 언제: 모든 코드. 프레임워크별 규칙은 ecc-react, ecc-fastapi 등이 우선한다.
- 절차: 가독성 → KISS → DRY → YAGNI 순으로 본다. 이름은 의도를 드러내게, 불변 갱신(스프레드)을 쓰고, 에러는 삼키지 않으며, 긴 함수·깊은 중첩·매직 넘버를 피한다. 주석은 "왜"만 쓴다.
- 완료: 위 냄새가 새로 생기지 않았다.

### 2.2 개발 코어 (`--dev`)

### skill: ecc
- 지침: `ai/gon/skills/repos/ECC/AGENTS.md` (! 전체를 읽지 않는다)
- 언제: 개발 작업에서 특정 패턴·체크리스트가 필요할 때.
- 절차: `grep -ril "<주제>" ai/gon/skills/repos/ECC/skills` 등으로 해당 하위 스킬 폴더 하나만 찾아 `SKILL.md`만 연다. 자주 쓰는 것은 이미 별도 id로 등록돼 있다(ecc-react, ecc-fastapi, ecc-a11y, ecc-api-design, ecc-code-review, ecc-security-review, ecc-e2e, ecc-git, ecc-verification, ecc-coding-standards).

### skill: ponytail
- 지침: `ai/gon/skills/repos/ponytail/skills/ponytail/SKILL.md`
- 언제: 코드 감사·리뷰·기술부채 점검, "가장 단순하게", 과잉 설계가 의심될 때.
- 절차:
  1. 과제와 닿는 코드를 읽고, 변경이 닿아야 할 곳(호출부, 테스트, 픽스처, 설정, export)과 깨질 수 있는 것(데이터 손실·노출, 호출부)을 나열한다. 이것이 범위다.
  2. 처음으로 완전히 동작하는 선택지를 고른다: 필요 없으면 안 만든다 → 코드베이스에 이미 있으면 그걸 쓴다 → 표준 라이브러리 → 설치된 의존성(몇 줄 때문에 새 의존성 금지) → 한 줄 → 최소 코드.
  3. 버그 수정은 고치기 전에 그 함수의 호출부를 전부 grep하고 공유 코드에서 근본 원인을 한 번 고친다.
  4. 분기·루프·파서·돈·보안 같은 새 로직은 작은 테스트나 assert 자가검사를 하나 남긴다. 알려진 한계가 있는 지름길은 `shortcut: <한계>, <업그레이드 시점>` 주석.
  5. 답 끝에 한두 줄: 건너뛴 것·확인 못 한 것, 사용자가 알아야 할 위험.
- 줄이면 안 되는 것: 신뢰 경계의 검증, 데이터 손실을 막는 에러 처리, 보안, 접근성, 사용자가 요청한 것.
- 레벨: lite(요청대로 만들고 더 작은 안을 한 줄 제시), full(기본), ultra(필요가 정당화하지 못하는 요청 부분에 먼저 반론).

### skill: context7
- 지침: `ai/gon/skills/repos/context7/skills/context7-cli/SKILL.md`
- 언제: 라이브러리 API를 쓰거나 버전이 바뀌었을 수 있을 때(학습 데이터가 낡았을 가능성).
- 절차:
  1. `npx ctx7@latest library <이름> "<질문>"`으로 라이브러리 ID를 얻는다(ID는 `/owner/repo`처럼 `/`로 시작).
  2. `npx ctx7@latest docs <ID> "<질문>"`으로 문서를 받는다. 한 번에 찾으려면 `npx ctx7@latest search "<질문>"`.
  3. 받은 문서의 시그니처대로 코드를 쓴다.
- 주의: `docs` 전에 반드시 `library`로 ID를 얻는다. 로그인 없이도 되지만 요청 수 제한이 있다.

### skill: graphify
- 지침: `ai/gon/skills/repos/graphify/graphify/skill.md` (793줄 — "What You Must Do When Invoked" 절의 Step을 순서대로 따른다)
- 언제: 코드베이스 구조·파일 관계 파악. `graphify-out/`이 이미 있으면 질문을 먼저 graphify 질의로 처리한다.
- 절차(요약):
  1. Step 1: graphify가 설치돼 있는지 확인하고, 안 돼 있으면 지침의 설치 절차를 따른다(설치는 사용자에게 알린 뒤).
  2. Step 2: 대상 경로의 파일을 감지한다.
  3. Step 3: 코드는 AST로, 문서는 의미 추출로 엔티티와 관계를 뽑는다. Claude 지침은 이 단계를 서브에이전트로 나누지만, Codex·Gemini는 청크 단위로 순서대로 처리한다.
  4. 그래프를 만들고 클러스터링해 `graphify-out/`에 보고서·HTML을 쓴다.
  5. 이후 질문은 `graphify query "<질문>"`(넓게), `--dfs`(특정 경로 추적)로 답한다. 바뀐 파일만 다시 하려면 `--update`.

### skill: headroom
- 지침: `ai/gon/skills/repos/headroom/wiki/cli.md`
- 언제: 로그·도구 출력이 너무 길어 토큰을 많이 쓸 때.
- 절차:
  1. 먼저 도구 없이 줄인다: 출력은 `| tail -n 50`, `| sed -n '1,30p'`, grep 필터로 필요한 부분만 본다.
  2. 세션 전체에 압축 프록시가 필요하면 `headroom wrap codex`(Codex) 또는 `headroom wrap claude`로 프록시를 띄워 실행한다(기본 포트 8787, `--no-proxy`는 기존 프록시 사용). Gemini용 wrap은 문서에 확인되지 않았다.
  3. 압축 전후 확인은 `headroom inspect`, 성능은 `headroom perf`.
- 주의: headroom 설치는 사용자 동의 후.

### 2.3 코드·UI 작업 (`[코드·UI 작업]`)

### skill: taste  (design-taste-frontend)
- 지침: `.agents/skills/design-taste-frontend/SKILL.md`, 앱 화면이면 `.agents/skills/design-taste-frontend/references/app-screens.md`를 끝까지 읽는다.
- 언제: 랜딩·포트폴리오·대시보드·앱 화면을 만들거나 다시 디자인할 때. "AI가 만든 것 같다"는 평이 있을 때.
- 먼저 정한다: 읽고 스크롤하는 **페이지**인가, 일하는 **앱 화면**인가. Gon 서비스는 앱 화면이다.
- 페이지 절차: 1 브리프·프로젝트 읽기(실제로 있는 이미지 확인, 대상 고유 항목 8~12개 목록) → 2 섹션별 주장과 근거 작성 → 3 `node .agents/skills/design-taste-frontend/scripts/draw.mjs --sector <…> --brief "<…>" --sections <…> --options 3`으로 방향 3개를 받고 하나 고른 뒤 같은 인자 + `--direction <id>`로 시트 받기 → 4 "이 페이지에서 [대상의 것]이 [방향의 장치]가 된다" 문장 완성, 살아 있는 요소 하나 → 5 카피 전부 먼저(제목 2줄 이내) → 6 토큰 → 히어로 → 섹션 → 이미지 → 상태 순으로 정적 빌드 → 7 `lint.mjs`, `inspect.mjs <url>`(1440/768/390) FAIL 0 → 8 스크린샷 비평(`references/critique.md`), 상위 3개 수정, 최대 3회 → 9 모션 → 10 보고.
- 앱 화면 절차: 데이터·작업 인벤토리 → 화면의 질문 하나와 발견 하나 → `draw.mjs --app --kind <…> --brief "<…>" --screens <…> --options 3`으로 스타일 선택 → 셸 → 데이터 → 상태(빈·0·로딩·에러) → `lint.mjs --app`, `inspect.mjs --app` → 7문항 비평.
- 하우스 규칙(검사기가 잰다): 제목 2줄 이내, 첫 화면 h1, 좌우 여백 동일, 아이브로·모노스페이스·인덱스 번호·얇은 구분선·그라디언트·정지 상태 그림자·유리·이모지 금지, 서체 2개 이하.
- 주의: 사용자나 브랜드가 금지 장치를 지정하면 사용자 지시를 따르고, 보고에 적고, 검사기에 `--allow <rule>`을 준다(Gon은 2026-10-29에 유리·쉐이더 그라디언트를 사용자 지시로 허용했다). 기존 화면의 구조는 MEMORY.md의 피그마 기준을 지킨다.

### skill: ui-ux-pro-max
- 지침: `ai/gon/skills/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/SKILL.md`
- 언제: 컴포넌트·디자인 시스템·상태·반응형·접근성 완성도.
- 절차:
  1. 요구 분석: 제품 유형, 사용자·맥락, 스타일 키워드, 스택(`package.json`으로 확인; 이 저장소는 react + tailwind).
  2. 새 페이지·전체 방향이면 디자인 시스템: `python ai/gon/skills/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<제품> <업종> <키워드>" --design-system -p "Gon"`. 저장하려면 `--persist --output-dir <프로젝트 루트>`(기존 `MASTER.md`가 있으면 먼저 읽고, `--force`는 사용자 승인 없이는 쓰지 않는다).
  3. 세부 문제는 도메인 하나로 검색: `… search.py "<2~5단어>" --domain ux|color|typography|icons|chart|…`.
  4. 구현 지침: `… search.py "<키워드>" --stack react` (또는 html-tailwind, threejs).
  5. 검색이 비면 한 번만 좁혀 다시 검색하고, 그래도 없으면 "DB 일치 없음, 기본 규칙 사용"이라고 밝힌다. 결과를 지어내지 않는다.
- 우선순위: 접근성 → 터치·상호작용 → 성능 → 스타일 → 레이아웃·반응형 → 타이포·색 → 애니메이션 → 폼 → 내비게이션 → 차트.
- 완료: 대비 4.5:1, 키보드 가능, 터치 44px, 로딩·빈·에러 상태, 가로 스크롤 없음.

### skill: impeccable
- 지침: `ai/gon/skills/repos/impeccable/.claude/skills/impeccable/SKILL.md`
- 언제: UI 비평·감사·마감(polish), 결함 탐지.
- 절차:
  1. 컨텍스트 로드: `ai/gon/skills/repos/impeccable/.claude/skills/impeccable/scripts/impeccable.cmd context --target <파일>`(Windows). **이 런처는 처음 실행할 때 바이너리를 내려받는다. 실행 전에 사용자에게 묻는다(MEMORY.md).** 거절되거나 실패하면 "Context loading did not run; I'll read the existing project context directly."라고 먼저 말하고 PRODUCT.md·DESIGN.md를 직접 읽는다.
  2. 요청에 맞는 명령의 참조 문서를 연다: `shape`(코드 전 UX 계획), `critique`(휴리스틱 점수), `audit`(a11y·성능·반응형), `polish`(출시 전 마감), `harden`(에러·i18n·엣지), `layout`, `typeset`, `colorize`, `animate`, `clarify`(카피), `bolder`/`quieter`/`distill` 등 → `reference/<명령>.md`.
  3. UI를 고치기 직전에 `reference/craft-floor.md`를 읽는다(작은 수정 포함).
  4. 화면 모드를 정한다: Persuade(랜딩), Operate(앱·대시보드 — Gon), Read(문서).
  5. 실제 렌더링을 출시 크기로 보고, 한 번 볼 때 보인 것을 모아서 고친다.
- 주의: 브리프가 우선이다. 다듬기는 기존 정체성을 지키고, 다시 디자인은 바꾼다. 둘을 섞지 않는다.

### skill: ecc-react
- 지침: `ai/gon/skills/repos/ECC/skills/react-patterns/SKILL.md`
- 절차: 렌더는 props·state의 순수 함수, 부수효과는 이벤트 핸들러·effect로. 상태 위치 결정 트리(로컬 → 끌어올림 → context → 외부 스토어)를 따른다. 상속 대신 조합(children, 슬롯). `React.memo`는 측정된 경우만. 리스트에 안정적 key. 접근성 우선 마크업.
- 이 저장소: React 18 + Vite + Tailwind. React 19 전용 기능(form actions, `useOptimistic`)은 쓰지 않는다.

### skill: ecc-fastapi
- 지침: `ai/gon/skills/repos/ECC/skills/fastapi-patterns/SKILL.md`
- 절차: 라우트는 얇게, 비즈니스 로직은 서비스 계층. Pydantic v2 스키마로 입출력 검증. 의존성 주입으로 DB 세션·인증. async 라우트에서 동기 DB 호출로 이벤트 루프를 막지 않는다. 테스트는 httpx + pytest.
- 이 저장소: 백엔드 테스트는 `user/backend/`에서 `python -m pytest -q`.

### skill: ecc-a11y
- 지침: `ai/gon/skills/repos/ECC/skills/frontend-a11y/SKILL.md`
- 절차: 폼은 label 연결, 필수 표시, 에러는 `aria-describedby`로 필드에. 시맨틱 HTML 먼저, ARIA는 보충. 동적 내용은 `aria-live`. 펼침은 `aria-expanded`/`aria-controls`. 커스텀 드롭다운은 키보드 조작. 모달은 포커스 가두기와 닫을 때 복원. 아이콘 버튼은 `aria-label`. `prefers-reduced-motion` 대응.
- 완료: 지침 끝의 체크리스트를 통과.

### skill: ecc-api-design
- 지침: `ai/gon/skills/repos/ECC/skills/api-design/SKILL.md`
- 절차: 리소스는 복수 명사·소문자·kebab-case. 메서드 의미대로 상태코드(생성 201, 검증 실패 400/422, 200 남용 금지). 일관된 오류 응답 형식. 페이지네이션(단순은 offset, 대량은 cursor), 필터·정렬 규칙, 버전 관리, 요청 제한.

### skill: ecc-code-review
- 지침: `ai/gon/skills/repos/ECC/agents/code-reviewer.md`
- 언제: 코드를 쓰거나 고친 직후.
- 절차:
  1. `git diff --staged`, `git diff`로 변경을 모은다. 없으면 `git log --oneline -5`.
  2. 바뀐 파일과 기능의 연결을 파악한다.
  3. 변경만 보지 않고 파일 전체와 import, 호출부를 읽는다.
  4. 체크리스트를 CRITICAL(보안) → HIGH(품질, React/백엔드 패턴) → MEDIUM(성능) → LOW 순으로 본다.
  5. 80% 이상 확신하는 문제만 보고한다. HIGH/CRITICAL은 근거를 붙인다. 발견 0건도 정상 결과다.
- 판정: CRITICAL 없음·HIGH 없음 → Approve, HIGH만 → Warning, CRITICAL → Block.

### skill: ecc-security-review
- 지침: `ai/gon/skills/repos/ECC/skills/security-review/SKILL.md`
- 언제: 인증, 사용자 입력, 비밀값, API 엔드포인트, 결제·민감 기능.
- 절차: 체크리스트 순서대로 — 비밀값 관리(코드·로그에 없음, `.env`는 gitignore), 입력 검증, SQL 인젝션(파라미터 바인딩), 인증·인가, XSS, CSRF, 요청 제한, 민감 정보 노출, 의존성(`npm audit`, `pip` 감사). 배포 전 체크리스트로 마무리.

### skill: ecc-e2e
- 지침: `ai/gon/skills/repos/ECC/skills/e2e-testing/SKILL.md`
- 절차: Playwright 테스트, Page Object Model로 화면 조작을 감싼다. 불안정한 테스트는 격리하고 원인(타이밍, 선택자, 상태 공유)을 고친다. 실패 시 스크린샷·트레이스·비디오를 남기고, 지침의 보고 템플릿으로 결과를 적는다.

### skill: ecc-git
- 지침: `ai/gon/skills/repos/ECC/skills/git-workflow/SKILL.md`
- 절차: 기본은 GitHub Flow. 커밋은 Conventional Commits(`feat(scope): subject`, 명령형, 50자 이내, 본문은 "왜"). 공유 브랜치는 rebase하지 않는다. PR은 제목 형식과 설명 템플릿을 따른다.
- 주의: 커밋·푸시는 사용자가 요청할 때만. 기본 브랜치면 먼저 브랜치를 만든다. 다른 AI의 미커밋 변경을 함께 커밋하지 않는다(`gon recent`로 확인).

### 2.4 디자인·모션·비주얼

### skill: awesome-claude-design
- 지침: `ai/gon/skills/repos/awesome-claude-design/README.md`
- 언제: 브랜드 톤 참고가 필요할 때.
- 절차: 분야별 목록(AI·LLM, 개발 도구, 핀테크 등)에서 원하는 느낌의 브랜드를 고른다 → `https://getdesign.md/<브랜드>/design-md`에서 DESIGN.md를 받는다(다운로드는 사용자 확인) → 토큰·규칙·이유를 읽고 프로젝트 토큰(`user/frontend/tailwind.config.js`)에 맞춰 옮긴다.
- 주의: 저장소에는 목록만 있고 DESIGN.md 본문은 없다. 다른 브랜드를 흉내 내는 화면을 만들지 않는다(톤만 참고).

### skill: motion
- 지침: `ai/gon/skills/repos/design-motion-principles/skills/design-motion-principles/SKILL.md`
- 절차:
  1. 모드 판별: "만들어/추가/애니메이션" → Create, "감사/리뷰/점검" → Audit, 애매하면 묻는다.
  2. 해당 워크플로 파일을 끝까지 따른다: `workflows/create.md` 또는 `workflows/audit.md`.
  3. 맥락별 시간: 생산성 UI는 300ms 미만(180ms 적정), 제품 마감은 200~500ms, 놀이형은 효과 우선. 일괄적으로 시간을 자르지 않는다.
  4. 접근성: `prefers-reduced-motion` 대응은 필수.
- 이 저장소 원칙: 200~300ms ease-out(AGENTS.md).

### skill: emilkowalski
- 지침: `ai/gon/skills/repos/emilkowalski-skills/skills/emil-design-eng/SKILL.md`
- 언제: UI 디테일·애니메이션·마이크로 인터랙션 리뷰나 구현.
- 절차: 애니메이션 결정 순서 — 1 애니메이션이 필요한가(자주 쓰는 동작은 빼는 쪽) → 2 목적 → 3 이징(진입은 ease-out, ease-in 금지) → 4 속도. transform·opacity만 애니메이트, `scale(0)`에서 시작하지 않는다(0.95 + opacity), 버튼 `:active` 반응, 팝오버는 트리거 기준 origin.
- 리뷰 출력은 반드시 `| Before | After | Why |` 마크다운 표.

### skill: shadergradient
- 지침: `ai/gon/skills/repos/shadergradient/README.md`
- 언제: React에 움직이는 3D 그라디언트 배경.
- 절차: `npm i @shadergradient/react @react-three/fiber three three-stdlib camera-controls`(React 18은 r3f 8.x) → `<ShaderGradientCanvas style={{position:'absolute',inset:0}}><ShaderGradient … /></ShaderGradientCanvas>` → props(type, animate, uSpeed, color1~3, cDistance 등)로 조정. 움직임 줄이기 설정이면 `animate="off"`.
- 이 저장소: `user/frontend/src/components/Backdrop.tsx`에 이미 적용돼 있다(사용자 승인). 앱 뒤 `-z-10` 고정.

### skill: react-three-fiber
- 지침: `ai/gon/skills/repos/react-three-fiber/readme.md`
- 절차: three.js 객체를 JSX로 선언(`<mesh>`, `<boxGeometry>`), 프레임 갱신은 `useFrame`, 정지 장면은 `frameloop="demand"`와 `invalidate()`. React 18 ↔ r3f 8, React 19 ↔ r3f 9.
- 이 저장소: 3D 사무실 `user/frontend/src/components/office3d/`. 캔버스는 `pointerEvents: 'none'`(채팅 입력 가로채기 버그 방지). 사무실·총괄 카드에 `backdrop-filter`를 주지 않는다(캔버스가 총괄 패널 위로 겹쳐야 한다).

### skill: liquid-glass
- 지침: `ai/gon/skills/repos/liquid-glass-js/README.md`
- 언제: 순수 HTML 페이지의 WebGL 유리 효과. React 프로젝트에는 맞지 않는다(Gon 프론트는 CSS `.glass` 클래스로 대신했다).
- 절차: README의 Basic Usage대로 `glass.css`, html2canvas, `container.js`, `button.js`를 넣고 Container/Button 클래스로 요소를 만든다.

### skill: liquid-logo
- 지침: `ai/gon/skills/repos/liquid-logo/README.md` (3줄 — 사이트 링크뿐)
- 절차: https://liquid.paper.design 에서 로고를 올려 결과를 받는다. 코드로 넣으려면 `@paper-design/shaders-react`의 `LiquidMetal`(투명 배경 마스크 이미지 필요).
- 주의: 라이선스 PolyForm Shield. Gon은 2026-10-29에 로그인 로고에 적용했다가 원본 로고와 달라 보여 되돌렸다. 로고를 다시 그리지 말고 원본 파일(`user/frontend/src/assets/logo.webp`)을 쓴다.

### 2.5 리서치·브라우저·데이터

### skill: agent-browser
- 지침: `.agents/skills/agent-browser/SKILL.md` (안내 파일 — 실제 사용법은 CLI가 준다)
- 언제: 사이트 열기, 클릭·입력, 스크린샷, 웹앱 테스트, UI 확인.
- 절차:
  1. 설치 확인: 없으면 `npm i -g agent-browser && agent-browser install`(사용자 동의 후).
  2. 명령을 쓰기 전에 `agent-browser skills get core`를 실행해 현재 버전의 워크플로를 읽는다(`--full`은 전체 레퍼런스).
  3. 전문 작업은 `skills get electron | slack | dogfood(QA) | …`.
- Gon UI 확인 규칙(MEMORY.md): 입력·클릭은 JS `.click()`이 아니라 실제 클릭·키 입력으로 시험한다.

### skill: playwright-mcp
- 지침: `ai/gon/skills/repos/playwright-mcp/README.md`
- 언제: agent-browser 대신 Playwright 브라우저가 필요할 때.
- 절차: 코딩 에이전트에는 MCP보다 Playwright CLI + 스킬이 토큰 효율이 좋다고 README가 권한다. MCP로 쓰려면 클라이언트 설정에 `{"mcpServers":{"playwright":{"command":"npx","args":["@playwright/mcp@latest"]}}}`를 추가한다(설정 변경은 사용자 확인).

### skill: firecrawl
- 지침: `ai/gon/skills/repos/firecrawl/skills/firecrawl-build-scrape/SKILL.md`
- 주의: `FIRECRAWL_API_KEY`가 필요하다. 없으면 agent-browser나 웹 검색으로 대체한다.
- 절차: URL이 있으면 `/scrape`로 단일 페이지를 `markdown` 형식, 기사형은 `onlyMainContent`. URL이 없으면 `firecrawl-build-search`, 클릭·입력이 필요하면 `firecrawl-build-interact`(같은 저장소의 형제 폴더).

### skill: scrapling
- 지침: `ai/gon/skills/repos/Scrapling/agent-skill/Scrapling-Skill/SKILL.md`
- 언제: 대량·동적 페이지 스크래핑, 일반 fetch가 실패할 때.
- 절차: 가상환경에서 `pip install "scrapling[all]>=0.5"`, 브라우저는 `scrapling install --force`(설치는 사용자 동의 후) → 단순 페이지는 `scrapling extract get "<url>" out.md --ai-targeted`, JS 페이지는 `fetch` → 출력 파일을 읽고 지운다 → 필요한 부분만 `-s <css>`.
- 금지: 접근 권한 없는 콘텐츠, robots.txt·약관 위반, 페이월·인증 우회, 개인·민감 정보 수집. 대량 크롤링은 지연을 둔다.

### skill: scientific
- 지침: `ai/gon/skills/repos/scientific-agent-skills/README.md` (! 177개 중 해당 스킬만 연다)
- 절차: README의 Skill Categories에서 분야(생물정보·임상·통계 등)를 찾고 → `ai/gon/skills/repos/scientific-agent-skills/skills/<이름>/SKILL.md` 하나만 연다 → 그 스킬의 의존성·검증 범위를 따른다.

### skill: k-skill
- 지침: `ai/gon/skills/repos/k-skill/AGENTS.md` (! 132개 하위 스킬 — 요청에 맞는 폴더 하나만 연다)
- 언제: 한국 서비스·공공데이터 조회(법령, 판례, 부동산, 날씨, 교통, 쇼핑, 주식, DART 공시 등)와 한국 실무 양식(HWP 등).
- 절차:
  1. `ls ai/gon/skills/repos/k-skill`에서 맞는 폴더를 찾는다(예: `korean-law-search`, `k-dart`, `korea-weather`, `real-estate-search`, `hwp`, `korean-spell-check`).
  2. 그 폴더의 `instruction.md`(사이트별 절차)와 `skill.json`을 읽는다. `SKILL.md`는 생성된 안내 파일이다.
  3. 도구 실행 전 `npx -y @nomadamas/k-skill@0 update`로 CLI 버전을 확인하고, 스크립트는 `npx -y @nomadamas/k-skill@0 exec <skill> scripts/<file> -- …`, 참고 문서는 `… read <skill> references/<file>`로 연다.
- 주의: API 키가 필요한 스킬은 키가 없으면 사용자에게 알린다.

### skill: agency-agents
- 지침: `ai/gon/skills/repos/agency-agents/README.md` (! 약 325개 — 폴더를 grep해 직무 파일 1~2개만 연다)
- 언제: 사람 직무 한 명을 맡겨야 하는 일(릴스 기획, 기획전 문구, 영업 제안 등).
- 절차: 분야 폴더(marketing, design, product, sales, finance, security, project-management, paid-media, strategy, support, testing 등)에서 `grep -ril "<직무 키워드>" ai/gon/skills/repos/agency-agents/<폴더>` → 직무 파일의 정체성·미션·워크플로·산출물·성공 지표를 읽는다 → 그 역할로 작업한다.
- 주의: 원문이 영어여도 산출물은 한국어로 쓴다.

### skill: prompts-chat
- 지침: `ai/gon/skills/repos/prompts-chat/plugins/claude/prompts.chat/skills/prompt-lookup/SKILL.md`
- 언제: 역할별 프롬프트 템플릿 검색·개선.
- 절차: prompts.chat MCP의 `search_prompts`(query, limit, type, category) → `get_prompt`(id, 변수 `${var}` 채우기) → `improve_prompt`. MCP가 연결돼 있지 않으면 사용자에게 알리고 직접 프롬프트를 다듬는다. 직접 쓰라고 하기 전에 먼저 검색한다.

### skill: im-not-ai
- 지침: `ai/gon/skills/repos/im-not-ai/skills/humanize-korean/SKILL.md` (346줄 — Phase 순서를 따른다)
- 언제: AI가 쓴 한국어 글을 사실·수치 그대로 두고 자연스럽게 윤문.
- 절차:
  1. Phase 0: 경로 결정. 사용자가 "정밀하게/--strict"면 heavy, "가볍게"면 light, 아니면 Phase 1 입력 shim이 계산한 `route_hint`(light|standard|heavy), 없으면 standard. 글 길이로 경로를 바꾸지 않는다.
  2. Phase 1: 입력 저장과 정량 사전 점수.
  3. 경로 실행: light(1회), standard(2회), heavy(진단 → 겨냥 윤문 → 구조 게이트 → finalize).
  4. 구조 게이트(결정적 검증)와 finalize.
  5. 결과 4가지: 한 줄 상태(경로/변경률/등급/자체검증 N/6), 윤문본, 요약 표, 등급 B 이하면 heavy 재실행 안내.
- 주의: 내용은 한 글자도 바꾸지 않는다. 스크립트 경로 규칙(`${SKILL_ROOT}`)은 지침 파일이 있는 폴더.

### 2.6 검증·보안·분석

### skill: court
- 지침: `ai/gon/skills/repos/court-skill/skills/court/SKILL.md` (! 비용이 크다 — 중요 결정·최종 산출물에만)
- 언제: 사용자가 반론·검증을 원하거나 중요한 결정일 때.
- 절차:
  1. 규모: 플래그(`--jury N` 3~12, `--quick`=6명, `--seed`)를 정하고 `python ai/gon/skills/repos/court-skill/skills/court/court.py plan …`으로 규모를 사용자에게 한 줄로 알린다. 사용자가 요청하지 않았으면 먼저 묻는다.
  2. 사건 파일: `.court/case.md`. 첫 줄은 사건 한 문장(사용자 말 그대로), 이어서 사용자가 준 사실만. 내 의견·없는 사실을 넣지 않는다.
  3. `court.py init --case-file .court/case.md [--jury N|--quick]`.
  4. 재판: `court.py next`가 단계(opening → rebuttal → jury → judge)와 명령을 알려 준다. 단계마다 `court.py prompts <phase>`가 brief를 쓰고, 각 brief를 **서로 독립된 실행**이 읽고 따른다. Claude는 서브에이전트로 돌린다. Codex·Gemini는 brief마다 별도 비대화 실행(`codex exec "Read <brief> and follow it exactly."` / `gemini -p …`)으로 돌린다. 이 방식은 2026-10-29 기준 실제로 시험하지 않았다. 한 실행 안에서 brief를 직접 연기하면 독립 배심이 아니므로 하지 않는다.
  5. 끝나면 `court.py render` → `VERDICT.md`의 판결·투표표·판사 의견을 그대로 보여 준다. 판결을 바꾸거나 누그러뜨리지 않는다.
- 주의: 독립 실행을 할 수 없으면 court를 쓰지 말고 그 사실을 사용자에게 말한다.

### skill: strix
- 지침: `ai/gon/skills/repos/strix/skills/owasp-top-10-testing/SKILL.md` (! 본인 소유·승인된 대상만)
- 절차: OWASP Top 10:2025 기준. 소스 + 실행 중 인스턴스 + 권한이 다른 계정 2~3개를 주고 `strix -n -t <repo> -t <staging> --scan-mode deep --instruction "…"`. 결과 `strix_runs/<run>/vulnerabilities/*.md`를 범주별로 묶어 시도한 것 / 증명된 것 / 평가 못 한 것(A09는 항상)을 적는다. PoC는 직접 확인한 뒤 보고한다. 수정 후 재시험.
- 금지: 외부 서비스·제3자 대상.

### skill: rea
- 지침: `ai/gon/skills/repos/rea/.agents/skills/reverse-engineer-anything/SKILL.md` (! 합법적 분석만)
- 절차: 대상 유형으로 첫 도구를 고른다(Electron/JS는 `analyze_javascript_application`, 바이너리·패키지는 `open_binary`) → 요약부터(`detail: "summary"`) 보고 필요한 부분만 펼친다 → 근거와 함께 쉬운 말로 설명 → 열었던 세션은 `close_binary`로 닫는다. 일반 소스 저장소의 구조 분석에는 쓰지 않는다(graphify).
- 금지: 상용 소프트웨어 복제, 보호 조치 우회(Munder Difflin 복제 요청은 거절됨).

### 2.7 도구·메타

### skill: skill-observer
- 지침: `ai/gon/skills/local/skill-observer/SKILL.md`
- 기록: 스킬 규칙이 어겨졌을 때, 사용자가 스킬대로 한 결과를 고쳐 줬을 때, 스킬 내용이 실제와 다를 때(낡은 지침), 고른 스킬이 맞지 않았을 때, 같은 순서를 반복했을 때(`new:<이름>`). 일반화 테스트 4문항(다른 프로젝트에도? 다른 작업에도? 빠진 규칙을 가리키나? 다시 일어날 근거?)을 통과한 것만 `gon observe --by <이름> <대상> "<무엇이 / 근거 / 필요한 규칙>"`.
- 점검: `gon review` → 본문을 읽고 대상별로 개수를 세어 분류 → 사용자에게 개수와 고칠 방향을 보이고 승인받기 → 로컬 스킬은 SKILL.md 수정, 외부 스킬은 레지스트리 `guard`·`use_for`만 수정, `new:`는 `gon learn` → `gon review --done <대상> "<한 일>"`.
- 같은 규칙이 두 번 어겨지면 문구를 키우지 말고 장치(검증 명령, 체크리스트, 자동 검사)로 바꾼다.

### skill: grill-me
- 지침: `ai/gon/skills/repos/mattpocock-skills/skills/productivity/grilling/SKILL.md` (grill-me는 이 스킬을 부르는 얇은 진입점)
- 언제: 요청이 모호하거나 클 때, 팀을 꾸리거나 일을 시작하기 전. 인사·짧은 질문·이미 구체적인 요청에는 쓰지 않는다.
- 절차: 결정 트리를 그린다 → 앞선 결정이 필요 없는 질문(frontier)을 한 라운드에 모아 번호를 붙이고 질문마다 추천 답을 단다("네"로 받아들일 수 있게) → 답을 받으면 트리를 다시 계산해 다음 라운드 → frontier가 비면 끝. 환경 사실은 직접 찾고 사용자에게 묻지 않는다. 사용자가 이해가 맞다고 확인하기 전에는 실행하지 않는다.
- 서비스: `core/interview.py`가 같은 규칙으로 최대 두 번(간단 모드는 한 번)·한 번에 질문 4개까지 묻고 확정 명세(brief)를 팀에 넘긴다.

### skill: find-skills
- 지침: `.agents/skills/find-skills/SKILL.md`
- 언제: 레지스트리에 없는 기능이 필요할 때.
- 절차: 필요 파악 → skills.sh 리더보드 확인 → `npx skills find <질문>` → 품질 확인(설치 1K+, 출처 평판, 저장소 별 100+) → 사용자에게 선택지 제시 → 동의하면 `npx skills add <owner/repo@skill> -g -y`.
- 이 저장소에서는 `gon find`(검색)와 `gon add-skill`(받기·레지스트리 등록·skills-sync)로 같은 일을 한다. 설치는 사용자에게 알린 뒤(GON.md). 등록한 뒤에는 이 문서에 `### skill:` 절을 추가한다.

### skill: vercel-skills
- 지침: `ai/gon/skills/repos/vercel-skills/README.md`
- 절차: Node 22.20+. `npx skills add <source> [--skill <이름>] [-a <agent>] [-g]`, `find`, `list`, `use <source>@<skill>`(설치 없이 한 번), `check`, `update`, `remove`, `init <이름>`.

### skill: mcp-builder
- 지침: `.agents/skills/mcp-builder/SKILL.md`
- 절차: Phase 1 조사·계획(API 범위 vs 워크플로 도구, 일관된 도구 이름 접두어) → Phase 2 구현(TypeScript 또는 Python 가이드, 공용 API 클라이언트·에러·페이지네이션, Zod/Pydantic 입력 스키마, outputSchema) → Phase 3 검토·테스트(`npm run build` 또는 `python -m py_compile`, `npx @modelcontextprotocol/inspector`) → Phase 4 평가 질문 10개.

### skill: harness2
- 지침: `ai/gon/skills/repos/harness2/README.md`
- 언제: 에이전트 하네스(모델을 둘러싼 시스템) 설계를 참고할 때. 읽을거리다.
- 절차: 8개 구성요소(system prompt, guardrails, memory, tool guidance, subagents, skills, scripts, plugins)를 기준으로 Gon의 구조(GON.md, 레지스트리, 메모리, CLI)를 비교·개선한다. 벤치마크 실행은 Vertex AI 설정이 필요하다.

### skill: freellmapi
- 지침: `ai/gon/skills/repos/freellmapi/README.md` (! 제3자 바이너리 — 실행 전 출처·코드 확인, 계정·API 공유·재판매 금지)
- 언제: 무료 LLM 티어를 하나의 OpenAI 호환 엔드포인트로 묶는 Gon 백엔드 후보를 검토할 때.
- 절차: 설치 스크립트를 파이프로 바로 실행하지 않는다. 스크립트를 먼저 읽고 사용자 승인 후 Docker로 띄운다(http://localhost:3001에서 키 등록).

### skill: anthropic-skills
- 레지스트리 경로(`ai/gon/skills/repos/anthropics-skills/skills`)가 이 PC에 없다(2026-10-29). docx·pdf·pptx·xlsx 제작이 필요하면 `gon fetch anthropic-skills` 후 해당 하위 폴더의 SKILL.md 하나만 연다.

### 외부 항목 (스킬 아님)
- `designmd-extension`: 웹사이트 스타일을 DESIGN.md로 추출하는 크롬 확장. 사용자가 직접 쓴다.
- `pixel-office`: 에이전트 상태 시각화 가이드 글. 읽을거리.

## 3. 프롬프트 전문가 (`ai/gon/prompt/`)

서비스(`user/backend/app/core/experts.py`)는 아래 셋을 전문가로 쓴다. 에이전트도 같은 일을 받으면 파일을 열어 그대로 따른다.

| 파일 | 역할 | 언제 |
|---|---|---|
| `기업분석.md` | 기업·직무 분석가 | 지원 기업·직무를 채용 컨설턴트·현직자·산업 애널리스트 관점으로 분석 |
| `천재적_사고.md` | 창의적 사고 코치 | 사고법 두 개를 골라 분석(1500자+) 후 아이디어 10개 이상 |
| `지식화.md` | 프롬프트 지식화 | 사용자 프롬프트를 구조화된 지식 문서로 정리 |

그 밖의 파일: `outranks everything below.md`(Core 1~4, 항상 최우선), `루프엔지니어링.md`(반복 업무를 SKILL.md로 뽑는 인터뷰, `gon learn` 때), `자기개선.md`, `대본_이미지화.md`(지식 쇼츠 T2V 프롬프트), `자료분석_대본생성.md`(쇼츠 대본), `색감조합.md`, `화면디자인.md`, `orbs.md`(UI 효과 설치 메모).

## 4. 이 문서 유지

- 스킬을 추가·삭제하면 레지스트리, `user/backend/app/core/experts.py`의 `NAMES`, 풀 개수를 적은 문서(README, user/docs/ARCHITECTURE.md)와 함께 **이 문서의 해당 절**도 맞춘다.
- 이 문서와 원문 지침이 다르다는 것을 발견하면 원문을 따르고 `gon observe`로 남긴다.
