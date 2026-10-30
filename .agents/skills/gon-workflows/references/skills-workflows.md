# Gon 45개 스킬별 실행 워크플로우 명세서 (Codex & Antigravity)

> 이 문서는 Codex CLI 및 Google Antigravity에서 Gon의 45개 스킬을 직접 활용할 수 있도록, 각 스킬의 트리거 조건, 단계별 실행 워크플로우, 실행 명령어, 완료 기준, 주의사항을 집약한 런북입니다.
> 원문 지침: `ai/gon/WORKFLOWS.md` 및 `ai/gon/skills/repos/` 내 개별 지침 파일.

---

## 1. 항상 적용 핵심 (`[핵심-항상]`)

모든 코드 수정 및 기능 구현 시 프롬프트에서 별도 지정하지 않아도 기본 적용되는 불변 원칙입니다.

### 1.1 `karpathy`
- **역할**: 코드 작성·수정 시 극도의 단순함 유지, 요청 범위만 최소 수정.
- **언제**: 모든 코드 작성, 수정, 리팩토링, 버그 수정.
- **단계별 워크플로우**:
  1. **가정 명시**: 코딩 전 작업 해석이 여럿이면 임의로 고르지 말고 명시한다. 더 단순한 대안이 있으면 제안한다.
  2. **최소 변경**: 요청한 내용만 최소한의 코드로 구현한다. 불필요한 추상화, 확장성 대비 코드, 조기 최적화를 절대 추가하지 않는다.
  3. **지역적 수정**: 수정 대상 함수/라인만 고친다. 인접 코드 정리나 포맷팅 개선을 자의적으로 하지 않는다.
  4. **목표 검증화**: 작업을 검증 가능한 테스트/실행 단계(`단계 -> 확인 방법`)로 치환하여 실행한다.
- **완료 기준**: 변경된 모든 코드 라인이 사용자의 요청 내용으로 100% 설명 가능할 것.
- **주의사항**: 사용되지 않는 기존 코드를 임의로 삭제하지 않는다.

---

### 1.2 `ecc-verification`
- **역할**: 기능 구현 및 수정 완료 후 실행하는 종합 품질/안정성 검증 루프.
- **언제**: 코드 작성/수정 완료 시점, 커밋/PR 전.
- **단계별 워크플로우**:
  1. **프론트엔드 빌드**: `cd user/frontend && npm run build` (실패 시 즉시 중단 및 원인 수정)
  2. **프론트엔드 타입 체크**: `cd user/frontend && npx tsc --noEmit`
  3. **백엔드 테스트**: `cd user/backend && python -m pytest -q`
  4. **보안/위생 점검**: 소스 코드 내 API 키(`sk-`, 토큰, 패스워드) 및 불필요한 `console.log` 잔여 확인 (`grep` 또는 파일 검색)
  5. **변경 범위 점검**: `git diff --stat`으로 사용자가 의도한 파일만 변경되었는지 확인.
- **완료 기준**: 보고 양식 출력 (각 항목별 PASS/FAIL 기재):
  `Build / Types / Lint / Tests (X/Y) / Security / Diff (N files) / Overall: READY`

---

### 1.3 `ecc-coding-standards`
- **역할**: 클린 코드 및 코드 품질 기본 규칙 준수.
- **언제**: 모든 코드 구현 및 리팩토링.
- **단계별 워크플로우**:
  1. **우선순위 준수**: 가독성(Readability) → 단순성(KISS) → 중복제거(DRY) → 불필요제거(YAGNI) 순으로 설계.
  2. **명명 규칙**: 변수, 함수명은 축약하지 않고 의도를 드러내는 명확한 단어로 작성.
  3. **불변 갱신**: 객체 및 배열 조작 시 스프레드 연산자 등을 통한 불변성 유지.
  4. **에러 처리**: 예외를 빈 catch문으로 삼키지 않고 적절한 로깅/반환 처리.
- **완료 기준**: 긴 함수(50줄 이상), 깊은 중첩(3단계 이상), 매직 넘버가 새로 생성되지 않음.

---

## 2. 개발 코어 (`--dev`)

`python -I ai/gon/gon.py pick --dev` 실행 시 기본 세트로 제공되는 개발/엔지니어링 스킬군입니다.

### 2.1 `ponytail`
- **역할**: 코드 감사, 리뷰, 기술부채 점검, 과잉 엔지니어링 방지.
- **언제**: 코드 리뷰, 복잡한 기능 구현 전 구조 설계, "가장 단순하게" 구현할 때.
- **단계별 워크플로우**:
  1. 변경 대상 코드와 호출부, 테스트, 설정 파일의 연쇄 영향 범위를 파악한다.
  2. 5단계 최소 구현 원칙 적용:
     - 만들지 않아도 되는가? → 기존 프로젝트 코드 재사용 → 언어 표준 라이브러리 → 기설치된 의존성 → 최소 신규 코드.
  3. 버그 수정 시 동일 패턴의 함수 호출부를 전역 검색(`grep`)하여 근본 원인을 한 번에 해결.
  4. 한계가 있는 임시 해결책을 쓸 경우 `shortcut: <한계>, <개선시점>` 주석을 남긴다.
- **주의사항**: 보안 검증, 에러 처리, 접근성은 단순화의 대상에서 제외한다.

---

### 2.2 `context7`
- **역할**: 최신 라이브러리 공식 문서 및 API 스펙 실시간 조회.
- **언제**: 새로운 npm/pip 패키지 도입 시, API 버전 변경으로 인한 문법 확인 필요 시.
- **단계별 워크플로우**:
  1. 라이브러리 ID 검색: `npx ctx7@latest library <라이브러리명> "<질문>"` (ID 형식: `/owner/repo`)
  2. 공식 문서 추출: `npx ctx7@latest docs <라이브러리ID> "<궁금한 기능>"`
  3. 일괄 검색: `npx ctx7@latest search "<질문>"`
- **완료 기준**: 학습 데이터의 가정이 아닌 조회된 최신 API 시그니처대로 코드 작성.

---

### 2.3 `graphify`
- **역할**: 코드베이스의 AST(추상구문트리) 및 파일 관계를 분석하여 지식 그래프 및 관계망 시각화.
- **언제**: 처음 보는 대규모 모듈 분석, 의존성 흐름 파악.
- **단계별 워크플로우**:
  1. `graphify-out/` 디렉터리가 이미 있는지 확인.
  2. 그래프 질의: `graphify query "<구조 질문>"` (전체 탐색) 또는 `--dfs` (경로 추적).
  3. 갱신 필요 시: `graphify --update`.
- **주의사항**: 도구가 미설치된 경우 사용자에게 설치 여부를 먼저 묻는다.

---

### 2.4 `headroom`
- **역할**: 대량 로그 및 터미널 출력 토큰 압축 프록시.
- **언제**: 긴 빌드 로그, 대용량 파일 검사로 토큰 낭비가 우려될 때.
- **단계별 워크플로우**:
  1. 우선 표준 셸 필터(`| tail -n 50`, `| grep ...`)로 1차 축약.
  2. 세션 프록시 필요 시: `headroom wrap codex` 실행.

---

### 2.5 `ecc`
- **역할**: 1,000개 이상의 상황별 개발 패턴/체크리스트 컬렉션.
- **언제**: 특정 프레임워크나 특수 도메인 패턴 검색 시.
- **단계별 워크플로우**:
  1. 전체를 열지 않고 `grep -ril "<키워드>" ai/gon/skills/repos/ECC/skills` 실행.
  2. 일치하는 단일 폴더의 `SKILL.md` 파일만 `read_file`로 확인.

---

## 3. 코드·UI 작업 (`[코드·UI 작업]`)

### 3.1 `taste` (`design-taste-frontend`)
- **역할**: AI 특유의 클리셰("AI-slop")를 배제한 최고급 프론트엔드 아트 디렉션 및 UI 구현.
- **언제**: 랜딩 페이지, 대시보드, 앱 화면 신규 제작 및 리디자인.
- **단계별 워크플로우**:
  1. **화면 성격 규정**: 읽고 스크롤하는 '페이지'인가, 작업하는 '앱 화면'인가? (Gon 서비스는 앱 화면)
  2. **방향 도출**: `node .agents/skills/design-taste-frontend/scripts/draw.mjs --app --brief "<요구사항>" --screens "<화면명>" --options 3`
  3. **하우스 룰 준수**:
     - 서체 2종 이내, 2줄 이내 제목, 좌우 대칭 여백.
     - 얇은 구분선 남발, 모노스페이스/인덱스 번호 남용, 저품질 유리효과 금지.
     - 순수 블랙(#000) 대신 짙은 차콜, 형광 원색 대신 정제된 징크/뉴트럴 팔레트.
  4. **검사 및 검증**:
     - `node .agents/skills/design-taste-frontend/scripts/lint.mjs --app`
     - `node .agents/skills/design-taste-frontend/scripts/inspect.mjs <URL>` (FAIL 0건 달성)

---

### 3.2 `ui-ux-pro-max`
- **역할**: 컴포넌트 디자인 시스템 구축 및 엣지 상태(로딩/빈값/에러), 반응형, 접근성 점검.
- **언제**: UI 시스템 정립, 사용자 인터랙션 흐름 점검.
- **단계별 워크플로우**:
  1. 도메인/업종별 디자인 시스템 조회:
     `python ai/gon/skills/repos/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<제품 업종>" --design-system -p "Gon"`
  2. 세부 패턴 검색: `... search.py "<키워드>" --domain ux|color|typography|chart`
  3. 스택별 구현 팁: `... search.py "<키워드>" --stack react`
- **완료 기준**: 4.5:1 대비, 44px 이상 터치 영역, 가로 스크롤 없음, 스켈레톤 로딩 구현.

---

### 3.3 `impeccable`
- **역할**: UI 마감(Polish), 완성도 감사, 휴리스틱 비평.
- **언제**: 화면 릴리즈 직전 디테일 점검.
- **단계별 워크플로우**:
  1. `ai/gon/skills/repos/impeccable/.claude/skills/impeccable/reference/craft-floor.md` 읽기.
  2. 요청에 맞추어 `polish.md`, `critique.md`, `layout.md` 참조 문서 확인.
  3. 실제 브라우저 렌더링 화면을 스크린샷으로 확인 후 일괄 수정.

---

### 3.4 `ecc-react`
- **역할**: React 18 모던 아키텍처 및 렌더링 최적화 패턴.
- **규칙**: props/state의 순수 함수 렌더링, 상태 끌어올림, 리스트의 안정적 고유 key 지정, 불필요한 `useMemo`/`useCallback` 배제.

---

### 3.5 `ecc-fastapi`
- **역할**: 고성능 비동기 FastAPI 백엔드 아키텍처.
- **규칙**: 라우터는 요청/응답 검증만 수행(얇은 컨트롤러), 비즈니스 로직은 `services/`로 분리, Pydantic v2 스키마 검증, async 엔드포인트 내 동기 블로킹 호출 방지.

---

### 3.6 `ecc-a11y`
- **역할**: 웹 접근성 표준(WCAG) 준수.
- **규칙**: 시맨틱 태그 우선 사용, 폼 필드와 `label`의 `htmlFor` 연결, 아이콘 버튼에 `aria-label`, 모달 포커스 트랩.

---

### 3.7 `ecc-api-design`
- **역할**: RESTful API 설계 및 표준 응답 규격.
- **규칙**: 복수 명사 URI, HTTP Status Code 올바른 사용(생성 201, 유효성 실패 422, 단순 성공 200), 일관된 `{ "data": ..., "error": ... }` JSON 구조.

---

### 3.8 `ecc-code-review`
- **역할**: 작성/수정된 코드의 품질, 잠재 버그, 보안 결함 감사.
- **단계**: `git diff` 수집 → 전체 파일 맥락 확인 → CRITICAL(보안) → HIGH(품질) → MEDIUM(성능) 순 리뷰 → 판정(Approve/Warning/Block).

---

### 3.9 `ecc-security-review`
- **역할**: 보안 취약점 사전 차단.
- **검사 항목**: 비밀값 누출 여부, SQL 파라미터 바인딩, 입력값 살균(Sanitization), XSS/CSRF 방어.

---

### 3.10 `ecc-e2e`
- **역할**: Playwright 기반 E2E 자동화 테스트 작성 및 실행.
- **규칙**: Page Object Model(POM) 준수, 취약한 sleep 대신 이벤트 기반 대기(`waitForSelector`).

---

### 3.11 `ecc-git`
- **역할**: Git 커밋 및 브랜치 관리 워크플로우.
- **규칙**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`), 사용자 요청 시에만 커밋/푸시 수행.

---

## 4. 디자인·모션·비주얼

### 4.1 `awesome-claude-design`
- **역할**: 글로벌 유수 브랜드의 디자인 시스템 및 톤앤매너(`DESIGN.md`) 참조.
- **실행**: `https://getdesign.md/<브랜드>/design-md`에서 토큰/철학 참고. (모방 금지, 톤만 영감)

---

### 4.2 `motion`
- **역할**: 모션 및 인터랙션 타이밍 가이드.
- **원칙**: 생산성 도구 UI는 200~300ms ease-out 준수. `prefers-reduced-motion` 미디어 쿼리 필수 제공.

---

### 4.3 `emilkowalski`
- **역할**: 정교한 마이크로 인터랙션 디테일.
- **원칙**: 진입 시 `scale(0)` 금지 (0.95 + opacity), 팝오버는 트리거 버튼 기준 transform-origin 설정, Before/After/Why 표 작성.

---

### 4.4 `shadergradient`
- **역할**: Three.js 기반 반응형 3D 그라디언트 캔버스.
- **적용처**: `user/frontend/src/components/Backdrop.tsx` (앱 배경 `-z-10`에 고정).

---

### 4.5 `react-three-fiber`
- **역할**: 선언적 Three.js 3D 장면 렌더링.
- **적용처**: `user/frontend/src/components/office3d/` (사무실 씬).
- **주의사항**: 캔버스에 `pointerEvents: 'none'` 적용하여 하위 채팅 인터랙션 차단 방지.

---

### 4.6 `liquid-glass` / `liquid-logo`
- **역할**: WebGL 글래스모피즘 및 리퀴드 메탈 로고 효과.
- **주의사항**: React 프로젝트에서는 순수 CSS/Tailwind 클래스(`.glass`)를 우선 사용하며 로고 원형 훼손 금지.

---

## 5. 리서치·브라우저·데이터

### 5.1 `agent-browser`
- **역할**: 브라우저 CLI를 통한 웹페이지 제어, 폼 입력, 스크린샷 캡처, E2E 검증.
- **실행**:
  - `agent-browser open "http://localhost:5173"`
  - `agent-browser screenshot "ai/workspace/screenshots/test.png"`
- **원칙**: JS DOM 조작 대신 실제 사용자 클릭/키보드 입력 이벤트로 테스트.

---

### 5.2 `playwright-mcp`
- **역할**: Playwright MCP 서버를 통한 브라우저 제어.

---

### 5.3 `firecrawl` / `scrapling`
- **역할**: 웹페이지를 마크다운 텍스트로 정밀 크롤링 및 스크래핑.
- **주의사항**: 개인정보, 인증 세션 우회 크롤링 금지. 적절한 딜레이 부여.

---

### 5.4 `k-skill`
- **역할**: 대한민국 법령, 판례, 부동산, 날씨, DART 공시, HWP 문서 파싱 및 조회.
- **실행**: `npx -y @nomadamas/k-skill@0 exec <스킬명> scripts/<스크립트> -- ...`
- **적용 대상**: `korean-law-search`, `k-dart`, `real-estate-search`, `hwp` 등.

---

### 5.5 `agency-agents`
- **역할**: 325명의 전문 직무 페르소나(기획자, 마케터, 카피라이터 등) 차용.
- **실행**: `grep -ril "<직무명>" ai/gon/skills/repos/agency-agents`로 해당 롤북 확인 후 업무 수행.

---

### 5.6 `prompts-chat`
- **역할**: 입증된 프롬프트 템플릿 검색 및 리라이팅.

---

### 5.7 `im-not-ai`
- **역할**: 기계적인 한국어 번역투/AI 상투어를 자연스러운 한국어 실무 문체로 윤문.
- **원칙**: 사실과 수치는 한 글자도 바꾸지 않고 문체와 호흡만 개선.

---

## 6. 검증·보안·분석

### 6.1 `court`
- **역할**: 중요한 기술/아키텍처 결정 시 반론 배심원단을 구성하여 확증 편향 방지.
- **실행**: `.court/case.md` 작성 → `python ... court.py init` → 단계별 배심원 평결 → `VERDICT.md` 판결문 수렴.
- **Codex/Antigravity**: 비대화 백그라운드 실행으로 배심원 독립성 확보.

---

### 6.2 `strix`
- **역할**: OWASP Top 10 기준 취약점 스캐닝.
- **주의사항**: 인가받은 로컬/스테이징 환경에 한하여 테스트 수행.

---

### 6.3 `rea`
- **역할**: 합법적 리버스 엔지니어링 및 번들 바이너리/Electron 앱 정밀 분석.

---

## 7. 도구·메타

### 7.1 `skill-observer`
- **역할**: 스킬 실행 중 발생한 이상 현상, 지침 불일치, 사용자 교정을 관찰 기록.
- **실행**: `python -I ai/gon/gon.py observe --by <ai> <대상> "<내용>"`
- **기준**: 동일 이슈 2회 누적 시 `gon review`를 통해 영구 규칙으로 개선.

---

### 7.2 `find-skills` / `vercel-skills`
- **역할**: 오픈 스킬 생태계에서 필요한 신규 Agent Skill 검색 및 설치.
- **실행**: `npx skills find "<기능>"` (신규 설치 전 반드시 사용자 승인 획득).

---

### 7.3 `mcp-builder`
- **역할**: 고품질 MCP(Model Context Protocol) 서버 제작 체크리스트 및 가이드.
- **단계**: 도구 범위 정의 → 입력 스키마(Zod/Pydantic) 작성 → 에러 핸들링 → Inspector 검증.

---

### 7.4 `harness2` / `freellmapi` / `anthropic-skills`
- **역할**: 에이전트 하네스 설계 참조, 무료 LLM 백엔드 통합, 오피스 문서(docx, pptx, xlsx) 자동 생성.
