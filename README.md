# RAILMAP — 전국 기차 시간표 간편 검색

기존 `train` 지하철 프로젝트와 별개의 Cloudflare Pages 사이트. **지도 라이브러리/타일은 제거**하고 출발역·도착역·날짜 중심의 모바일 퍼스트 검색 UI를 제공합니다.

## 구현 기능
- 공식 국토교통부 TAGO 열차정보 API로 전국 역 목록 및 출발/도착 구간별 직통 열차 시간표 조회
- KTX·SRT·일반열차 필터 및 출발시간·소요시간·제공 운임 정렬
- 자주 찾는 구간, 최근 검색 구간(기기 내 저장), 출발·도착 바꾸기
- 열차별 공식 예약처 연결, 승강장 현장 확인 안내
- 320px 이상 모바일의 가로 스크롤 없는 반응형 웹

## Cloudflare Pages
- GitHub 저장소: `kimssi1201-ux/railmap-korea`
- 프로젝트: `railmap-korea`
- Production 브랜치: `main`
- Framework preset: `None` / Build command: 비워두기 / Output directory: `.`
- Secret `TAGO_API_KEY`: 공공데이터포털 TAGO 열차정보 활용 신청 후 Cloudflare Pages Production 환경변수로 보관. GitHub에 키 업로드 금지.
- `git push origin main`에 따른 Cloudflare 자동 배포 사용. 직접 배포 CLI 금지.

## 개발/검증
- `npm run build`: JS 구문 검사
- `npm test`: API 및 승강장 응답 검사
- 실제 공공데이터 API 연결은 키/공급기관 응답이 필요합니다. 실시간 좌석·결제·발권·지연·열차별 승강장 번호는 제공하지 않습니다.
- 역 목록 실패 시 시간표를 임의로 생성하지 않습니다. 실제 열차시간표는 `/api/trains` 결과로만 표시합니다.

## 승강장 주의
TAGO는 당일 열차별 승강장 번호를 제공하지 않습니다. 화면은 공식 자료로 확인할 수 없는 번호를 추정하지 않고 `현장 확인 필요`라고 안내합니다.


## 고속·시외버스 시간표 (버스 v1)
- 메인 `/`은 기존 기차 검색을 유지하며, 상단 탭에서 `/bus.html?type=express` (고속버스), `/bus.html?type=intercity` (시외버스)로 이동합니다.
- Cloudflare Pages Functions: `GET /api/bus-terminals?type=express|intercity` 와 `GET /api/bus-timetables?type=express|intercity&from=<terminalID>&to=<terminalID>&date=YYYY-MM-DD`.
- 공공데이터포털 활용 승인: [고속버스](https://www.data.go.kr/data/15098522/openapi.do)와 [시외버스](https://www.data.go.kr/data/15098541/openapi.do)를 각각 승인해야 합니다.
- 환경 비밀변수: 기존 `TAGO_API_KEY`를 우선 재사용할 수 있으며, 별도 발급키가 있다면 `EXPBUS_API_KEY` 및 `SUBURBSBUS_API_KEY`를 설정할 수 있습니다. API 키를 저장소에 넣지 마세요.
- 시외버스는 공공데이터포털 안내에 따라 **당일 배차만 조회**하도록 클라이언트와 서버 양측에서 제한했습니다.
- 실제 좌석 수, 구매 가능 여부, 미제공 운임 및 배차를 임의로 만들어 표시하지 않습니다. 예매는 공식 예매 사이트로 이동합니다.
- `npm run build && npm test`로 검사합니다. 실제 인증키로 된 라이브 공공데이터 응답 검증은 별도로 수행해야 합니다.