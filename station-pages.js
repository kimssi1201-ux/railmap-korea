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
const stationLink=(s,extra='')=>`<a class="sp-link" href="${stationUrl(s.id)}"><strong>${escapeHtml(s.name)}역</strong><small>${escapeHtml(extra||s.region)} · 역 정보 및 구간 조회</small><span aria-hidden="true">→</span></a>`;
function layout({path,title,description,heading,crumbs,body,script='',noindex=false}){
 const crumb=crumbs.map(([label,href])=>href?`<a href="${href}">${escapeHtml(label)}</a>`:`<span>${escapeHtml(label)}</span>`).join('<span aria-hidden="true">›</span>');
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${origin}${path}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${noindex?'<meta name="robots" content="noindex">':''}<link rel="stylesheet" href="/styles.css?v=station-guide-v1"><link rel="stylesheet" href="/bus.css?v=station-guide-v1"><link rel="stylesheet" href="/station-pages.css?v=station-guide-v1">${script?`<script type="module" src="${script}?v=station-guide-v1"></script>`:''}</head><body><div class="app"><header class="site-header"><a class="logo" href="/" aria-label="레일맵 홈"><span class="logo-icon" aria-hidden="true">🚆</span><span>RAIL<span>MAP</span></span></a><a class="sp-header-link" href="/stations/">전국 기차역</a></header><main class="content sp-content">${nav}<div class="sp-breadcrumb" aria-label="현재 위치">${crumb}</div><section class="sp-hero"><div class="sp-eyebrow">RAILMAP · 전국 철도 안내</div><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p></section>${body}</main><footer class="footer"><span>© RAILMAP</span><div><a href="/">시간표 검색</a><a href="https://www.korail.com/" target="_blank" rel="noopener noreferrer">코레일 공식</a><a href="https://etk.srail.kr/main.do" target="_blank" rel="noopener noreferrer">SRT 공식</a></div></footer></div></body></html>`;
}
export function stationIndexHtml(){
 const regions=[...new Set(FEATURED_STATIONS.map(s=>s.region))];
 const list=regions.map(region=>`<section class="sp-card"><h2>${escapeHtml(region)} 주요역</h2><div class="sp-link-list">${FEATURED_STATIONS.filter(s=>s.region===region).map(s=>stationLink(s)).join('')}</div></section>`).join('');
 const body=`<section class="sp-card"><h2>지역별 주요 기차역</h2><p>우선 자주 찾는 10개 역을 안내합니다. 지역을 선택한 후 역별 추천 목적지와 해당 날짜의 공식 시간표 조회로 이동할 수 있습니다. 전국 모든 역이 이 목록에 포함된 것은 아닙니다.</p><form action="/" method="get"><button class="sp-secondary-link" type="submit">전국 역 검색으로 이동 →</button></form></section><div class="sp-region-list">${list}</div><p class="sp-disclaimer">본 역 목록은 주요역 안내용입니다. 실제 시간표, 승차 가능 여부 및 운임은 날짜별 API 조회와 공식 예매처에서 확인해야 합니다.</p>`;
 return layout({path:'/stations/',title:'전국 주요 기차역 10곳 시간표 안내 | 레일맵',description:'서울역, 부산역, 수서역 등 주요 기차역을 지역별로 찾고 날짜별 공식 열차 시간표를 확인하세요.',heading:'전국 기차역 시간표 안내',crumbs:[['홈','/'],['기차역 목록']],body});
}
export function stationDetailHtml(s){
 if(!s)return null;
 const dest=recommendedDestinations(s.id);
 const destinations=dest.map(t=>`<a class="sp-link" href="${routeUrl(s.id,t.id)}"><strong>${escapeHtml(s.name)} → ${escapeHtml(t.name)}</strong><small>날짜별 열차 시간표·운임 조회</small><span aria-hidden="true">→</span></a>`).join('');
 const related=FEATURED_STATIONS.filter(t=>t.id!==s.id).slice(0,6).map(t=>stationLink(t)).join('');
 const body=`<section class="sp-card"><h2>${escapeHtml(s.name)}역 이용 안내</h2><p>${escapeHtml(s.note)} 아래의 구간은 자주 조회하는 목적지를 찾기 위한 안내이며, <strong>해당 날짜에 직통열차가 있음을 보장하지 않습니다.</strong></p><div class="sp-tags"><span>${escapeHtml(s.region)}</span><span>공식 시간표 조회</span><span>열차별 출발·도착</span></div></section><section class="sp-card"><h2>${escapeHtml(s.name)}역 출발 추천 구간</h2><p>목적지를 누른 뒤 날짜와 열차 종류를 고르면 TAGO 공식 시간표를 조회합니다.</p>${destinations?`<div class="sp-link-list">${destinations}</div>`:`<p>등록된 추천 구간이 없습니다. 전국 기차 검색에서 목적지를 직접 선택해 주세요.</p>`}<a href="/" class="sp-secondary-link">전체 기차 검색으로 이동 →</a></section><section class="sp-card"><h2>다른 주요역 찾아보기</h2><div class="sp-link-list">${related}</div></section><section class="sp-card"><h2>시간표·예매 주의사항</h2><p>기차 운행일, 요금, 임시열차와 운휴는 달라질 수 있습니다. 레일맵은 확정되지 않은 요금과 승강장 번호를 만들어 표시하지 않습니다.</p><div class="sp-external"><a href="https://www.korail.com/" rel="noopener noreferrer" target="_blank">코레일 공식 예매 ↗</a><a href="https://etk.srail.kr/main.do" rel="noopener noreferrer" target="_blank">SRT 공식 예매 ↗</a></div></section>`;
 return layout({path:stationUrl(s.id),title:`${s.name}역 시간표·목적지·기차표 안내 | 레일맵`,description:`${s.name}역 주요 구간을 찾아 날짜별 KTX·SRT·일반열차의 출발·도착 시간과 제공 요금을 공식 데이터로 조회하세요.`,heading:`${s.name}역 시간표 안내`,crumbs:[['홈','/'],['기차역 목록','/stations/'],[s.name+'역']],body});
}
export function routeDetailHtml(from,to){
 if(!from||!to||!isFeaturedPair(from.id,to.id))return null;
 const name=from.name+'역 → '+to.name+'역';
 const body=`<section class="sp-card" id="routeApp" data-from="${escapeHtml(from.id)}" data-to="${escapeHtml(to.id)}" data-from-name="${escapeHtml(from.name)}" data-to-name="${escapeHtml(to.name)}"><h2>날짜별 열차 시간표 조회</h2><p>선택한 날짜 기준으로 국토교통부 TAGO의 직통 열차 정보를 조회합니다. 요일별 고정 시간표가 아닙니다.</p><form id="routeSearchForm" class="sp-route-form"><label for="routeDate">출발 날짜</label><input id="routeDate" type="date" required><label for="routeGrade">열차 종류</label><select id="routeGrade"><option value="전체">전체</option><option value="KTX">KTX</option><option value="SRT">SRT</option><option value="일반">ITX·일반</option></select><button id="routeSubmit" type="submit">시간표 조회하기</button></form><p id="routeStatus" class="sp-result-status" role="status" aria-live="polite">해당 날짜의 시간표를 확인할 수 있습니다.</p><div id="routeResults" class="sp-route-results"><p class="sp-loading">공식 시간표를 조회할 날짜를 확인하세요.</p></div><p class="sp-disclaimer">직통 결과가 없더라도 환승 가능성이나 실제 운행 종료를 뜻하지 않습니다. 출발·도착·요금은 API가 제공하는 경우에만 표시합니다.</p></section><section class="sp-card"><h2>다른 방향·다른 역 찾기</h2><div class="sp-link-list"><a class="sp-link" href="${routeUrl(to.id,from.id)}"><strong>${escapeHtml(to.name)} → ${escapeHtml(from.name)}</strong><small>돌아오는 기차 시간표</small><span aria-hidden="true">→</span></a>${stationLink(from)}${stationLink(to)}</div></section><section class="sp-card"><h2>공식 승차권 예매</h2><p>레일맵은 실시간 좌석, 운휴, 당일 변경사항을 보증하지 않습니다. 실제 예매 조건은 운영사에서 확인하세요.</p><div class="sp-external"><a href="https://www.korail.com/" target="_blank" rel="noopener noreferrer">코레일 예매 ↗</a><a href="https://etk.srail.kr/main.do" target="_blank" rel="noopener noreferrer">SRT 예매 ↗</a></div></section>`;
 return layout({path:routeUrl(from.id,to.id),title:`${from.name}역에서 ${to.name}역 가는 기차 시간표·요금 | 레일맵`,description:`${name} 날짜별 KTX·SRT·일반열차 출발시간과 도착시간, 공식 데이터 제공 요금을 확인하세요.`,heading:`${name} 기차 시간표`,crumbs:[['홈','/'],['기차역 목록','/stations/'],[from.name+'역',stationUrl(from.id)],[to.name+'행 시간표']],body,script:'/route-detail.js'});
}
export function sitemapUrls(){
 return ['/','/stations/',...FEATURED_STATIONS.map(s=>stationUrl(s.id)),...FEATURED_PAIRS.flatMap(([a,b])=>[routeUrl(a,b),routeUrl(b,a)])];
}