# Gon

한 줄 요청만으로 AI 전문가 팀이 일하고, 다음엔 더 잘 질문하는 법까지 알려 주는 **전국민 AI 평준화** 프로젝트.

이 저장소 전체가 Gon이다. **에이전트**(`Gon/`)는 이 프로젝트를 개발하고 운영하는 비서이고, **서비스**(`backend/`, `frontend/`)는 같은 스킬 풀로 전문가 팀을 꾸려 일한다.

## 시작하기

```
git clone https://github.com/2Jaegon/SIDE_PJ.git
cd SIDE_PJ
```

AI 도구(Claude Code, Gemini CLI, Antigravity)를 이 폴더에서 열고 입력한다.

```
/gon
```

에이전트가 적용되고 서비스가 시작된다(처음에는 의존성 설치로 1~2분). 주소는 http://localhost:5173. 요청을 붙이면(`/gon 로그인 화면 만들어줘`) 그 일을 수행한다.

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

- 요청을 보내면 **Gon**이 전문가 풀(스킬 + 프롬프트 46개)에서 필요한 전문가만 골라 과업을 나눈다. 전문가는 자기 스킬 지침을 근거로 병렬로 일하고, Gon이 결과를 하나로 합친다. 고정 인원은 없고 요청마다 편성이 달라진다(최대 `SKILLBRIDGE_MAX_EXPERTS`명, 기본 8).
- Antigravity CLI(`agy`)로 실행한다. 호출은 요청 1건에 `편성 1 + 전문가 N + 코칭 1 + 종합 1`번, 약 1~2분 걸리며 구독 한도를 IDE와 나눠 쓴다. `agy`가 없으면 시험용 결과를 보여 주고 화면에 그렇다고 표시한다.
  - 설치: `winget install Google.AntigravityCLI` 후 한 번 로그인
  - 환경변수: `SKILLBRIDGE_LLM=stub`(AI 끄기), `SKILLBRIDGE_LLM_WORKERS=4`(동시 호출 수), `SKILLBRIDGE_MAX_EXPERTS=8`(전문가 상한), `AGY_PATH`(agy 위치 직접 지정)
