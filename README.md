# Gon

한 줄 요청만으로 AI 전문가 팀이 일하고, 다음엔 더 잘 질문하는 법까지 알려 주는 **전국민 AI 평준화** 프로젝트.

이 저장소 전체가 Gon이다. **서비스**(`user/backend`, `user/frontend`)는 전문가 팀을 꾸려 요청을 처리하고, **에이전트**(`ai/gon`)는 이 프로젝트를 개발·운영하는 비서다. 둘은 같은 스킬 풀을 쓴다.

## 폴더 구조

```
side_pj/
├─ README.md            사람용 소개 (이 파일)
├─ AGENTS.md            모든 AI가 따르는 공통 규칙 (원본)
├─ CLAUDE.md, GEMINI.md AGENTS.md를 불러오는 도구별 진입점
├─ .claude/ .gemini/ .agents/   AI 도구 설정 (도구가 루트에서만 찾는다)
├─ install.*, gon.*, run.*      설치·실행 스크립트
│
├─ user/                ← 사람이 소유하고 고치는 것
│  ├─ .env              설정은 이 파일 하나 (예시: .env.example)
│  ├─ backend/          FastAPI 서버
│  ├─ frontend/         React + Vite + Tailwind 화면
│  └─ docs/             ARCHITECTURE.md(구조·명령·API), roadmap.md
│
└─ ai/                  ← AI가 일하는 곳
   ├─ gon/              에이전트: 프로토콜(GON.md), CLI(gon.py), 스킬 레지스트리, 프롬프트, 메모리
   └─ workspace/        AI 작업 부산물 (임시 스크립트, 스크린샷, 생성 이미지). git에 올리지 않는다
```

개발자가 주로 고치는 파일:

| 하려는 일 | 파일 |
|---|---|
| DB 비밀번호, 로그인 키, 포트 같은 설정 | `user/.env` |
| 서버 기능 | `user/backend/app/` |
| 화면 | `user/frontend/src/` |
| 색·폰트 토큰 | `user/frontend/src/index.css`, `user/frontend/tailwind.config.js` |
| 전문가(스킬) 추가·삭제 | `ai/gon/registry/skills.json` (같이 맞출 곳은 [ARCHITECTURE.md](user/docs/ARCHITECTURE.md) 참고) |
| AI에게 주는 공통 규칙 | `AGENTS.md` |

## 시작하기

```
git clone https://github.com/2Jaegon/SIDE_PJ.git
cd SIDE_PJ
```

쓰는 AI 도구(Claude Code, Gemini CLI·Antigravity, Codex CLI)를 이 폴더에서 열고 이렇게 말한다.

```
gon 설치해줘
```

AI가 [AGENTS.md](AGENTS.md)를 읽고 다음을 한다.

1. Git, Python 3.10+, Node.js 18+ 확인
2. 메인 AI(서비스 대화를 맡을 AI)와 서브 AI를 정하고 확인받음 (고른 도구의 전역 설정만 바뀐다)
3. 전역 `/gon` 명령 등록, 스킬 저장소 전부 받기(처음에는 몇 분), 모든 세션에 상시 적용
4. 서비스 실행(의존성 설치로 1~2분)과 상태 점검

끝나면 http://localhost:5173 에서 서비스를 쓸 수 있다. 설정은 `user/.env.example`을 `user/.env`로 복사해 채운다(없어도 로컬 SQLite로 뜬다).

AI 도구 없이 직접 설치·실행하려면:

```
./install.sh                     # macOS·Linux·WSL (Windows PowerShell은 .\install.ps1)
python ai/gon/gon.py run         # 실행 (Windows는 gon.cmd run, macOS·Linux는 ./gon.sh run)
python ai/gon/gon.py stop        # 종료
python ai/gon/gon.py doctor      # 상태 점검
```

쓸 AI를 나중에 바꾸거나 빼려면 `python ai/gon/gon.py install --tools …`, `python ai/gon/gon.py always off --tools codex`.

## 서비스: 멀티 에이전트

- 요청을 보내면 **Gon**이 전문가 풀(스킬 + 프롬프트 48개)에서 필요한 전문가만 골라 과업을 나눈다. 전문가는 자기 스킬 지침을 근거로 병렬로 일하고, Gon이 결과를 하나로 합친다. 간단한 요청은 팀 없이 Gon이 바로 답한다.
- 입력창의 깊이(빠르게·보통·깊게)가 인원 상한(4·8·16명)을 정하고, 팀은 개발자 관점과 서비스 관점으로 나뉜다. 결과는 분석 → 정리 → 시각화(차트) → 개발(코드) 순서로 합친다.
- AI 기능은 설치 때 고른 메인 AI의 CLI(`claude`, `codex`, Gemini면 Antigravity `agy`)로 동작한다. CLI가 없거나 로그인되지 않았으면 시험용 결과를 보여 주고 화면에 그렇다고 표시한다.

구조, 명령, API, 환경변수는 [user/docs/ARCHITECTURE.md](user/docs/ARCHITECTURE.md), 에이전트는 [ai/gon/README.md](ai/gon/README.md)에 있다.
