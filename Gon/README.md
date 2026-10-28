# Gon

이 저장소 전체가 Gon이다. 에이전트(이 폴더)와 서비스(backend/, frontend/)가 한 몸이며, 에이전트는 서비스를 개발·운영하고 서비스는 같은 스킬 풀로 일한다. 요청에 맞는 스킬을 레지스트리에서 골라 조합해 일하고, 일하면서 배운 것은 메모리와 스킬로 남긴다.

## 구성

| 경로 | 역할 |
|---|---|
| `GON.md` | 프로토콜 (모든 AI가 이 하나를 따름) |
| `gon.py` | CLI: `route` · `fetch` · `remember` · `log` · `learn` · `install` · `always` · `run` · `doctor` |
| `registry/skills.json` | 스킬 레지스트리. 용도, 트리거, 시너지, 읽을 파일, 핵심(`core`) 여부 |
| `memory/` | 장기 메모리(`MEMORY.md`)와 작업 이력(`log.md`) |
| `prompt/` | 작업용 프롬프트와 최우선 규칙(`outranks everything below.md`) |
| `skills/repos.json` | 스킬 저장소 목록. 저장소 본체는 git에 넣지 않고 처음 쓸 때 자동으로 받음 |
| `skills/local/` | 작업하며 Gon이 만든 스킬 |
| `tasks/roadmap.md` | 프로젝트 로드맵 |

## 시작하기

저장소 루트의 [README.md](../README.md)를 따른다. 요약하면 clone 후 AI 도구에서 `/Gon`, 그다음 `python Gon/gon.py run`.

다른 프로젝트에서도 `/Gon`을 쓰려면:

```
python Gon/gon.py install      # ~/.claude, ~/.gemini 에 전역 /Gon 등록
python Gon/gon.py always on    # /Gon 없이 모든 세션에 상시 적용 (해제: off)
```

## 핵심 스킬

`/Gon` 실행 시 키워드와 무관하게 적용된다 (`registry/skills.json`의 `core`).
- `always`: karpathy, ECC 검증 루프·코딩 표준
- `project`: 코드·UI 작업일 때만. ECC FastAPI·React 패턴, API 설계, 접근성, 코드 리뷰, 보안, E2E, git

단독 배포본: https://github.com/2Jaegon/Gon.git
