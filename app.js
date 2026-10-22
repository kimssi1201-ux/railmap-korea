const FEATURED = [
  ['서울',37.5547,126.9706,'서울'],['용산',37.5299,126.9649,'서울'],['영등포',37.5155,126.9076,'서울'],['청량리',37.5802,127.0469,'서울'],['수서',37.4874,127.1013,'서울'],
  ['광명',37.4150,126.8844,'경기'],['수원',37.2659,127.0019,'경기'],['평택지제',37.0186,127.0706,'경기'],['동탄',37.1994,127.0959,'경기'],
  ['천안아산',36.7945,127.1045,'충남'],['천안',36.8098,127.1468,'충남'],['오송',36.6208,127.3270,'충북'],['조치원',36.6008,127.2961,'세종'],
  ['대전',36.3325,127.4346,'대전'],['서대전',36.3227,127.4036,'대전'],['논산',36.2042,127.0846,'충남'],['공주',36.3320,127.0846,'충남'],
  ['김천구미',36.1132,128.1806,'경북'],['구미',36.1284,128.3306,'경북'],['동대구',35.8795,128.6284,'대구'],['대구',35.8764,128.5961,'대구'],['경산',35.8190,128.7286,'경북'],
  ['경주',35.7987,129.1386,'경북'],['포항',36.0718,129.3417,'경북'],['울산',35.5516,129.1394,'울산'],['태화강',35.5351,129.3503,'울산'],
  ['부산',35.1151,129.0415,'부산'],['부전',35.1646,129.0574,'부산'],['구포',35.2068,128.9953,'부산'],['밀양',35.4749,128.7716,'경남'],
  ['창원중앙',35.2428,128.7005,'경남'],['창원',35.2579,128.6077,'경남'],['마산',35.2361,128.5775,'경남'],['진주',35.1500,128.1186,'경남'],
  ['익산',35.9401,126.9463,'전북'],['전주',35.8490,127.1619,'전북'],['정읍',35.5763,126.8429,'전북'],['김제',35.7900,126.8806,'전북'],
  ['광주송정',35.1378,126.7926,'광주'],['광주',35.1651,126.9104,'광주'],['나주',35.0090,126.7177,'전남'],['목포',34.7905,126.3876,'전남'],
  ['순천',34.9456,127.5033,'전남'],['여수엑스포',34.7545,127.7463,'전남'],['여천',34.7779,127.6630,'전남'],['남원',35.4049,127.3745,'전북'],
  ['강릉',37.7633,128.8996,'강원'],['정동진',37.6916,129.0327,'강원'],['동해',37.4984,129.1245,'강원'],['평창',37.4291,128.6691,'강원'],['진부',37.6441,128.5560,'강원'],
  ['원주',37.3248,127.9200,'강원'],['만종',37.3479,127.8977,'강원'],['제천',37.1285,128.2079,'충북'],['단양',36.9817,128.3313,'충북'],['영주',36.8118,128.6244,'경북'],['안동',36.5731,128.6955,'경북'],
  ['태백',37.1767,128.9887,'강원'],['춘천',37.8845,127.7169,'강원'],['남춘천',37.8648,127.7237,'강원'],['홍성',36.6017,126.6704,'충남'],['예산',36.6876,126.8280,'충남'],
].map(([name,lat,lng,region])=>({name,lat,lng,region}));
const byId = id => document.getElementById(id);
const $ = Object.fromEntries(['fromInput','toInput','searchForm','stationSuggestions','swapBtn','tripDate','todayBtn','tomorrowBtn','typeFilters','notice','serviceLabel','searchBtn','quickRoutes','favorites','clearRecentBtn','results','resultsSection','resultCount','resultsTitle','resultToolbar','sortSelect','map','mapSubline','mapBottom','locateBtn','resetMapBtn','stationDialog','closeDialogBtn','dialogBody','boardingDialog','closeBoardingBtn','boardingBody','platformHelpBtn','helpBtn','helpDialog','closeHelpBtn'].map(id=>[id,byId(id)]));
const SHORTCUTS = [['서울','부산'],['수서','동대구'],['서울','강릉'],['용산','광주송정']];
const STORAGE = 'railmap_v1_';
const state = {stations:[],connected:false,selected:{from:null,to:null},activeInput:null,filter:'전체',results:[],sort:'departure',map:null,pinLayer:null,routeLayer:null,markers:new Map(),favorites:load('favorites',[]),recent:load('recent',[]),lastSearched:null};
function load(key,fallback){try{const v=JSON.parse(localStorage.getItem(STORAGE+key));return Array.isArray(v)?v:fallback}catch{return fallback}}
function save(key,value){try{localStorage.setItem(STORAGE+key,JSON.stringify(value))}catch{}}
function safeText(str){return String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function normName(s){return String(s||'').replace(/\s/g,'').replace(/역$/,'').normalize('NFC').toLowerCase()}
function kstDate(dayShift=0){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const date=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)+dayShift));return date.toISOString().slice(0,10)}
function showNotice(text='',kind=''){ $.notice.textContent=text;$.notice.className='notice '+kind; }
function start(){setUpDate();renderQuickRoutes();renderFavorites();initMap();bindUI();loadStations()}
function setUpDate(){$.tripDate.min=kstDate();$.tripDate.max=kstDate(31);$.tripDate.value=kstDate()}
function initMap(){if(!window.L){$.map.innerHTML='<p style="padding:30px">지도 라이브러리를 불러오지 못했습니다. 연결을 확인해 주세요.</p>';return}const m=window.L.map('map',{zoomControl:false,minZoom:6,maxZoom:17}).setView([36.35,127.91],7);window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(m);window.L.control.zoom({position:'topright'}).addTo(m);state.map=m;state.pinLayer=window.L.layerGroup().addTo(m);state.routeLayer=window.L.layerGroup().addTo(m);drawPins();window.addEventListener('resize',()=>m.invalidateSize())}
function getAllPins(){return FEATURED.map(f=>{const actual=findLiveStation(f.name);return {...f,id:actual?.id||null,source:actual?'api':'preview'}})}
function findLiveStation(name){return state.stations.find(st=>normName(st.name)===normName(name))}
function drawPins(){if(!state.map)return;state.pinLayer.clearLayers();state.markers.clear();const pins=getAllPins();const selectedNames=new Set(Object.values(state.selected).filter(Boolean).map(x=>normName(x.name)));for(const pin of pins){const fav=state.favorites.includes(pin.name);const selected=selectedNames.has(normName(pin.name));const icon=window.L.divIcon({className:`station-pin ${selected?'is-selected':''} ${fav?'is-favorite':''}`,html:'<span class="pin-circle"></span>',iconSize:[20,20],iconAnchor:[10,10]});const marker=window.L.marker([pin.lat,pin.lng],{icon,title:`${pin.name}역 (${pin.region})`}).addTo(state.pinLayer);marker.bindTooltip(pin.name+'역',{direction:'top',className:'station-tooltip',offset:[0,-7]});marker.on('click',()=>showStationDialog(pin.name));state.markers.set(normName(pin.name),marker)}$.mapSubline.textContent=`주요역 ${pins.length}곳 · ${state.connected?'TAGO 조회 연결':'지도 미리보기'}`;drawRoute()}
function drawRoute(){if(!state.map)return;state.routeLayer.clearLayers();const a=FEATURED.find(x=>normName(x.name)===normName(state.selected.from?.name));const b=FEATURED.find(x=>normName(x.name)===normName(state.selected.to?.name));if(a&&b){window.L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color:'#07a699',weight:3,opacity:.9,dashArray:'7 9'}).addTo(state.routeLayer);$.mapBottom.innerHTML=`<strong>${safeText(a.name)} → ${safeText(b.name)}</strong><span>두 역을 잇는 참고용 직선입니다. 실제 철도 경로나 환승 안내가 아닙니다.</span>`}else{$.mapBottom.innerHTML='<strong>지도를 눌러 역을 선택하세요</strong><span>지도 핀은 역 위치 참고용이며 실제 선로 경로가 아닙니다.</span>'}}
async function loadStations(){try{const response=await fetch('/api/stations',{headers:{Accept:'application/json'}});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'역 목록을 조회하지 못했습니다.');state.stations=data.stations||[];state.connected=true;$.serviceLabel.textContent=`공식 역 목록 ${state.stations.length}개`;showNotice('공식 열차정보가 연결되었습니다. 출발역과 도착역을 검색하세요.','ok');updateSelectionsFromApi();renderFavorites();drawPins();}catch(e){state.connected=false;$.serviceLabel.textContent='시간표 연동 준비 중';showNotice('현재 지도 미리보기입니다. 시간표를 검색하려면 운영자가 TAGO API 키를 연결해야 합니다.','');} }
function updateSelectionsFromApi(){for(const side of ['from','to']){const sel=state.selected[side];if(!sel)continue;const updated=findLiveStation(sel.name);if(updated)state.selected[side]=updated}}
function bindUI(){for(const side of ['from','to']){const input=side==='from'?$.fromInput:$.toInput;input.addEventListener('focus',()=>{state.activeInput=side;renderSuggestions(input.value)});input.addEventListener('input',()=>{state.selected[side]=null;state.activeInput=side;renderSuggestions(input.value);drawPins()});input.addEventListener('keydown',event=>{if(event.key==='Escape')hideSuggestions();if(event.key==='Enter'&&!$.stationSuggestions.hidden){const first=$.stationSuggestions.querySelector('button');if(first){event.preventDefault();first.click()}}})}
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.station-field')&&!e.target.closest('.suggestions'))hideSuggestions()});$.swapBtn.addEventListener('click',()=>{const prevFrom=state.selected.from;state.selected.from=state.selected.to;state.selected.to=prevFrom;const prevText=$.fromInput.value;$.fromInput.value=$.toInput.value;$.toInput.value=prevText;drawPins()});$.todayBtn.addEventListener('click',()=>{$.tripDate.value=kstDate()});$.tomorrowBtn.addEventListener('click',()=>{$.tripDate.value=kstDate(1)});$.typeFilters.addEventListener('click',e=>{const btn=e.target.closest('[data-grade]');if(!btn)return;state.filter=btn.dataset.grade;for(const el of $.typeFilters.querySelectorAll('button')){el.classList.toggle('active',el===btn);el.setAttribute('aria-pressed',String(el===btn))}renderResults()});$.searchForm.addEventListener('submit',submitSearch);$.sortSelect.addEventListener('change',()=>{state.sort=$.sortSelect.value;renderResults()});$.resetMapBtn.addEventListener('click',()=>state.map?.setView([36.35,127.91],7));$.locateBtn.addEventListener('click',()=>{if(!navigator.geolocation){showNotice('현재 브라우저에서는 위치를 사용할 수 없습니다.','error');return}navigator.geolocation.getCurrentPosition(pos=>state.map?.setView([pos.coords.latitude,pos.coords.longitude],11),()=>showNotice('위치 사용이 허용되지 않았습니다.','error'),{timeout:8000})});$.closeDialogBtn.addEventListener('click',()=>$.stationDialog.close());$.closeBoardingBtn.addEventListener('click',()=>$.boardingDialog.close());$.platformHelpBtn.addEventListener('click',()=>showBoardingGuide({station:state.selected.from?.name||$.fromInput.value||''}));$.helpBtn.addEventListener('click',()=>$.helpDialog.showModal());$.closeHelpBtn.addEventListener('click',()=>$.helpDialog.close());$.clearRecentBtn.addEventListener('click',()=>{state.recent=[];save('recent',[]);renderQuickRoutes()});window.addEventListener('popstate',()=>{})}
function renderSuggestions(term){const active=state.activeInput;if(!active)return;const pool=state.connected?state.stations:FEATURED;const q=normName(term);let matching=pool.filter(x=>!q||normName(x.name).includes(q));matching=matching.sort((a,b)=>a.name.length-b.name.length||a.name.localeCompare(b.name,'ko')).slice(0,12);$.stationSuggestions.replaceChildren();if(!matching.length){const p=document.createElement('p');p.textContent='일치하는 역이 없습니다.';p.style.padding='0 12px';$.stationSuggestions.append(p)}for(const item of matching){const btn=document.createElement('button');btn.type='button';btn.setAttribute('role','option');const strong=document.createElement('strong');strong.textContent=item.name+'역';const small=document.createElement('small');small.textContent=item.region||item.id||'';btn.append(strong,small);btn.addEventListener('click',()=>selectStation(active,item));$.stationSuggestions.append(btn)}$.stationSuggestions.hidden=false;const input=active==='from'?$.fromInput:$.toInput;input.setAttribute('aria-expanded','true')}
function hideSuggestions(){$.stationSuggestions.hidden=true;$.fromInput.setAttribute('aria-expanded','false');$.toInput.setAttribute('aria-expanded','false')}
function selectStation(side,station){const actual=findLiveStation(station.name);state.selected[side]=actual||{...station,id:null};const inp=side==='from'?$.fromInput:$.toInput;inp.value=station.name;hideSuggestions();drawPins();if(state.map){const p=FEATURED.find(x=>normName(x.name)===normName(station.name));if(p)state.map.setView([p.lat,p.lng],Math.max(state.map.getZoom(),9))}}
function showStationDialog(name){const pin=FEATURED.find(x=>normName(x.name)===normName(name));const isFav=state.favorites.includes(name);$.dialogBody.innerHTML=`<div class="dialog-title">${safeText(name)}역</div><div class="dialog-sub">${safeText(pin?.region||'')} · ${state.connected?'검색 시 공식 역 코드를 확인합니다':'주요역 참고 위치'}</div><div class="dialog-actions"><button type="button" class="pick-from" data-select="from">출발역 선택</button><button type="button" data-select="to">도착역 선택</button></div><button class="star-save" type="button" id="favToggle">${isFav?'★ 즐겨찾기 해제':'☆ 즐겨찾기 추가'}</button><div class="station-boarding-help"><b>🚉 ${safeText(name)}역에서 어디로 가나요?</b><p>역 대합실 출발 전광판에서 열차번호·출발시각·행선지를 찾은 뒤 표시된 타는 곳으로 이동하세요. 실제 승강장 번호는 현장에서 확인해야 합니다.</p><button type="button" id="stationBoardingGuide">승강장 찾는 방법 보기 →</button></div>`;$.dialogBody.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>{selectStation(b.dataset.select,{name});$.stationDialog.close();expandPlanner(true)}));$.dialogBody.querySelector('#favToggle').addEventListener('click',()=>{toggleFavorite(name);$.stationDialog.close()});$.dialogBody.querySelector('#stationBoardingGuide').addEventListener('click',()=>{$.stationDialog.close();showBoardingGuide({station:name});});$.stationDialog.showModal()}
function toggleFavorite(name){state.favorites=state.favorites.includes(name)?state.favorites.filter(x=>x!==name):[...state.favorites,name].slice(0,24);save('favorites',state.favorites);renderFavorites();drawPins()}
function renderFavorites(){$.favorites.replaceChildren();if(!state.favorites.length){$.favorites.innerHTML='<span class="empty-fav">즐겨찾는 역이 아직 없어요.</span>';return}for(const name of state.favorites){const item=document.createElement('span');item.className='favorite-item';const btn=document.createElement('button');btn.type='button';btn.textContent='★ '+name;btn.title=name+'역 지도 보기';btn.addEventListener('click',()=>{const pin=FEATURED.find(x=>normName(x.name)===normName(name));if(pin){state.map?.setView([pin.lat,pin.lng],10);showStationDialog(name)}else{state.activeInput='from';renderSuggestions(name)}});const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title=name+' 즐겨찾기 삭제';remove.addEventListener('click',()=>toggleFavorite(name));item.append(btn,remove);$.favorites.append(item)}}
function renderQuickRoutes(){$.quickRoutes.replaceChildren();const routes=[...state.recent,...SHORTCUTS].filter((pair,i,arr)=>arr.findIndex(p=>p[0]===pair[0]&&p[1]===pair[1])===i).slice(0,6);for(const [from,to] of routes){const btn=document.createElement('button');btn.type='button';btn.className='route-pill';btn.innerHTML=`${safeText(from)}<span>→</span>${safeText(to)}`;btn.addEventListener('click',()=>{selectStation('from',{name:from});selectStation('to',{name:to});expandPlanner(true);document.getElementById('plannerContent').scrollTo({top:0,behavior:'smooth'});showNotice(state.connected?'원하는 날짜를 선택한 뒤 검색하세요.':'구간을 선택했습니다. 시간표는 API 연결 후 조회할 수 있습니다.')});$.quickRoutes.append(btn)}$.clearRecentBtn.hidden=state.recent.length===0}
async function submitSearch(event){event.preventDefault();hideSuggestions();if(!state.connected){showNotice('실제 운행시간표는 공식 TAGO API 인증키 연결 후 검색할 수 있습니다. 예시 시간표를 보여주지 않습니다.','error');return}let from=state.selected.from,to=state.selected.to;for(const side of ['from','to']){const input=side==='from'?$.fromInput:$.toInput;const selected=side==='from'?from:to;if(!selected||normName(selected.name)!==normName(input.value)){const live=findLiveStation(input.value);if(side==='from'){from=live;state.selected.from=live}else{to=live;state.selected.to=live}}}
 if(!from?.id||!to?.id){showNotice('검색 목록에서 출발역과 도착역을 각각 선택해 주세요.','error');return}if(from.id===to.id){showNotice('출발역과 도착역을 다르게 선택해 주세요.','error');return}const date=$.tripDate.value;if(!date||date<$.tripDate.min||date>$.tripDate.max){showNotice('오늘부터 31일 이내 날짜를 선택해 주세요.','error');return}
 $.searchBtn.disabled=true;$.searchBtn.querySelector('span').textContent='시간표 확인 중…';$.results.innerHTML='<div class="empty-results"><span class="empty-icon">⌛</span><strong>공식 운행정보를 조회하고 있어요.</strong></div>';expandPlanner(true);scrollPlannerTo($.resultsSection);try{const url=new URL('/api/trains',location.origin);url.searchParams.set('from',from.id);url.searchParams.set('to',to.id);url.searchParams.set('date',date);const response=await fetch(url);const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'조회에 실패했습니다.');state.results=data.trains||[];state.lastSearched={from:from.name,to:to.name,date,partial:!!data.partial};state.recent=[[from.name,to.name],...state.recent.filter(pair=>pair[0]!==from.name||pair[1]!==to.name)].slice(0,4);save('recent',state.recent);renderQuickRoutes();renderResults();showNotice(`${from.name} → ${to.name} · ${date}의 공식 운행정보를 조회했습니다. 좌석·결제는 예매처에서 확인하세요.`,'ok')}catch(err){state.results=[];state.lastSearched=null;$.results.innerHTML=`<div class="empty-results"><span class="empty-icon">⚠</span><strong>조회할 수 없습니다</strong><p>${safeText(err.message)}</p></div>`;showNotice(err.message,'error')}finally{$.searchBtn.disabled=false;$.searchBtn.querySelector('span').textContent='열차 시간표 검색';drawPins()}}
function timeString(raw){const digits=String(raw||'').replace(/\D/g,'');if(digits.length<12)return null;return digits.slice(8,10)+':'+digits.slice(10,12)}
function durationMinutes(row){const dep=String(row.depTime||'').replace(/\D/g,'');const arr=String(row.arrTime||'').replace(/\D/g,'');if(dep.length<12||arr.length<12)return null;const a=Date.UTC(+dep.slice(0,4),+dep.slice(4,6)-1,+dep.slice(6,8),+dep.slice(8,10),+dep.slice(10,12));const b=Date.UTC(+arr.slice(0,4),+arr.slice(4,6)-1,+arr.slice(6,8),+arr.slice(8,10),+arr.slice(10,12));return b>=a?Math.round((b-a)/60000):null}
function formatDuration(n){if(n==null)return '소요시간 미제공';return `${Math.floor(n/60)}시간 ${n%60}분`}
function visibleResults(){let rows=state.results.filter(row=>{const g=(row.grade||'').toUpperCase();if(state.filter==='전체')return true;if(state.filter==='KTX')return g.includes('KTX');if(state.filter==='SRT')return g.includes('SRT');return !g.includes('KTX')&&!g.includes('SRT')});if(state.sort==='duration'){rows.sort((a,b)=>(durationMinutes(a)??99999)-(durationMinutes(b)??99999)||String(a.depTime).localeCompare(String(b.depTime)))}else if(state.sort==='fare'){rows.sort((a,b)=>(a.adultFare??Infinity)-(b.adultFare??Infinity)||String(a.depTime).localeCompare(String(b.depTime)))}else rows.sort((a,b)=>String(a.depTime).localeCompare(String(b.depTime)));return rows}
function boardStatus(boarding){
  const platform = boarding?.platformNo;
  const source = boarding?.source;
  const checkedAt = boarding?.checkedAt;
  // 승강장 번호는 날짜/역/열차에 대응하는 신뢰 가능한 확인 출처가 함께 있어야 표시합니다.
  const verified = typeof platform==='string' && /^\d{1,2}$/.test(platform) && typeof source==='string' && source.length>0 && typeof checkedAt==='string' && checkedAt.length>0;
  return verified ? {verified:true,number:platform,source,checkedAt} : {verified:false};
}
function showBoardingGuide({station='',row=null}={}){
  const fromName=station||row?.fromName||state.lastSearched?.from||'출발역';
  const status=boardStatus(row?.boarding);
  const when=row?.depTime?timeString(row.depTime):null;
  const train=row?.trainNo?`<span>열차 ${safeText(row.trainNo)}</span>`:'';
  const whenHtml=when?`<span>출발 ${safeText(when)}</span>`:'';
  $.boardingBody.innerHTML=`
    <p class="boarding-guide-eyebrow">승차 위치 안내</p>
    <h2 class="boarding-guide-title">${safeText(fromName)}역에서<br/>어디서 타나요?</h2>
    <div class="boarding-train-meta">${train}${whenHtml}</div>
    <div class="platform-big ${status.verified?'platform-verified':'platform-unknown'}">
      <span class="platform-label">타는 곳 · 승강장</span>
      <strong>${status.verified?`${safeText(status.number)}번 승강장`:'현장 확인 필요'}</strong>
      <small>${status.verified?`출처: ${safeText(status.source)} · ${safeText(status.checkedAt)} 확인`:'공개 시간표에는 열차별 승강장 번호가 없습니다.'}</small>
    </div>
    <h3 class="boarding-steps-heading">역에서 타는 곳 찾는 순서</h3>
    <ol class="boarding-steps">
      <li><span class="step-number">1</span><div><strong>${safeText(fromName)}역 대합실로 이동</strong><p>지도에 표시된 역 위치를 참고하고 실제 출입구·층수는 현장 표지판을 확인하세요.</p></div></li>
      <li><span class="step-number">2</span><div><strong>출발 전광판에서 열차 찾기</strong><p>열차번호${row?.trainNo?' '+safeText(row.trainNo):''} · 출발시간${when?' '+safeText(when):''} · 행선지를 함께 대조하세요.</p></div></li>
      <li><span class="step-number">3</span><div><strong>전광판의 ‘타는 곳’ 번호 확인</strong><p>표시된 승강장(플랫폼) 안내 표지판을 따라 이동하세요. 번호는 당일 변경될 수 있습니다.</p></div></li>
      <li><span class="step-number">4</span><div><strong>승차권의 호차·좌석 확인</strong><p>승강장에서 객차 위치 표시를 보고 본인의 호차가 서는 곳에서 기다리세요.</p></div></li>
    </ol>
    <div class="boarding-safety">⚠ 안내: 현장 전광판·역 직원의 최신 안내가 최우선입니다. 역 내부 실내 길찾기 및 확정 플랫폼 번호는 아직 제공하지 않습니다.</div>
    <div class="boarding-dialog-actions"><button type="button" id="boardingMapBtn">역 위치 지도 보기</button><a target="_blank" rel="noopener noreferrer" href="https://www.korail.com/ticket/reserve">코레일 공식 확인 ↗</a></div>
  `;
  $.boardingBody.querySelector('#boardingMapBtn').addEventListener('click',()=>{const pin=FEATURED.find(x=>normName(x.name)===normName(fromName));$.boardingDialog.close();if(pin&&state.map){state.map.setView([pin.lat,pin.lng],12,{animate:true});if(window.innerWidth<=800)expandPlanner(false);}else showNotice('지도에 해당 역의 검증된 위치가 없어 지도를 이동하지 않았습니다.');});
  if(!$.boardingDialog.open)$.boardingDialog.showModal();
}
function renderResults(){
  const rows=visibleResults();$.resultToolbar.hidden=!state.lastSearched||!state.results.length;$.resultsTitle.textContent=state.lastSearched?`${state.lastSearched.from} → ${state.lastSearched.to}`:'열차 조회 결과';$.resultCount.textContent=state.lastSearched?`${rows.length}건${state.lastSearched.partial?' + 추가 결과':''}`:'—';if(!state.lastSearched)return;
  if(!rows.length){$.results.innerHTML='<div class="empty-results"><span class="empty-icon">🚉</span><strong>조건에 맞는 직통 열차가 없습니다.</strong><p>다른 날짜나 열차 종류를 선택해 보세요.<br/>환승 연결편은 현재 자동 계산하지 않습니다.</p></div>';return}
  $.results.replaceChildren();for(const row of rows){const duration=durationMinutes(row);const isSrt=(row.grade||'').toUpperCase().includes('SRT');const bookingURL=isSrt?'https://etk.srail.kr/main.do':'https://www.korail.com/ticket/reserve';const status=boardStatus(row.boarding);const card=document.createElement('article');card.className='result-card';card.innerHTML=`<div class="result-card-head"><span class="train-badge ${/(KTX|SRT)/i.test(row.grade)?'':'normal'}">${safeText(row.grade||'열차')}</span><span class="train-number">${row.trainNo?'열차 '+safeText(row.trainNo):'공식 운행정보'}</span></div><div class="times"><div><span class="clock">${safeText(timeString(row.depTime)||'—')}</span><span class="sub">${safeText(row.fromName||state.lastSearched.from)}</span></div><div class="duration">${safeText(formatDuration(duration))}<div class="rail-line"></div><small>직통 운행정보</small></div><div><span class="clock">${safeText(timeString(row.arrTime)||'—')}</span><span class="sub">${safeText(row.toName||state.lastSearched.to)}</span></div></div><div class="boarding-row"><div class="boarding-row-icon">🚉</div><div class="boarding-row-copy"><span>타는 곳 · 승강장</span><strong>${status.verified?`${safeText(status.number)}번 승강장`:'현장 확인 필요'}</strong></div><button type="button" class="boarding-guide-btn">탑승 안내 →</button></div><div class="result-card-foot"><span class="fare">${row.adultFare!=null&&row.adultFare>0?`${Number(row.adultFare).toLocaleString('ko-KR')}원`: '<small>운임 미제공</small>'}</span><a class="book-button" href="${bookingURL}" target="_blank" rel="noopener noreferrer">공식 예매처 ↗</a></div>`;
    card.querySelector('.boarding-guide-btn').addEventListener('click',()=>showBoardingGuide({station:row.fromName||state.lastSearched.from,row}));$.results.append(card);
  }
  const info=document.createElement('p');info.className='disclaimer';info.textContent='※ 공개 열차 시간표에서는 실제 승강장 번호를 조회할 수 없습니다. 열차번호·출발시각으로 현장 출발 전광판에서 타는 곳을 확인하세요. 운임·좌석·지연 및 결제정보도 공식 예매처에서 다시 확인해야 합니다.';$.results.append(info);
}
// Map-first layout: floating station search and a collapsible iPhone planning sheet.
const mapSearchInput = byId('mapSearchInput');
const mapSearchResults = byId('mapSearchResults');
const mapSearchClear = byId('mapSearchClear');
const plannerSheet = byId('plannerSheet');
const sheetToggleBtn = byId('sheetToggleBtn');
const sheetToggleText = byId('sheetToggleText');
let plannerExpanded = false;
function scrollPlannerTo(target) {
  const host = byId('plannerContent');
  if (!host || !target) return;
  host.scrollLeft = 0;
  const nextTop = host.scrollTop + target.getBoundingClientRect().top - host.getBoundingClientRect().top;
  host.scrollTo({top:Math.max(0,nextTop),left:0,behavior:'smooth'});
}
function expandPlanner(expanded = true) {
  plannerExpanded = expanded;
  const scrollHost = byId('plannerContent');
  if (scrollHost) scrollHost.scrollLeft = 0;
  plannerSheet.classList.toggle('sheet-expanded', expanded);
  sheetToggleBtn.setAttribute('aria-expanded', String(expanded));
  sheetToggleText.textContent = expanded ? '지도 크게 보기' : '기차 시간표 검색 열기';
  if (state.map) setTimeout(() => state.map.invalidateSize(), 260);
}
function closeMapSearch() {
  mapSearchResults.hidden = true;
  mapSearchInput.setAttribute('aria-expanded', 'false');
}
function renderMapSearch() {
  const q = normName(mapSearchInput.value.trim());
  mapSearchClear.hidden = !q;
  mapSearchResults.replaceChildren();
  if (!q) { closeMapSearch(); return; }
  const stations = (state.connected ? state.stations : FEATURED)
    .filter(item => normName(item.name).includes(q) || String(item.region || '').includes(q))
    .slice(0, 9);
  if (!stations.length) {
    const p = document.createElement('p');
    p.className = 'map-search-empty'; p.textContent = '검색된 역이 없어요. 다른 역명을 입력해 주세요.';
    mapSearchResults.append(p);
  }
  for (const item of stations) {
    const btn = document.createElement('button');
    btn.className = 'map-search-result'; btn.type = 'button'; btn.setAttribute('role', 'option');
    const dot = document.createElement('span'); dot.className = 'search-result-dot'; dot.textContent = '⌖';
    const details = document.createElement('span');
    const label = document.createElement('strong'); label.textContent = item.name + '역';
    const place = document.createElement('small'); place.textContent = item.region || '기차역';
    details.append(label, place);
    const arrow = document.createElement('span'); arrow.className = 'map-search-result-arrow'; arrow.textContent = '›';
    btn.append(dot,details,arrow);
    btn.addEventListener('click', () => {
      mapSearchInput.value = item.name;
      mapSearchClear.hidden = false;
      closeMapSearch();
      const pin = FEATURED.find(p => normName(p.name) === normName(item.name));
      if (pin && state.map) state.map.setView([pin.lat,pin.lng],Math.max(state.map.getZoom(),11),{animate:true});
      showStationDialog(item.name);
    });
    mapSearchResults.append(btn);
  }
  mapSearchResults.hidden = false;
  mapSearchInput.setAttribute('aria-expanded', 'true');
}
mapSearchInput.addEventListener('input',renderMapSearch);
mapSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMapSearch();mapSearchInput.blur(); }
  if (e.key === 'Enter' && !mapSearchResults.hidden) {
    const first = mapSearchResults.querySelector('button');
    if (first) {e.preventDefault();first.click();}
  }
});
mapSearchClear.addEventListener('click',() => {mapSearchInput.value='';renderMapSearch();mapSearchInput.focus();});
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.floating-search-wrap')) closeMapSearch();
});
let ignoreSheetClick = false;
sheetToggleBtn.addEventListener('click',() => { if (ignoreSheetClick) {ignoreSheetClick=false; return;} expandPlanner(!plannerExpanded); });
byId('openPlannerBtn').addEventListener('click',() => expandPlanner(true));
byId('openPlannerTopBtn').addEventListener('click',() => expandPlanner(true));
// Accessible mobile sheet gestures, without overriding map touch gestures.
let sheetTouchY = null;
sheetToggleBtn.addEventListener('touchstart',e => {sheetTouchY=e.touches[0]?.clientY ?? null;},{passive:true});
sheetToggleBtn.addEventListener('touchend',e => {
  if(sheetTouchY == null)return;
  const delta=(e.changedTouches[0]?.clientY??sheetTouchY)-sheetTouchY;
  sheetTouchY=null;
  if(Math.abs(delta)>35){ignoreSheetClick=true;expandPlanner(delta<0);setTimeout(() => {ignoreSheetClick=false;},450);}
},{passive:true});

start();