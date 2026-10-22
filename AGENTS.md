# Codex RAILMAP 지침

이 저장소의 핵심 지침은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.
모바일 우선 간편 열차검색 UI이며 **지도는 제거된 상태**입니다. 기존 `train`과 `bokjisense`를 수정하지 마세요.
TAGO 실데이터만 표시하고 승강장·좌석 잔여수를 임의로 만들어 표시하지 않습니다. Secret `TAGO_API_KEY`는 서버에만 저장합니다.
배포는 GitHub `main` 자동 배포만 허용하며, 변경 전후 `npm run build`, `npm test`를 실행합니다.