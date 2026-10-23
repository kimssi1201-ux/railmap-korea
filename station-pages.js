import {RAIL_PROVINCES} from './station-regions.js';
// RAILMAP's own editorial guide to ten popular railway stations.
// IDs are cross-checked against station links; live departures always use TAGO.
export const FEATURED_STATIONS = Object.freeze([
 {id:'NAT010000',name:'서울',region:'서울',note:'전국 주요 도시로 이동할 때 출발역으로 자주 검색하는 철도 거점입니다.'},
 {id:'NAT010032',name:'용산',region:'서울',note:'호남·전라 방면 기차를 찾을 때 함께 확인하면 좋은 주요역입니다.'},
 {id:'NAT130126',name:'청량리',region:'서울',note:'강릉·강원 방면 철도 이동을 계획할 때 확인하는 주요역입니다.'},
 {id:'NATH30000',name:'수서',region:'서울',note:'SRT 이용자가 출발시간과 목적지를 확인하는 수도권 주요역입니다.'},
 {id:'NAT014445',name:'부산',region:'부산',note:'부산과 수도권을 연결하는 장거리 철도 이동의 대표적인 역입니다.'},
 {id:'NAT013271',name:'동대구',region:'대구',note:'대구·경북권에서 고속열차와 일반열차를 검색할 때 유용한 역입니다.'},
 {id:'NAT011668',name:'대전',region:'대전',note:'서울과 영남권을 연결하는 경부축의 주요 철도역입니다.'},
 {id:'NAT031857',name:'광주송정',region:'광주',note:'광주·호남권 이동을 준비할 때 출발과 도착을 확인할 수 있는 역입니다.'},
 {id:'NAT032563',name:'목포',region:'전남',note:'전남 서남부권 철도 이동을 계획할 때 찾아보는 주요역입니다.'},
 {id:'NAT601936',name:'강릉',region:'강원',note:'강원 동해안 방면 열차를 찾는 이용자를 위한 주요역입니다.'}
]);
const stationMap=new Map(FEATURED_STATIONS.map(s=>[s.id,s]));
const baseStationName=name=>String(name??'').replace(/역$/u,'');
export const FEATURED_PAIRS=Object.freeze([
 ['NAT010000','NAT014445'],['NAT010000','NAT011668'],['NAT010000','NAT013271'],
 ['NAT010000','NAT601936'],['NAT010032','NAT031857'],['NAT010032','NAT032563'],
 ['NAT130126','NAT601936'],['NATH30000','NAT014445'],['NATH30000','NAT013271'],
 ['NATH30000','NAT011668'],['NAT014445','NAT013271'],['NAT014445','NAT011668'],
 ['NAT031857','NAT032563']
]);
export const stationById=id=>stationMap.get(String(id||''))||null;
export const isFeaturedPair=(from,to)=>from!==to&&FEATURED_PAIRS.some(([a,b])=>(a===from&&b===to)||(a===to&&b===from));
export const stationUrl=id=>'/stations/'+encodeURIComponent(id);
export const routeUrl=(from,to)=>'/routes/'+encodeURIComponent(from)+'/'+encodeURIComponent(to);
export function recommendedDestinations(id){
 const other=FEATURED_PAIRS.filter(p=>p.includes(id)).map(p=>stationById(p[0]===id?p[1]:p[0]));
 return other.filter(Boolean);
}
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origin='https://railmap-korea.pages.dev';
const nav=`<nav class="transport-tabs" aria-label="교통수단 선택"><a href="/">🚆 기차</a><a href="/bus.html?type=express">🚌 고속</a><a href="/bus.html?type=intercity">🚍 시외</a><a href="/citybus.html">🚏 시내</a></nav>`;
const stationLink=(s,extra='')=>`<a class="sp-link" href="${stationUrl(s.id)}"><strong>${escapeHtml(baseStationName(s.name))}역</strong><small>${escapeHtml(extra||s.region)} · 역 정보 및 구간 조회</small><span aria-hidden="true">→</span></a>`;
function layout({path,title,description,heading,crumbs,body,script='',noindex=false}){
 const crumb=crumbs.map(([label,href])=>href?`<a href="${href}">${escapeHtml(label)}</a>`:`<span>${escapeHtml(label)}</span>`).join('<span aria-hidden="true">›</span>');
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${origin}${path}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${noindex?'<meta name="robots" content="noindex">':''}<link rel="stylesheet" href="/styles.css?v=audit-ux-v1"><link rel="stylesheet" href="/bus.css?v=audit-ux-v1"><link rel="stylesheet" href="/station-pages.css?v=audit-ux-v1">${script?`<script type="module" src="${script}?v=audit-ux-v1"></script>`:''}</head><body><div class="app"><header class="site-header"><a class="logo" href="/" aria-label="레일맵 홈"><span class="logo-icon" aria-hidden="true">🚆</span><span>RAIL<span>MAP</span></span></a><a class="sp-header-link" href="/stations/">전국 기차역</a></header><main class="content sp-content">${nav}<div class="sp-breadcrumb" aria-label="현재 위치">${crumb}</div><section class="sp-hero"><div class="sp-eyebrow">RAILMAP · 전국 철도 안내</div><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p></section>${body}</main><footer class="footer"><span>© RAILMAP</span><div><a href="/">시간표 검색</a><a href="https://www.korail.com/" target="_blank" rel="noopener noreferrer">코레일 공식</a><a href="https://etk.srail.kr/main.do" target="_blank" rel="noopener noreferrer">SRT 공식</a></div></footer></div></body></html>`;
}
export function stationIndexHtml(){
 const regions=[...new Set(FEATURED_STATIONS.map(s=>s.region))];
 const list=regions.map(region=>`<section class="sp-card"><h2>${escapeHtml(region)} 주요역</h2><div class="sp-link-list">${FEATURED_STATIONS.filter(s=>s.region===region).map(s=>stationLink(s)).join('')}</div></section>`).join('');
 const provinces=RAIL_PROVINCES.map(region=>`<button type="button" class="sp-province-chip" data-province="${region}" aria-pressed="false">${region}</button>`).join('');
 const body=`<section class="sp-card" id="spNationwide"><h2>전국 17개 시·도 기차역 찾기</h2><p>지역을 선택하면 공식 TAGO 역 목록을 불러옵니다. 해당 지역에 운영 중인 열차역이 없거나 공공데이터에서 누락된 경우 목록이 비어 있을 수 있습니다.</p><div class="sp-province-chips" role="group" aria-label="지역 선택"><button type="button" class="sp-province-chip active" data-province="전체" aria-pressed="true">전체</button>${provinces}<button type="button" class="sp-province-chip" data-province="지역 확인 필요" aria-pressed="false">미분류</button></div><label class="sp-directory-label" for="spStationSearch">역 이름 검색</label><input id="spStationSearch" class="sp-directory-input" type="search" placeholder="역 이름을 입력하세요 (예: 익산, 포항)" autocomplete="off"><p id="spDirectoryStatus" class="sp-directory-status" role="status" aria-live="polite">전국 공식 역 목록을 불러오는 중입니다.</p><div id="spDirectoryResults" class="sp-directory-results"></div><button id="spStationMore" class="sp-more" type="button" hidden>다음 역 더 보기</button></section><section class="sp-card"><h2>빠른 바로가기 · 주요역 10곳</h2><p>기존 주요역 목록은 빠른 바로가기로 유지합니다.</p></section><div class="sp-region-list">${list}</div><p class="sp-disclaimer">지역명은 공공데이터에 등록된 도시코드를 기준으로 분류합니다. 실제 운행 시각과 승차 가능 여부는 선택 날짜의 공식 시간표와 예매처에서 확인하세요.</p>`;
 return layout({path:'/stations/',title:'전국 17개 시·도 기차역 목록·시간표 | 레일맵',description:'서울·경기·충청·전라·경상·강원 등 전국 17개 시·도 기차역을 공식 역 목록에서 찾고 시간표를 확인하세요.',heading:'전국 지역별 기차역 찾기',crumbs:[['홈','/'],['기차역 목록']],body,script:'/station-directory.js'});
}
export function stationDetailHtml(s){
 if(!s)return null;
 const name=baseStationName(s.name);
 const dest=recommendedDestinations(s.id);
 const related=FEATURED_STATIONS.filter(t=>t.id!==s.id).slice(0,6).map(t=>stationLink(t)).join('');
 const featured=Boolean(stationById(s.id));
 const note=featured?s.note:'TAGO 공식 역 목록에 등록된 역입니다. 실제 열차 운행 여부는 선택 날짜와 목적지에 따라 다릅니다.';
 const browse=`<div id="spVerifiedRoutes" class="sp-link-list" data-station="${escapeHtml(s.id)}" data-candidates="${escapeHtml(JSON.stringify(dest.map(t=>({id:t.id,name:baseStationName(t.name)}))))}"></div><div class="sp-search-other"><strong>목적지가 목록에 없나요?</strong><p>등록된 추천 구간 중 선택 날짜에 실제 배차가 확인된 곳만 표시합니다. 다른 목적지는 전체 기차 검색에서 직접 확인할 수 있습니다.</p><a href="/" class="sp-secondary-link">전체 기차 시간표 검색 →</a></div>`;
 const dateCheck=`<div class="sp-date-check"><label for="spCheckDate">시간표 확인 날짜</label><input id="spCheckDate" type="date"></div><p id="spRecommendationStatus" class="sp-directory-status" role="status">확인된 구간만 표시합니다.</p>`;
 const body=`<section class="sp-card"><h2>${escapeHtml(name)}역 이용 안내</h2><p>${escapeHtml(note)}</p><div class="sp-tags"><span>${escapeHtml(s.region||"지역 확인 필요")}</span><span>공식 시간표 조회</span><span>열차별 출발·도착</span></div></section><section class="sp-card"><h2>${escapeHtml(name)}역 확인된 직통 시간표</h2><p>조회 날짜에 공식 운행편이 확인된 목적지만 목록에 표시합니다.</p>${dateCheck}${browse}</section><section class="sp-card"><h2>다른 주요역 찾아보기</h2><div class="sp-link-list">${related}</div></section><section class="sp-card"><h2>시간표·예매 주의사항</h2><p>기차 운행일, 요금, 임시열차와 운휴는 달라질 수 있습니다. 레일맵은 확정되지 않은 요금과 승강장 번호를 만들어 표시하지 않습니다.</p><div class="sp-external"><a href="https://www.korail.com/" rel="noopener noreferrer" target="_blank">코레일 공식 예매 ↗</a><a href="https://etk.srail.kr/main.do" rel="noopener noreferrer" target="_blank">SRT 공식 예매 ↗</a></div></section>`;
 return layout({path:stationUrl(s.id),title:`${name}역 시간표·목적지·기차표 안내 | 레일맵`,description:`${name}역 주요 구간을 찾아 날짜별 KTX·SRT·일반열차의 출발·도착 시간과 제공 요금을 공식 데이터로 조회하세요.`,heading:`${name}역 시간표 안내`,crumbs:[['홈','/'],['기차역 목록','/stations/'],[name+'역']],body,script:'/station-destination.js',noindex:!featured});
}
export function routeDetailHtml(from,to,{allowVerifiedPair=false}={}){
 if(!from||!to||from.id===to.id||(!allowVerifiedPair&&!isFeaturedPair(from.id,to.id)))return null;
 const fromName=baseStationName(from.name),toName=baseStationName(to.name);
 const name=fromName+'역 → '+toName+'역';
 const body=`<section class="sp-card" id="routeApp" data-from="${escapeHtml(from.id)}" data-to="${escapeHtml(to.id)}" data-from-name="${escapeHtml(fromName)}" data-to-name="${escapeHtml(toName)}"><h2>날짜별 열차 시간표 조회</h2><p>선택한 날짜 기준으로 국토교통부 TAGO의 직통 열차 정보를 조회합니다. 요일별 고정 시간표가 아닙니다.</p><form id="routeSearchForm" class="sp-route-form"><label for="routeDate">출발 날짜</label><input id="routeDate" type="date" required><label for="routeGrade">열차 종류</label><select id="routeGrade"><option value="전체">전체</option><option value="KTX">KTX</option><option value="SRT">SRT</option><option value="일반">ITX·일반</option></select><button id="routeSubmit" type="submit">시간표 조회하기</button></form><p id="routeStatus" class="sp-result-status" role="status" aria-live="polite">해당 날짜의 시간표를 확인할 수 있습니다.</p><div id="routeResults" class="sp-route-results"><p class="sp-loading">공식 시간표를 조회할 날짜를 확인하세요.</p></div><p class="sp-disclaimer">직통 결과가 없더라도 환승 가능성이나 실제 운행 종료를 뜻하지 않습니다. 출발·도착·요금은 API가 제공하는 경우에만 표시합니다.</p></section><section class="sp-card"><h2>다른 방향·다른 역 찾기</h2><div class="sp-link-list"><a class="sp-link" href="${routeUrl(to.id,from.id)}"><strong>${escapeHtml(toName)} → ${escapeHtml(fromName)}</strong><small>돌아오는 기차 시간표</small><span aria-hidden="true">→</span></a>${stationLink(from)}${stationLink(to)}</div></section><section class="sp-card"><h2>공식 승차권 예매</h2><p>레일맵은 실시간 좌석, 운휴, 당일 변경사항을 보증하지 않습니다. 실제 예매 조건은 운영사에서 확인하세요.</p><div class="sp-external"><a href="https://www.korail.com/" target="_blank" rel="noopener noreferrer">코레일 예매 ↗</a><a href="https://etk.srail.kr/main.do" target="_blank" rel="noopener noreferrer">SRT 예매 ↗</a></div></section>`;
 return layout({path:routeUrl(from.id,to.id),title:`${fromName}역에서 ${toName}역 가는 기차 시간표·요금 | 레일맵`,description:`${name} 날짜별 KTX·SRT·일반열차 출발시간과 도착시간, 공식 데이터 제공 요금을 확인하세요.`,heading:`${name} 기차 시간표`,crumbs:[['홈','/'],['기차역 목록','/stations/'],[fromName+'역',stationUrl(from.id)],[toName+'행 시간표']],body,script:'/route-detail.js',noindex:true});
}
export function sitemapUrls(){
 return ['/','/stations/',...FEATURED_STATIONS.map(s=>stationUrl(s.id))];
}