# RAILMAP — 전국 기차지도

네이버지도처럼 지도에서 기차역을 찾고, 출발역/도착역/날짜로 열차 운행시간표를 **사이트 안에서** 비교하는 Cloudflare Pages 사이트의 첫 버전입니다. 기존 지하철 프로젝트와 별개입니다.

## 지도 중심 디자인 (Naver Map 스타일의 독자적 UI)
- **아이폰:** 화면 전체 지도 + 상단 역 검색창 + 하단 접히는 열차검색 패널. 역을 검색하고 목록에서 선택하면 지도 이동/역 선택 대화상자가 열림.
- **PC:** 화면 전체 지도 + 왼쪽 떠 있는 검색·결과 패널 + 상단 지도 역 검색.
- 역 검색창은 **지도에서 역을 찾는 기능**, 하단/왼쪽의 출발역·도착역 입력은 **열차 시간표 조회 기능**임.
- 역 팝업에서 출발역/도착역을 지정하면 아이폰 검색 패널이 펼쳐짐. 최초 화면에서는 지도를 넓게 보여줌.
- UI 스크린샷은 디자인 검토용 정적 배경. 실제 사이트 지도는 Leaflet + OSM 타일로 동작하며 온라인 접속이 필요함.
- 사이트 브랜드·레이아웃은 자체 제작이며 타사 로고/에셋을 복제하지 않음.

## 구현됨
- 대한민국 지도(OpenStreetMap/Leaflet), 주요 역 60여 곳의 위치 참고 핀, 역 검색 및 역 선택
- 출발·도착역 교환, 날짜 선택, 즐겨찾기(localStorage), 자주 찾는 구간
- TAGO 열차정보 API 연결 시 공식 역 코드 조회, 해당 날짜의 직통 열차 운행시간표 표시
- KTX/SRT/일반열차 표시 필터, 출발시각·소요시간·API 제공 운임 정렬
- 공식 예매처 링크, 아이폰 화면 최적화, API 실패/미설정 상태의 정직한 안내
- **승강장(플랫폼) 안내:** 개별 열차 카드의 ‘타는 곳 · 현장 확인 필요’ 표시, 열차번호·출발시간을 이용한 역 전광판 확인 4단계, 역 핀 선택 시 탑승 안내 제공. TAGO 응답만으로 승강장 번호를 지어내지 않음.

## 아직 없는 기능
- 코레일/SRT 내부 실시간 좌석잔여량과 실제 결제/발권 기능
- 실시간 열차 GPS 위치, 지연정보, 환승 경로/예측 운임
- 미리보기 역 외 전국 역의 검증된 상세 좌표. **참고 핀 위치는 측량된 정확한 역 좌표가 아닙니다.**
- 열차별 실제 승강장 번호의 동적 표시 및 역 내부 층별 이동경로. 공식/계약된 열차별 승강장 배정 데이터가 있어야 구현 가능.
- 신규 GitHub 저장소와 Cloudflare Pages 배포의 실제 연결(설치 필요)

## 필수 설치
1. 기존 `train` 저장소와 별도로 새 GitHub 저장소 생성(예: `railmap-korea`), 이 디렉터리 파일을 저장소 **루트**에 업로드.
2. Cloudflare → Workers & Pages → 새 Pages 프로젝트 → GitHub 연동 → **신규 저장소** 선택.
3. Framework preset `None`, Build command 비움, Build output directory `.`.
4. [TAGO 열차정보 API](https://www.data.go.kr/data/15098552/openapi.do)에서 인증키 발급 및 사용 신청.
5. Cloudflare Pages 프로젝트 → Settings → Variables and Secrets에 **Secret** `TAGO_API_KEY` 등록 (키의 디코딩 문자열 권장).
6. **배포는 `git push origin main`으로만 진행**. 설정 후 Cloudflare의 Git 연동 자동 배포 상태 확인.
7. `https://<새-프로젝트>.pages.dev/api/stations`에서 `ok:true` 응답을 확인한 다음 서울→부산 등 실제 날짜 검색 시험.

## 로컬 개발
- Node.js 18+ 설치 후 `npm run build`, `npm test`.
- `npm run dev` 사용 시 프로젝트 루트에 `.dev.vars`를 만들어 `TAGO_API_KEY=본인발급키` 지정(이 파일은 `.gitignore` 대상).
- 키 없이 열면 **지도/검색 UI 미리보기**만 제공되며 시간표를 지어내 표시하지 않습니다.

## 정보 출처
- [국토교통부 TAGO 열차정보 API](https://www.data.go.kr/data/15098552/openapi.do)
- [OpenStreetMap](https://www.openstreetmap.org/copyright)
- [코레일 예매](https://www.korail.com/ticket/reserve), [SRT 예매](https://etk.srail.kr/main.do)

관련 안전·개발 규칙은 `CLAUDE.md`에 있습니다.

## 승강장 정보 연동 범위 (2026-10-22)
- TAGO 열차정보 `GetStrtpntAlocFndTrainInfo`에는 당일 열차별 승강장 번호를 확인할 수 있는 필드가 없으므로 서버 `cleanTrain()`은 `boarding: {platformNo:null,source:null,checkedAt:null}`을 반환합니다.
- 화면은 `platformNo`와 확인 출처·시각이 **모두** 있어야 번호를 보여줍니다. 기본은 ‘현장 확인 필요’입니다.
- 국가철도공단의 `코레일 승강장 정보` 파일은 인프라 현황 자료이며, 특정 날짜 열차의 승강장 배정 자료와 동일하지 않습니다. 고정 자료에서 번호를 유추하면 안 됩니다.
- 향후 승인된 공식 열차별 승강장 피드가 확보되면 서버에서 `(날짜, 출발역, 열차번호)`로 조회/검증/만료처리하고 출처·확인시각을 함께 주어야 합니다. 사용자의 직접 등록·비공식 추정으로 ‘확정 승강장’을 표시해서는 안 됩니다.
- 공식 정보: https://www.data.go.kr/data/15098552/openapi.do ; https://www.data.go.kr/data/15041187/fileData.do

## Cloudflare Pages 배포 후 확인
- Cloudflare Pages Production의 Variables and Secrets에 `TAGO_API_KEY`가 암호화되어 등록되어 있는지 확인합니다. 실제 키 값은 GitHub에 기록하지 않습니다.
- GitHub `main`의 변경이 Cloudflare Pages 자동 배포로 연결되는지 Deployments에서 확인합니다.
- 사이트에서 역 목록을 불러오고 날짜를 선택하여 열차를 검색해 봅니다. 오류라면 Pages Functions 로그와 TAGO API 사용승인 상태를 확인합니다.
- 검색 결과의 승강장 번호는 공식 열차별 검증 데이터가 없는 한 ‘현장 확인 필요’로 유지합니다.
