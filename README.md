# Gon

한 줄 요청만으로 AI 전문가 팀이 일하고, 다음엔 더 잘 질문하는 법까지 알려 주는 **전국민 AI 평준화** 프로젝트.

이 저장소 전체가 Gon이다. **에이전트**(`Gon/`)는 이 프로젝트를 개발하고 운영하는 비서이고, **서비스**(`backend/`, `frontend/`)는 같은 스킬 풀로 전문가 팀을 꾸려 일한다.

## 시작하기

```
git clone https://github.com/2Jaegon/SIDE_PJ.git
cd SIDE_PJ
```

쓰는 AI 도구(Claude Code, Gemini CLI·Antigravity, Codex CLI)를 이 폴더에서 열고 이렇게 말한다.

```
gon 설치해줘
```

AI가 이 폴더의 [AGENTS.md](AGENTS.md)(Claude Code는 `CLAUDE.md`, Gemini는 `GEMINI.md`를 통해 같은 내용)를 읽고 다음을 한다.

1. Git, Python 3.10+, Node.js 18+ 확인
2. 어떤 AI에 Gon을 적용할지 질문 (고른 도구의 전역 설정만 바뀐다)
3. 전역 `/gon` 명령 등록, 스킬 저장소 전부 받기(처음에는 몇 분), 모든 세션에 상시 적용
4. 서비스 실행(의존성 설치로 1~2분)과 상태 점검

끝나면 http://localhost:5173 에서 서비스를 쓸 수 있다. 고른 AI 도구를 새로 열면 `/gon 로그인 화면 만들어줘`처럼 어느 폴더에서든 요청할 수 있다.

AI 도구 없이 직접 설치하려면 스크립트를 쓴다. 쓰는 AI를 터미널에서 묻는다.

```
./install.sh        # macOS·Linux·WSL
.\install.ps1       # Windows PowerShell
```

미리 정하려면 `./install.sh --tools claude,gemini`처럼 쓴다. 나중에 바꾸거나 빼려면 `python Gon/gon.py install --tools …`, `python Gon/gon.py always off --tools codex`.

AI 도구 없이 직접 실행하려면:

```
python Gon/gon.py run     # Windows는 gon.cmd run, macOS·Linux는 ./gon.sh run
python Gon/gon.py stop    # 종료
python Gon/gon.py doctor  # 상태 점검
```

필요한 것: Git, Python 3.10+, Node.js 18+. AI 기능은 Antigravity CLI(`agy`, Google AI Pro 구독)로 동작한다(아래 참고).

## 구성

| 경로 | 내용 |
|---|---|
| `Gon/` | 에이전트: 프로토콜(`GON.md`), CLI(`gon.py`), 스킬 레지스트리, 메모리, 프롬프트 |
| `backend/` | FastAPI 서버. 멀티 에이전트 파이프라인(`core/pipeline.py`) |
| `frontend/` | React + Vite + Tailwind 화면 |
| `AGENTS.md` | 모든 AI가 읽는 상시 규칙 |
| `docs/` | 기획 문서 |

스킬 저장소는 용량이 커서 git에 넣지 않고, 처음 쓰일 때 자동으로 받는다. 프로토콜과 레지스트리는 [Gon/README.md](Gon/README.md) 참고.

## 서비스: 멀티 에이전트

- 요청을 보내면 **Gon**이 전문가 풀(스킬 + 프롬프트 48개)에서 필요한 전문가만 골라 과업을 나눈다. 전문가는 자기 스킬 지침을 근거로 병렬로 일하고, Gon이 결과를 하나로 합친다. 고정 인원은 없고 요청 크기에 따라 편성이 달라진다. 입력창의 깊이(빠르게·보통·깊게)가 상한(4·8·16명)을 정하고, 팀은 개발자 관점과 서비스 관점으로 나뉜다. Gon은 결과를 분석 → 정리 → 시각화(차트) → 개발(코드) 순서로 합친다.
- Antigravity CLI(`agy`)로 실행한다. 호출은 요청 1건에 `편성 1 + 전문가 N + 코칭 1 + 종합 1`번, 약 1~2분 걸리며 구독 한도를 IDE와 나눠 쓴다. `agy`가 없으면 시험용 결과를 보여 주고 화면에 그렇다고 표시한다.
  - 설치: `winget install Google.AntigravityCLI` 후 한 번 로그인
  - 환경변수: `GON_LLM=stub`(AI 끄기, 기본 auto는 agy만 사용), `GON_LLM_WORKERS=4`(동시 호출 수), `GON_MAX_EXPERTS=16`(깊이와 무관한 절대 상한), `AGY_PATH`(agy 위치 직접 지정)
