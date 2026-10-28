# SkillBridge · 전국민 AI 평준화

한 줄 요청만으로 AI 전문가 팀이 일하고, 다음엔 더 잘 질문하는 법까지 알려 주는 서비스. 개발과 운영은 비서 에이전트 **Gon**이 함께한다. Gon은 이 저장소에 포함되어 있다.

## 시작하기 (어느 PC에서든)

```
git clone https://github.com/2Jaegon/SIDE_PJ.git
cd SIDE_PJ
```

1. AI 도구(Claude Code, Gemini CLI, Antigravity)를 이 폴더에서 열고 `/Gon`을 입력한다. Gon이 상태를 점검하고 안내한다.
2. 서버를 실행한다.
   ```
   python Gon/gon.py run
   ```
   처음에는 의존성(백엔드 pip, 프론트 npm)을 자동으로 설치하고, 백엔드(8000)와 프론트(5173)를 띄운 뒤 브라우저를 연다. 종료는 `Ctrl+C`. Windows에서는 `run.bat`을 더블클릭해도 된다.

필요한 것: Git, Python 3.10+, Node.js 18+.

`/Gon <요청>`으로 일을 시키면 요청에 맞는 스킬(디자인, 기획, 리서치, 검증 등)을 골라 조합해 수행한다. 프로토콜은 [Gon/GON.md](Gon/GON.md), 스킬 목록은 [Gon/registry/skills.json](Gon/registry/skills.json)에 있다. 스킬 저장소는 용량이 커서 git에 넣지 않고 처음 쓸 때 자동으로 받는다.

## 구성

| 경로 | 내용 |
|---|---|
| `backend/` | FastAPI 서버 (전문가 팀 구성, 요청 처리) |
| `frontend/` | React + Vite + Tailwind 화면 |
| `Gon/` | Gon 에이전트 (프로토콜, 스킬 레지스트리, 메모리, CLI `gon.py`) |
| `AGENTS.md` | 모든 AI가 읽는 상시 규칙 |
| `docs/` | 기획 문서 |

## 알아둘 점

- **멀티 에이전트:** 요청을 보내면 **총괄**이 전문가 풀(Gon 스킬 + 프롬프트 47개)에서 필요한 전문가만 골라 과업을 나눈다. 전문가는 자기 스킬 지침을 근거로 병렬로 일하고, 총괄이 결과를 하나로 합친다. 고정 인원은 없고 요청마다 편성이 달라진다(최대 `SKILLBRIDGE_MAX_EXPERTS`명, 기본 8).
- **AI 연결:** Antigravity CLI(`agy`, Google AI Pro 구독 안에서 사용)로 실행한다. 호출은 요청 1건에 `편성 1 + 전문가 N + 코칭 1 + 종합 1`번, 약 1~2분 걸리며 구독 한도를 IDE와 나눠 쓴다. `agy`가 없으면 시험용 결과를 보여 주고 화면에 그렇다고 표시한다.
  - 설치: `winget install Google.AntigravityCLI` 후 한 번 로그인
  - 환경변수: `SKILLBRIDGE_LLM=stub`(AI 끄기), `SKILLBRIDGE_LLM_WORKERS=4`(동시 호출 수), `SKILLBRIDGE_MAX_EXPERTS=8`(전문가 상한), `AGY_PATH`(agy 위치 직접 지정)
- Gon 에이전트 단독 배포본은 https://github.com/2Jaegon/Gon.git 이다.
