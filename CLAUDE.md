# RAILMAP 프로젝트 가이드

- 목적: 지도 없이, 스마트폰에서 코레일 사이트로 이동하지 않고 기차 시간표를 바로 조회하는 독립 웹사이트.
- 저장소: `kimssi1201-ux/railmap-korea` / Cloudflare Pages 자동 배포 / 기존 `train` 및 `bokjisense` 프로젝트는 수정하지 않습니다.
- 스택: HTML, CSS, JavaScript, Cloudflare Pages Functions, 국토교통부 TAGO 열차정보 API.
- 사용자는 아이폰으로 관리하므로 모바일 우선, **가로 잘림 금지**, 320px 모바일 기준 작동, 단순한 검색 UI 유지.
- `npm run build` 및 `npm test` 필수. 외부 API 라이브 결과를 테스트하지 않았다면 성공을 주장하지 않습니다.
- Deployment는 `git push origin main` 방식의 Cloudflare 자동 배포만 사용. 직접 Wrangler/Vercel/Netlify CLI 배포 금지.
- Production Secret `TAGO_API_KEY`를 GitHub나 클라이언트에 노출하지 않습니다.
- 실제 열차 좌석, 결제/발권, 지연, 열차별 승강장 번호를 임의로 생성하지 않습니다.
- TAGO 공식 출·도착 운행정보가 없는 경우 결과가 없음을 명확히 알리며, 직통 결과가 없다고 모든 환승편이 없다는 뜻으로 안내하지 않습니다.
- 지도 라이브러리/OSM 타일을 임의로 다시 추가하지 않습니다. 사용자가 원할 때만 검토합니다.