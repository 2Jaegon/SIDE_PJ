# ai/workspace

AI(Claude, Gemini, Codex)가 작업하면서 만드는 부산물을 두는 곳이다. 이 README 말고는 git에 올라가지 않는다.

| 폴더 | 넣는 것 |
|---|---|
| `scratch/` | 한 번 쓰고 마는 스크립트, 변환·계산용 코드, 중간 데이터 |
| `screenshots/` | 브라우저 확인·디자인 비교용 화면 캡처 |
| `images/` | 서브 AI로 만든 이미지 등 생성물 |

- 저장소 루트나 `user/`에 임시 파일을 만들지 않는다.
- 결과물 중 서비스에 실제로 쓰는 것(예: `user/frontend/public/models/*.bin`)은 `user/` 쪽 제자리로 옮겨서 커밋한다.
