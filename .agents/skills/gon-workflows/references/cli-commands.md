# Gon CLI 명령어 상세 워크플로우 가이드 (Codex & Antigravity)

> 이 문서는 Codex CLI 및 Google Antigravity(Gemini) 환경에서 Gon CLI 명령어들을 호출하고, 그 출력을 기반으로 의사결정을 내리며 후속 작업을 이어가기 위한 실행 워크플로우 명세서입니다.
> 모든 명령은 저장소 루트에서 `python -I ai/gon/gon.py <명령>` 형식으로 실행합니다.

---

## 1. 명령어 요약 매트릭스

| 명령어 | 실행 시점 | 주요 역할 | 주요 출력 및 효과 |
|---|---|---|---|
| `gon recent [n]` | 작업 시작 직후 (필수) | 작업 이력 및 변경점 확인 | 최근 이력, git log, uncommitted diffs, 코어 스킬 |
| `gon catalog` | 스킬 탐색 시 | 등록된 전체 스킬 목록 조회 | 47개 스킬의 `id \| 용도` 및 태그 목록 |
| `gon pick <id...> [--dev]` | 스킬 적용 결정 시 | 스킬 지침 경로 반환 및 자동 설치 | 지침 파일 경로, 항상 적용 핵심(`karpathy` 등) 발췌문 |
| `gon fetch <id\|all>` | 저장소 누락 시 | 스킬 원본 저장소 git clone | `ai/gon/skills/repos/`에 shallow clone |
| `gon skills-sync` | 스킬 변경/설치 후 | 스킬 안내 파일 동기화 | `.claude/skills` 및 `.agents/skills`에 SKILL.md 생성 |
| `gon log --by <ai> "<내용>"` | 파일 변경 작업 종료 시 | 작업 이력 영구 기록 | `ai/gon/memory/HISTORY.md`에 이력 및 변경 파일 첨부 |
| `gon remember "<내용>"` | 영구 선호/규칙 획득 시 | 장기 기억 반영 | `ai/gon/memory/MEMORY.md`에 결정사항 추가 |
| `gon observe --by <ai> <id> "<내용>"` | 스킬 결함/개선 발견 시 | 스킬 관찰 기록 | `ai/gon/memory/observations.md`에 기록 (2회 이상 시 review) |
| `gon review [--done ...]` | 관찰 2건 이상 누적 시 | 스킬 개선 검토 및 종결 | 누적 관찰 출력 또는 작업 완료 마킹 |
| `gon learn <id> "<용도>" "<트리거>"` | 5회 이상 반복 성공 작업 시 | 신규 로컬 스킬 뼈대 생성 | `ai/gon/skills/local/<id>/SKILL.md` 및 레지스트리 등록 |
| `gon doctor` | 환경/서비스 점검 시 | 저장소, 포트, 도구 상태 진단 | 스킬 수, 서비스 상태, CLI 도구 점검 보고 |
| `gon run [--no-open]` | 서비스 시작 시 | 백엔드(8000) + 프론트(5173) 기동 | 서버 구동 및 헬스체크 |
| `gon stop` | 서비스 종료 시 | 실행 중인 백엔드/프론트 중지 | 포트 해제 및 프로세스 종료 |
| `gon install` | 최초 셋업 시 | 전역 명령어 등록 및 셋업 | 도구별 전역 커맨드 및 안내 생성 |
| `gon always on\|off` | 상시 적용 설정 시 | 전역 시스템 프롬프트 활성화 | `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md` 등 설정 |

---

## 2. 세부 명령어 실행 워크플로우

### 2.1 `gon recent [n]` (작업 시작 전 필수)
- **목적**: 이전 에이전트/사용자의 작업 맥락을 끊김 없이 이어받고, 충돌을 방지합니다.
- **실행**: `python -I ai/gon/gon.py recent` (최근 n개 이력 조회, 기본값 3)
- **내부 워크플로우**:
  1. `ai/gon/memory/HISTORY.md`의 최근 3개 작업을 읽습니다.
  2. `git status` 및 `git diff`를 실행하여 현재 커밋되지 않은 변경사항을 수집합니다.
  3. `git log -n 3 --oneline`으로 최근 커밋 이력을 확인합니다.
  4. 개발 코어 스킬(`[핵심-항상]`, `[개발 코어]`) 및 열려 있는 스킬 관찰 목록을 표시합니다.
- **Codex / Antigravity 후속 행동**:
  - 이력에 적힌 작업은 취소하지 않고 이어받습니다.
  - 이력에 없는 uncommitted 변경 파일이 있다면 임의로 덮어쓰거나 지우지 말고 `git diff <파일>`로 먼저 변경 의도를 파악합니다.
  - 다른 AI(예: Claude)가 최근 몇 분 내에 수정한 파일은 충돌 방지를 위해 동시에 수정하지 않습니다.

---

### 2.2 `gon catalog`
- **목적**: 현재 작업 요구사항에 적합한 스킬 후보를 탐색합니다.
- **실행**: `python -I ai/gon/gon.py catalog`
- **내부 워크플로우**:
  1. `ai/gon/registry/skills.json`을 로드합니다.
  2. 각 스킬의 `id`, `용도(use_for)`, 분류 태그(`[항상 적용]`, `[개발 코어]`, `[코드·UI 작업]`)를 정렬하여 한 줄씩 출력합니다.
- **Codex / Antigravity 후속 행동**:
  - 키워드 매칭에 의존하지 않고, 작업의 목적과 필요한 기능에 부합하는 스킬을 1~3개 선정합니다.
  - 선정 이유를 한 줄로 설명할 수 없는 스킬은 제외합니다.

---

### 2.3 `gon pick <id> [id...] [--dev]`
- **목적**: 선택한 스킬의 원본 지침 파일 경로와 발췌문을 확보하고, 누락된 저장소를 자동 다운로드합니다.
- **실행**:
  - 일반 작업: `python -I ai/gon/gon.py pick <스킬id>`
  - 코드/UI 작업: `python -I ai/gon/gon.py pick --dev <스킬id>`
- **내부 워크플로우**:
  1. 요청된 id의 스킬이 로컬 또는 git 저장소에 존재하는지 검사합니다.
  2. 없는 저장소는 자동으로 `git clone --depth 1`을 수행하여 다운로드합니다.
  3. `[핵심-항상]`(karpathy, ecc-verification, ecc-coding-standards) 발췌문을 기본으로 출력에 포함합니다.
  4. `--dev` 플래그가 있으면 개발 코어(ecc, ponytail, context7, graphify, headroom) 및 프로젝트 UI 스킬을 자동으로 추가합니다.
  5. 지침 파일의 상대 경로와 첫 500자 발췌(`> ...`)를 반환합니다.
- **Codex / Antigravity 후속 행동**:
  - 출력된 `[핵심-항상]` 발췌문의 지침은 예외 없이 준수합니다.
  - 출력된 모든 스킬 파일을 한꺼번에 읽지 말고, 현재 작업 단계에 필요한 파일만 `read_file`로 엽니다.
  - `!`로 시작하는 주의사항(예: "전체를 읽지 않는다", "바이너리 다운로드 전 동의")을 엄수합니다.

---

### 2.4 `gon fetch <id|all>`
- **목적**: 원격 스킬 git 저장소를 `ai/gon/skills/repos/` 아래로 수동 shallow clone합니다.
- **실행**: `python -I ai/gon/gon.py fetch all` 또는 `python -I ai/gon/gon.py fetch <repo-name>`
- **내부 워크플로우**:
  1. `ai/gon/skills/repos.json`에 정의된 git URL을 확인합니다.
  2. Windows 환경의 260자 경로 제한 방지를 위해 `core.longpaths=true` 설정을 적용하여 clone합니다.
  3. 실패 시 불완전한 디렉터리를 롤백 정리합니다.

---

### 2.5 `gon skills-sync`
- **목적**: 스킬 레지스트리의 스킬들을 AI 에이전트 도구 규격(`.claude/skills` 및 `.agents/skills`)으로 자동 생성/동기화합니다.
- **실행**: `python -I ai/gon/gon.py skills-sync`
- **내부 워크플로우**:
  1. Claude Code용 안내 파일(`.claude/skills/<id>/SKILL.md`)을 생성합니다.
  2. Codex 및 Antigravity용 Agent Skills(`.agents/skills/<id>/SKILL.md`)를 Open Agent Skills 표준에 맞추어 생성합니다.
  3. 수동으로 정교하게 제작된 공식 스킬은 보존하고, 레지스트리에서 삭제된 스텁만 정리합니다.

---

### 2.6 `gon log --by <claude|gemini|codex> "<한 줄 요약>"` (작업 종료 시 필수)
- **목적**: 파일을 변경한 작업의 결과를 영구 기록하여 다음 에이전트에게 인수인계합니다.
- **실행**:
  - Antigravity(Gemini): `python -I ai/gon/gon.py log --by gemini "<요약>"`
  - Codex: `python -I ai/gon/gon.py log --by codex "<요약>"`
- **작성 규칙**:
  `한 일 / 결과 / 확인한 것·못 한 것 / 다음 사람이 알아야 할 인수인계`
- **내부 워크플로우**:
  1. 현재 작업 트리의 uncommitted 변경 파일(`git status --porcelain`)을 자동으로 감지합니다.
  2. 타임스탬프, 작성자, 메시지, 변경 파일 목록을 `ai/gon/memory/HISTORY.md` 상단에 추가합니다.
  3. 최근 이력이 30개를 초과하면 오래된 항목을 자동 아카이빙합니다.

---

### 2.7 `gon remember "<한 줄 요약>"`
- **목적**: 세션이 종료된 후에도 지속되어야 하는 사용자 선호, 아키텍처 결정사항, 교정된 지식을 영구 보관합니다.
- **실행**: `python -I ai/gon/gon.py remember "사용자 선호: 버튼 애니메이션 시간은 200ms 고정"`
- **내부 워크플로우**:
  1. `ai/gon/memory/MEMORY.md`의 `## 사용자 선호 및 프로젝트 결정사항` 섹션에 불릿 포인트로 추가합니다.
- **주의사항**:
  - 이번 일회성 대화에만 국한된 내용, 임시 데이터, 비밀번호, API 키 등은 절대 기록하지 않습니다.

---

### 2.8 `gon observe --by <ai> <id|new:이름> "<한 줄>"`
- **목적**: 스킬 지침이 현실과 다르거나(낡은 지침), AI가 지침을 위반했거나, 사용자 교정이 발생했을 때 관찰 사항을 기록합니다.
- **실행**: `python -I ai/gon/gon.py observe --by gemini taste "하우스 규칙 중 그라디언트 허용 플래그가 빠져 있음"`
- **내부 워크플로우**:
  1. `ai/gon/memory/observations.md`에 관찰 로그를 추가합니다.
  2. 동일 대상에 대해 누적 관찰이 2개(`REVIEW_AT = 2`) 이상 쌓이면 `gon review` 권고를 출력합니다.

---

### 2.9 `gon review [--done <대상> "<내용>"]`
- **목적**: 누적된 스킬 이슈를 확인하고 개선 조치를 취한 뒤 종결합니다.
- **실행**:
  - 조회: `python -I ai/gon/gon.py review`
  - 종결: `python -I ai/gon/gon.py review --done <대상> "<조치 내용>"`
- **내부 워크플로우**:
  1. 대상별로 아직 미해결된 관찰 목록을 그룹화하여 보여줍니다.
  2. `--done` 플래그로 조치 내역을 남기면 해당 대상의 관찰을 해결 완료 처리합니다.

---

### 2.10 `gon doctor`
- **목적**: 전체 시스템 상태(스킬 수, 저장소 상태, 서비스 프로세스, 도구 CLI, 설정 파일)를 종합 진단합니다.
- **실행**: `python -I ai/gon/gon.py doctor`
- **진단 항목**:
  - Gon 루트 디렉토리 유효성
  - 등록된 스킬 수 및 clone된 저장소 수
  - 깨진 스킬 경로 유무
  - 백엔드(8000) 및 프론트엔드(5173) 포트 활성화 여부
  - `git`, `agy`, `claude`, `gemini`, `codex` CLI 바이너리 존재 여부
  - 전역 커맨드 및 상시 적용 설정 파일 유효성

---

### 2.11 `gon run [--no-open]` 및 `gon stop`
- **목적**: 서비스(FastAPI 백엔드 + Vite React 프론트엔드)를 구동하거나 종료합니다.
- **실행**:
  - 에이전트 백그라운드 구동: `python -I ai/gon/gon.py run --no-open`
  - 서비스 종료: `python -I ai/gon/gon.py stop`
- **내부 워크플로우**:
  1. Python 백엔드 패키지(`fastapi`, `uvicorn`) 및 Node 패키지 의존성을 점검하고 필요시 자동 설치합니다.
  2. 누락된 스킬 저장소가 있으면 자동 fetch합니다.
  3. 백엔드(:8000)와 프론트엔드(:5173)를 서브프로세스로 실행합니다.
  4. `http://127.0.0.1:8000/health` 및 `http://localhost:5173/` 헬스체크를 수행합니다.
