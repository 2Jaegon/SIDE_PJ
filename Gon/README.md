# Gon

이 저장소 전체가 Gon이다. 에이전트(이 폴더)와 서비스(backend/, frontend/)가 한 몸이며, 에이전트는 서비스를 개발·운영하고 서비스는 같은 스킬 풀로 일한다. 요청에 맞는 스킬을 레지스트리에서 골라 조합해 일하고, 일하면서 배운 것은 메모리와 스킬로 남긴다.

## 구성

| 경로 | 역할 |
|---|---|
| `GON.md` | 프로토콜 (모든 AI가 이 하나를 따름) |
| `gon.py` | CLI: `catalog` · `pick` · `fetch` · `remember` · `recent` · `log` · `observe` · `review` · `learn` · `install` · `always` · `run` · `doctor` |
| `registry/skills.json` | 스킬 레지스트리. 용도, 트리거, 시너지, 읽을 파일, 핵심(`core`) 여부 |
| `memory/` | 장기 메모리(`MEMORY.md`)와 작업 이력(`log.md`) |
| `prompt/` | 작업용 프롬프트와 최우선 규칙(`outranks everything below.md`) |
| `skills/repos.json` | 스킬 저장소 목록. 저장소 본체는 git에 넣지 않고 처음 쓸 때 자동으로 받음 |
| `skills/local/` | 작업하며 Gon이 만든 스킬 |
| `tasks/roadmap.md` | 프로젝트 로드맵 |

## 시작하기

저장소 루트의 [README.md](../README.md)를 따른다. 요약하면 clone 후 AI 도구에서 `/Gon`, 그다음 `python Gon/gon.py run`.

다른 프로젝트에서도 `/gon`을 쓰려면(쓰는 AI만 고른다. 안 주면 터미널에서 묻는다):

```
python Gon/gon.py install --tools claude,gemini   # 고른 AI에 전역 /gon 등록 (선택 가능: claude, gemini, codex)
python Gon/gon.py always on                        # /gon 없이 모든 세션에 상시 적용 (해제: always off [--tools …])
```

## 핵심 스킬

스킬은 키워드가 아니라 AI가 요구사항을 분석해 고른다. `gon catalog`로 전체 목록을 보고 필요한 것을 `gon pick`으로 불러온다.
- `always`(`registry/skills.json`의 `core`): karpathy, ECC 검증 루프·코딩 표준은 고르지 않아도 항상 붙는다.
- `project`: ECC FastAPI·React 패턴, API 설계, 접근성, 코드 리뷰, 보안, E2E, git은 코드·UI 작업이면 AI가 골라 쓴다.
- ponytail, graphify, headroom, court 등 나머지도 같은 목록에서 AI가 판단한다.

단독 배포본: https://github.com/2Jaegon/Gon.git
