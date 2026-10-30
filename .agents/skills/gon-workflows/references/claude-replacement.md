# Claude 전용 도구 및 기능의 Codex & Antigravity 대체 가이드

> 원본 스킬 지침(Claude Code 기준)에 포함된 Claude 전용 기능과 도구 호출을 Codex CLI 및 Google Antigravity 환경에서 완벽하게 대체하여 실행하기 위한 매핑 및 행동 가이드입니다.

---

## 1. 도구 및 기능 매핑 테이블

| Claude Code 기능 | Antigravity (Gemini) 대체 도구/방법 | Codex CLI 대체 방법 |
|---|---|---|
| `AskUserQuestion` 도구 | `ask_question` 도구 또는 1, 2, 3 번호 목록 질문 | 번호 목록으로 선택지 제시 (1번에 추천안 배치) |
| 서브에이전트 병렬 실행 (`Agent(...)`) | `invoke_subagent` (role/type/prompt) 또는 순차 도구 호출 | 순차 도구 실행 또는 `codex exec` 비대화 프로세스 분리 |
| `${CLAUDE_SKILL_DIR}` | 해당 스킬 지침 파일이 위치한 디렉토리 절대/상대 경로 | 해당 스킬 폴더 기준 상대 경로 |
| 브라우저 도구 (`claude-in-chrome`) | `skill: agent-browser` CLI 또는 Playwright 도구 | `skill: agent-browser` CLI (`npx agent-browser ...`) |
| `$ARGUMENTS` 매개변수 | 사용자가 프롬프트에서 전달한 입력 문자열 | 프롬프트 인자값 |
| 슬래시 커맨드 (`/<스킬>`) | `ai/gon/WORKFLOWS.md`의 `### skill:` 절 직접 실행 | `ai/gon/WORKFLOWS.md`의 `### skill:` 절 직접 실행 |
| 대화 압축 / 정리 | `/compact` 권장 안내 또는 컨텍스트 수동 요약 | 새 세션 또는 요약 프롬프트 |

---

## 2. 상세 대체 워크플로우

### 2.1 사용자 질문 (`AskUserQuestion`) 대체
- **문제**: Claude는 구조화된 모달 UI로 질문하는 `AskUserQuestion` 도구를 사용합니다.
- **Antigravity 대체법**:
  - 다지선다 질문이 명확할 때: 내장 도구 `ask_question`을 호출합니다.
    ```json
    {
      "questions": [{
        "question": "어떤 디자인 방향을 선호하시나요?",
        "options": ["(Recommended) 미니멀 모노크롬", "컬러풀 비비드", "다크 테크"],
        "is_multi_select": false
      }]
    }
    ```
  - 단순 확인 또는 개방형 질문: 일반 마크다운 텍스트로 번호 목록을 출력하고 입력을 기다립니다. 항상 1번 옵션에 `(Recommended)`를 붙입니다.
- **Codex 대체법**:
  - 일반 마크다운 텍스트로 명확한 번호 목록을 출력하고 사용자 입력을 대기합니다.

---

### 2.2 서브에이전트 병렬 호출 대체
- **문제**: Claude 지침(예: `court`, `graphify`, `ecc-e2e`)은 다수의 서브에이전트를 동시 스폰하는 코드가 있습니다.
- **Antigravity 대체법**:
  - 작업 분리가 필수적인 경우(예: 코드베이스 리서치, 심층 검증): 내장 `invoke_subagent` 도구를 사용합니다.
    - TypeName: `research` (읽기 전용 조사) 또는 `self` (작업 위임)
    - 완료 알림이 자동으로 오므로 폴링하지 않고 대기합니다.
  - 일반적인 경우: 부모 에이전트가 단일 스레드로 단계별 순차 실행을 진행합니다.
- **Codex 대체법**:
  - 독립된 컨텍스트가 필수적인 경우(예: `court` 배심원 평가):
    `codex exec "Read .court/briefs/jury_01.md and follow it exactly."`처럼 백그라운드 프로세스로 실행합니다.
  - 그 외 작업: 파일들을 순차적으로 읽고 직접 작업을 처리합니다.

---

### 2.3 스킬 기준 경로 (`${CLAUDE_SKILL_DIR}`) 해결
- **문제**: Claude 지침 내에 `${CLAUDE_SKILL_DIR}/scripts/...` 형태의 셸 명령어가 포함되어 있습니다.
- **해결 절차**:
  1. `python -I ai/gon/gon.py pick <id>`를 실행하여 해당 스킬의 실제 파일 경로를 얻습니다.
  2. 예: `karpathy` -> `ai/gon/skills/repos/andrej-karpathy-skills/skills/karpathy-guidelines/SKILL.md`
  3. 해당 파일이 속한 상위 폴더를 기준 디렉토리로 해석하여 스크립트를 호출합니다:
     - 예: `node ai/gon/skills/repos/.../scripts/draw.mjs`

---

### 2.4 브라우저 상호작용 (`claude-in-chrome`) 대체
- **문제**: Claude 전용 브라우저 확장 도구를 호출하는 스킬(`taste`, `agent-browser`, `impeccable`).
- **해결 절차**:
  - 프로젝트 내에 설치된 `agent-browser` 스킬을 활용합니다:
    ```powershell
    # 브라우저 열기 및 이동
    agent-browser open "http://localhost:5173"
    # 화면 스크린샷 캡처
    agent-browser screenshot "ai/workspace/screenshots/current_view.png"
    # 요소 클릭 및 타이핑 (실제 키 이벤트)
    agent-browser click "#submit-btn"
    agent-browser type "#input-box" "테스트 텍스트"
    ```
  - 작업 부산물(스크린샷)은 반드시 `ai/workspace/screenshots/` 아래에 저장합니다.

---

### 2.5 프롬프트 및 CLI 명령어 직접 실행
- **문제**: `/gon catalog`, `/karpathy`처럼 슬래시 커맨드를 호출하라는 지침.
- **해결 절차**:
  - Codex와 Antigravity는 저장소 루트의 `ai/gon/gon.py` 파이썬 CLI를 직접 실행합니다:
    `python -I ai/gon/gon.py <명령어>`
  - 스킬 적용은 [references/skills-workflows.md](file:///C:/Users/aicam/Desktop/수업_AX_W/수업/side_pj/.agents/skills/gon-workflows/references/skills-workflows.md)의 단계별 절차를 순서대로 이행합니다.
