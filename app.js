import {destinationCandidates,prioritizeDestinationCandidates,verifiedDestinationResponse} from './train-destinations.js';
import {hasConfirmedSchedule} from './result-visibility.js';
import {renderTrainTimetable} from './timetable-view.js';
import {normalizeName,ensureMajorStations,getStation} from './station-utils.js';
import {stationPickerMatches,destinationPickerMatches,stationPickerRegions} from './station-picker.js';
import {matchesTrainFilter} from './train-types.js';
'use strict';
const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['searchForm','fromInput','toInput','swapBtn','suggestions','tripDate','todayBtn','tomorrowBtn','typeFilters','searchBtn','serviceStatus','notice','quickRoutes','clearRecentBtn','resultsSection','resultsTitle','resultCount','resultToolbar','sortSelect','results','boardingHelp','boardingDialog','boardingClose','boardingContent','helpOpen','helpDialog','helpClose','destinationStatus','destinationModeToggle','destinationMore'].map(id=>[id,$(id)]));
const SHORTCUTS=[['서울','부산'],['수서','부산'],['용산','목포'],['청량리','강릉'],['서울','대전']];
const state={stations:[],connected:false,selected:{from:null,to:null},active:null,filter:'전체',sort:'departure',trains:[],lastQuery:null,partial:false,recent:readRecent(),requestSeq:0,destinationMode:'all',destinationItems:[],destinationSeq:0,destinationLoading:false,pickerSide:null,pickerRegion:''};
const norm=normalizeName;
function readRecent(){try{const rows=JSON.parse(localStorage.getItem('railmap_recent_v5')||'[]');return Array.isArray(rows)?rows.filter(r=>Array.isArray(r)&&r.length===2&&r.every(x=>typeof x==='string')).slice(0,4):[]}catch{return []}}
function saveRecent(){try{localStorage.setItem('railmap_recent_v5',JSON.stringify(state.recent))}catch{}}
function localDate(offset=0){const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});const p=Object.fromEntries(fmt.formatToParts(new Date()).map(x=>[x.type,x.value]));const ms=Date.UTC(+p.year,+p.month-1,+p.day+offset);return new Date(ms).toISOString().slice(0,10)}
function notice(text='',kind=''){ui.notice.textContent=text;ui.notice.className='notice'+(kind?' '+kind:'')}
function setStatus(label,kind=''){ui.serviceStatus.textContent=label;ui.serviceStatus.className='service-status'+(kind?' '+kind:'')}
function text(tag,value,className){const n=document.createElement(tag);if(className)n.className=className;n.textContent=value;return n}
function findStation(name){return getStation(state.stations,name)}
function closeSuggestions(){ui.suggestions.hidden=true;ui.fromInput.setAttribute('aria-expanded','false');ui.toInput.setAttribute('aria-expanded','false')}
function showSuggestions(side){
 const input=side==='from'?ui.fromInput:ui.toInput;
 if(state.pickerSide!==side){state.pickerSide=side;state.pickerRegion=''}
 state.active=side;
 const pool=side==='to'&&state.destinationMode==='verified'?state.destinationItems:state.stations;
 const canBrowseRegions=side==='from'||state.destinationMode==='all';
 const region=canBrowseRegions?state.pickerRegion:'';
 const candidates=side==='to'&&state.destinationMode==='all'&&state.selected.from
  ?destinationCandidates(state.selected.from,state.stations,18):[];
 const hits=side==='to'&&state.destinationMode==='all'
  ?destinationPickerMatches(pool,input.value,region,state.selected.from,candidates)
  :stationPickerMatches(pool,input.value,region);
 ui.suggestions.replaceChildren();
 if(canBrowseRegions){
  const head=text('div','','station-picker-head');
  const eligible=side==='to'?pool.filter(s=>s.id!==state.selected.from?.id):pool;
  const total=eligible.length;
  const count=text('strong','전국 '+total+'개 역 · '+hits.length+'개 표시','station-picker-count');
  const select=document.createElement('select');select.className='station-picker-region';
  select.setAttribute('aria-label','역을 찾을 시·도 선택');
  select.append(new Option('모든 지역 · '+total+'개',''));
  for(const {region:regionName,count:regionCount} of stationPickerRegions(eligible)){
   select.append(new Option(regionName+' · '+regionCount+'개',regionName));
  }
  select.value=region;
  select.addEventListener('change',()=>{state.pickerRegion=select.value;showSuggestions(side)});
  head.append(count,select);ui.suggestions.append(head);
  if(side==='to'&&state.destinationMode==='all'&&state.selected.from&&!norm(input.value)&&!state.pickerRegion){
   ui.suggestions.append(text('div','참고 노선의 역부터 보여드립니다. 직통 운행은 검색 후 확인해 주세요.','station-picker-verified'));
  }
 }else{
  ui.suggestions.append(text('div','선택한 날짜에 확인된 직통 목적지 '+hits.length+'개','station-picker-verified'));
 }
 if(!state.connected){
  ui.suggestions.append(text('div','공식 역 목록을 불러오는 중입니다.','no-match'));
 }else if(!hits.length){
  ui.suggestions.append(text('div',side==='to'&&state.destinationMode==='verified'?(state.destinationLoading?'공식 시간표로 직통 도착역을 확인 중입니다.':'확인된 직통 도착역이 없습니다. 다른 날짜나 전국 검색을 이용해 주세요.'):'일치하는 역이 없습니다. 지역을 바꾸거나 역 이름을 검색해 주세요.','no-match'));
 }else{
  for(const station of hits){
   const button=document.createElement('button');button.type='button';
   button.setAttribute('role','option');
   button.append(text('strong',station.name.endsWith('역')?station.name:station.name+'역'));
   if(canBrowseRegions){
    const suggested=side==='to'&&candidates.some(x=>x.id===station.id);
    button.append(text('small',suggested?'노선 후보 · 미확인':station.region||'지역 미분류'));
   }
   button.addEventListener('click',()=>selectStation(side,station));
   ui.suggestions.append(button);
  }
 }
 if(canBrowseRegions&&hits.length>4)ui.suggestions.append(text('div','↓ 목록을 아래로 스크롤하면 나머지 역도 볼 수 있어요. 역 이름을 입력하면 더 빠릅니다.','station-picker-foot'));
 ui.suggestions.scrollTop=0;
 ui.suggestions.hidden=false;
 input.setAttribute('aria-expanded','true');
}
function selectStation(side,station){state.selected[side]=station;const input=side==='from'?ui.fromInput:ui.toInput;input.value=station.name;closeSuggestions();input.blur();if(side==='from')refreshDestinations()}
function tryResolve(side){const input=side==='from'?ui.fromInput:ui.toInput;const selected=state.selected[side];if(selected&&norm(selected.name)===norm(input.value))return selected;const matching=side==='to'&&state.destinationMode==='verified'?getStation(state.destinationItems,input.value):findStation(input.value);if(matching){state.selected[side]=matching;input.value=matching.name;return matching}return null}
function dateInit(){ui.tripDate.min=localDate();ui.tripDate.max=localDate(31);ui.tripDate.value=localDate()}
function quickRoutes(){ui.quickRoutes.replaceChildren();const allPairs=[...state.recent,...SHORTCUTS].filter((r,i,a)=>a.findIndex(x=>x[0]===r[0]&&x[1]===r[1])===i);const pairs=(state.connected?allPairs.filter(([a,b])=>findStation(a)&&findStation(b)):allPairs).slice(0,7);pairs.forEach(([from,to])=>{const b=document.createElement('button');b.type='button';b.append(text('strong',from),text('span','→'),text('strong',to));b.addEventListener('click',()=>{ui.fromInput.value=from;ui.toInput.value=to;state.selected.from=findStation(from);state.selected.to=findStation(to);closeSuggestions();document.activeElement?.blur();if(state.connected&&state.selected.from){state.destinationMode='all';ui.destinationModeToggle.textContent='확인된 직통역만 보기';refreshDestinations({keepTo:true})}if(state.connected&&(!state.selected.from||!state.selected.to)){notice('해당 구간의 역 코드가 공식 목록에 없어 조회할 수 없습니다. 다른 구간을 선택해 주세요.','error');return}notice(state.connected?'구간 선택 완료 · 실제 직통 배차는 시간표 검색에서 확인합니다.':'역 정보 연결을 확인하는 중입니다.');ui.searchBtn.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})});ui.quickRoutes.append(b)});ui.clearRecentBtn.hidden=!state.recent.length}
async function loadStations(){setStatus('역 정보 연결 중');try{const response=await fetch('/api/stations?v=nationwide-regions-v1',{cache:'no-store',headers:{Accept:'application/json'}});const body=await response.json();if(!response.ok||!body.ok||!Array.isArray(body.stations))throw new Error(body.error||'역 목록 조회에 실패했습니다.');state.stations=ensureMajorStations(body.stations.filter(s=>s&&typeof s.name==='string'&&typeof s.id==='string'));if(!state.stations.length)throw new Error('조회 가능한 역이 없습니다.');state.connected=true;setStatus(`전국 역 ${state.stations.length}개 연결`,'ok');if(body.partial)notice('일부 지역 역 정보가 누락되어 주요 역 코드를 보완했습니다. 운행정보는 검색 시 공식 API로 확인합니다.');quickRoutes();if(ui.suggestions.hidden===false&&state.active)showSuggestions(state.active);for(const side of ['from','to'])tryResolve(side);if(state.selected.from)refreshDestinations()}catch(error){state.connected=false;setStatus('시간표 연결 확인 필요','error');notice((error.message||'역 목록 조회 오류')+' Cloudflare의 TAGO_API_KEY 및 API 활용 승인 상태를 확인해 주세요.','error');closeSuggestions()}}

// Verify only a small first group. Further destinations are queried on demand.
// This preserves TAGO accuracy without delaying the entire mobile search.
const DEST_BATCH_SIZE=4;
const DEST_TIMEOUT_MS=6500;
const DEST_CACHE_MS=120000;
const destinationScheduleCache=new Map();
let activeDestinationController=null;
let destinationQueue=[],destinationOffset=0,destinationChecking=false,destinationOldTo=null;
function destStatus(message){ui.destinationStatus.textContent=message}
function destinationMoreState(){
 ui.destinationMore.hidden=state.destinationMode!=='verified'||!state.selected.from||destinationOffset>=destinationQueue.length;
 ui.destinationMore.disabled=destinationChecking;
 ui.destinationMore.textContent=destinationChecking?'확인 중…':'다른 목적지 더 확인 ('+(destinationQueue.length-destinationOffset)+'곳 남음)';
}
function changeDestinationMode(){
 const all=state.destinationMode==='verified';
 state.destinationMode=all?'all':'verified';
 activeDestinationController?.abort();
 state.destinationSeq++;
 state.destinationLoading=false;destinationChecking=false;destinationQueue=[];destinationOffset=0;
 state.destinationItems=[];closeSuggestions();
 ui.destinationModeToggle.textContent=all?'확인된 직통역만 보기':'전국 역 모두 보기';
 refreshDestinations({keepTo:true});
}
function cachedSchedule(key){
 const item=destinationScheduleCache.get(key);
 if(!item)return null;
 if(Date.now()-item.time>DEST_CACHE_MS){destinationScheduleCache.delete(key);return null}
 return item.body;
}
async function verifyDestination(origin,station,date,grade,signal){
 const key=origin.id+'|'+station.id+'|'+date;
 let body=cachedSchedule(key);
 if(!body){
  const url=new URL('/api/trains',location.origin);
  for(const [k,v] of Object.entries({from:origin.id,to:station.id,date}))url.searchParams.set(k,v);
  const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal});
  body=await response.json();
  if(!response.ok||!body.ok)return {state:'error',count:0};
  if(!body.partial){
   if(destinationScheduleCache.size>150)destinationScheduleCache.clear();
   destinationScheduleCache.set(key,{time:Date.now(),body});
  }
 }
 return verifiedDestinationResponse(body,grade);
}
async function scanMoreDestinations(){
 if(destinationChecking||state.destinationMode!=='verified'||!state.selected.from)return;
 const origin=state.selected.from,token=state.destinationSeq,date=ui.tripDate.value,grade=state.filter;
 const batch=destinationQueue.slice(destinationOffset,destinationOffset+DEST_BATCH_SIZE);
 if(!batch.length){destinationMoreState();return}
 destinationOffset+=batch.length;
 destinationChecking=true;state.destinationLoading=true;destinationMoreState();
 const controller=new AbortController();
 activeDestinationController?.abort();activeDestinationController=controller;
 const timer=setTimeout(()=>controller.abort(),DEST_TIMEOUT_MS);
 let completed=0,failed=0;
 destStatus('공식 시간표 확인 중 · '+batch.length+'곳 (확인된 목적지는 먼저 표시합니다)');
 try{
  await Promise.all(batch.map(async station=>{
   let outcome={state:'error',count:0};
   try{outcome=await verifyDestination(origin,station,date,grade,controller.signal)}
   catch{}
   if(token!==state.destinationSeq)return;
   completed++;
   if(outcome.state==='confirmed'&&!state.destinationItems.some(x=>x.id===station.id)){
    state.destinationItems.push(station);
    state.destinationItems.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    ui.toInput.disabled=false;
    ui.toInput.placeholder='확인된 도착역만 검색';
    if(destinationOldTo?.id===station.id){state.selected.to=station;ui.toInput.value=station.name}
    if(state.active==='to'&&!ui.suggestions.hidden)showSuggestions('to');
   }else if(outcome.state==='error'||outcome.state==='unknown')failed++;
   destStatus(completed+'/'+batch.length+'곳 확인 · 직통 '+state.destinationItems.length+'곳'+(failed?' · 일부 서버 응답 실패':''));
  }));
 }finally{
  clearTimeout(timer);
  if(token!==state.destinationSeq)return;
  destinationChecking=false;state.destinationLoading=false;
  destinationMoreState();
  const found=state.destinationItems.length,more=destinationQueue.length-destinationOffset;
  destStatus(found
   ?'직통 '+found+'곳 확인'+(more?' · 다른 후보 '+more+'곳은 아래 버튼으로 추가 확인':'')+(failed?' · 일부 조회 실패':'')
   :failed?'일부 공식 API 조회가 실패했습니다. 전체 역 검색도 이용할 수 있습니다.'
   :'이번 후보 '+batch.length+'곳에서 직통편을 확인하지 못했습니다.'+(more?' 다른 후보를 추가 확인하세요.':' 전체 역 검색을 이용해 주세요.'));
 }
}
function refreshDestinations({keepTo=false}={}){
 const origin=state.selected.from;
 const oldTo=keepTo?state.selected.to:null;
 state.destinationSeq++;
 activeDestinationController?.abort();
 destinationChecking=false;destinationOffset=0;destinationOldTo=oldTo;
 destinationQueue=[];state.destinationItems=[];state.destinationLoading=false;
 state.selected.to=null;ui.toInput.value='';
 if(state.destinationMode==='all'){
  if(oldTo&&oldTo.id!==origin?.id&&state.stations.some(s=>s.id===oldTo.id)){
   state.selected.to=oldTo;ui.toInput.value=oldTo.name;
  }
  ui.toInput.disabled=!state.connected;
  ui.toInput.placeholder='전국 도착역 검색';
  destStatus('전국 모든 역에서 직접 검색합니다. 직통 여부는 시간표 결과로 확인해 주세요.');
  destinationMoreState();return;
 }
 if(!origin||!state.connected){
  ui.toInput.disabled=true;ui.toInput.placeholder='출발역을 먼저 선택하세요';
  destStatus('출발역을 고르면 공식 시간표로 주요 직통 목적지를 확인합니다.');
  destinationMoreState();return;
 }
 destinationQueue=prioritizeDestinationCandidates(destinationCandidates(origin,state.stations,18),oldTo,origin.id,18);
 ui.toInput.disabled=true;ui.toInput.placeholder='주요 목적지 확인 중…';
 if(!destinationQueue.length){
  destStatus('이 역의 추천 후보가 없습니다. 전체 역 검색을 이용해 주세요.');
  destinationMoreState();return;
 }
 destinationMoreState();
 scanMoreDestinations();
}

function toMinutes(t){const s=String(t||'');if(!/^\d{12,14}$/.test(s))return null;const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),h=+s.slice(8,10),n=+s.slice(10,12);return Date.UTC(y,m-1,d,h,n)/60000}
function formatTime(s){const t=String(s||'');return /^\d{12,14}$/.test(t)?t.slice(8,10)+':'+t.slice(10,12):'—'}
function duration(row){const a=toMinutes(row.depTime),b=toMinutes(row.arrTime);return a!==null&&b!==null&&b>=a?b-a:null}
function durationLabel(row){const v=duration(row);if(v===null)return '소요시간 확인';const h=Math.floor(v/60),m=v%60;return h?`${h}시간 ${m}분`:`${m}분`}
function fareLabel(row){return Number.isFinite(row.adultFare)&&row.adultFare>0?row.adultFare.toLocaleString('ko-KR')+'원':'요금 확인'}
function isGrade(row){return matchesTrainFilter(row.grade,state.filter)}
function renderedRows(){const rows=state.trains.filter(isGrade);if(state.sort==='duration')rows.sort((a,b)=>(duration(a)??Infinity)-(duration(b)??Infinity)||String(a.depTime).localeCompare(String(b.depTime)));else if(state.sort==='fare')rows.sort((a,b)=>(a.adultFare||Infinity)-(b.adultFare||Infinity)||String(a.depTime).localeCompare(String(b.depTime)));else rows.sort((a,b)=>String(a.depTime).localeCompare(String(b.depTime)));return rows}
function emptyResults(title,detail,emoji='🚆'){ui.results.replaceChildren();const root=text('div','','empty-state');root.append(text('span',emoji),text('strong',title),text('p',detail));ui.results.append(root)}
function renderResults(){
 ui.results.replaceChildren();
 if(!state.lastQuery){ui.resultsSection.hidden=true;ui.resultCount.textContent='—';ui.resultToolbar.hidden=true;emptyResults('가고 싶은 곳을 검색해 보세요','실제 열차 시간표를 확인하고 비교할 수 있어요.');return}
 const rows=renderedRows();
 ui.resultsTitle.textContent=state.lastQuery.from+' → '+state.lastQuery.to;
 ui.resultCount.textContent=rows.length+'건';ui.resultToolbar.hidden=state.trains.length===0;
 if(!hasConfirmedSchedule(rows)){ui.resultsSection.hidden=true;notice(state.trains.length?'선택한 열차 종류에 해당하는 시간표가 없습니다. 전체 열차를 선택해 보세요.':'해당 날짜에 TAGO 직통 시간표가 확인되지 않았습니다. 실제 운행 여부는 공식 예매처에서 확인해 주세요.');return}
 ui.resultsSection.hidden=false;
 renderTrainTimetable(ui.results,rows,{from:state.lastQuery.from,to:state.lastQuery.to,date:state.lastQuery.date,onBoarding:openBoarding});
 if(state.partial)ui.results.append(text('p','공식 API 응답이 일부만 제공되어 추가 열차가 있을 수 있습니다.','results-note'));
}
async function submitSearch(e){e.preventDefault();closeSuggestions();if(!state.connected){notice('열차정보 API가 연결되지 않았습니다. 아래 오류 안내를 확인해 주세요.','error');return}const from=tryResolve('from'),to=tryResolve('to');if(!from){notice('목록에서 정확한 출발역을 선택해 주세요.','error');ui.fromInput.focus();return}if(!to){notice('목록에서 정확한 도착역을 선택해 주세요.','error');ui.toInput.focus();return}if(from.id===to.id){notice('출발역과 도착역을 다르게 선택해 주세요.','error');return}const date=ui.tripDate.value;if(!date||date<localDate()||date>localDate(31)){notice('오늘부터 31일 이내 날짜를 선택해 주세요.','error');return}const seq=++state.requestSeq;ui.searchBtn.disabled=true;ui.searchBtn.querySelector('span').textContent='공식 시간표 조회 중…';notice('');ui.resultsSection.hidden=false;emptyResults('운행시간표를 확인하는 중입니다.','공공데이터 조회 상황에 따라 조금 걸릴 수 있어요.','⏳');ui.resultsSection.scrollIntoView({block:'start',inline:'nearest',behavior:'smooth'});try{const url=new URL('/api/trains',location.origin);url.searchParams.set('from',from.id);url.searchParams.set('to',to.id);url.searchParams.set('date',date);const response=await fetch(url.toString());const body=await response.json();if(seq!==state.requestSeq)return;if(!response.ok||!body.ok)throw new Error(body.error||'열차를 조회할 수 없습니다.');state.trains=Array.isArray(body.trains)?body.trains:[];state.partial=!!body.partial;state.lastQuery={from:from.name,to:to.name,date};state.recent=[[from.name,to.name],...state.recent.filter(r=>r[0]!==from.name||r[1]!==to.name)].slice(0,4);saveRecent();quickRoutes();renderResults();if(state.trains.length)notice(body.partial?`${date} · 공식 시간표의 일부만 조회됐습니다. 예매처에서도 확인해 주세요.`:`${date} · ${from.name} → ${to.name} 공공데이터 조회 완료.`,body.partial?'':'ok')}catch(error){if(seq!==state.requestSeq)return;state.trains=[];state.lastQuery=null;ui.resultsSection.hidden=true;ui.resultCount.textContent='—';notice((error.message||'공공데이터를 불러오지 못했습니다.')+' · 공식 예매처에서도 확인해 주세요.','error')}finally{if(seq===state.requestSeq){ui.searchBtn.disabled=false;ui.searchBtn.querySelector('span').textContent='열차 시간표 검색하기'}}}
function openBoarding(row=null){const station=row?.fromName||state.lastQuery?.from||state.selected.from?.name||'출발역';const train=row?.trainNo?` · 열차 ${row.trainNo}`:'';ui.boardingContent.replaceChildren();ui.boardingContent.append(text('div',station+'역'+train+' · 타는 곳 현장 확인 필요','boarding-summary'));const steps=document.createElement('ol');steps.className='boarding-steps';for(const s of ['역 대합실의 출발 전광판으로 이동합니다.','출발시간과 열차번호, 행선지가 일치하는지 확인합니다.','전광판에 나온 타는 곳(승강장) 번호를 확인하고 이동합니다.','승차권의 호차와 좌석을 확인한 후 승차합니다.'])steps.append(text('li',s));ui.boardingContent.append(steps,text('p','열차별 승강장은 운행 당일 변경될 수 있습니다. 공식 승강장 번호가 제공되지 않으므로 임의 번호를 표시하지 않습니다.','board-warning'));const anchor=document.createElement('a');anchor.href='https://www.korail.com/';anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.className='board-link';anchor.textContent='코레일 공식 안내 ↗';ui.boardingContent.append(anchor);ui.boardingDialog.showModal()}
function bind(){for(const side of ['from','to']){const input=side==='from'?ui.fromInput:ui.toInput;input.addEventListener('focus',()=>showSuggestions(side));input.addEventListener('input',()=>{state.pickerRegion='';state.selected[side]=null;if(side==='from'){state.destinationSeq++;activeDestinationController?.abort();destinationChecking=false;destinationQueue=[];destinationOffset=0;state.destinationLoading=false;state.destinationItems=[];state.selected.to=null;ui.toInput.value='';ui.toInput.disabled=true;ui.destinationMore.hidden=true;destStatus('출발역을 선택하면 전국 역에서 도착역을 검색할 수 있습니다.')}showSuggestions(side)});input.addEventListener('keydown',e=>{if(e.key==='Escape')closeSuggestions();if(e.key==='Enter'&&!ui.suggestions.hidden){const first=ui.suggestions.querySelector('button');if(first){e.preventDefault();first.click()}}})}document.addEventListener('pointerdown',e=>{if(!e.target.closest('.station-fields')&&!e.target.closest('#suggestions'))closeSuggestions()});ui.swapBtn.addEventListener('click',()=>{const a=ui.fromInput.value;ui.fromInput.value=ui.toInput.value;ui.toInput.value=a;const p=state.selected.from;state.selected.from=state.selected.to;state.selected.to=p;closeSuggestions();if(state.selected.from)refreshDestinations({keepTo:true});else refreshDestinations()});ui.todayBtn.addEventListener('click',()=>{ui.tripDate.value=localDate();refreshDestinations({keepTo:true})});ui.tomorrowBtn.addEventListener('click',()=>{ui.tripDate.value=localDate(1);refreshDestinations({keepTo:true})});ui.typeFilters.addEventListener('click',e=>{const btn=e.target.closest('[data-grade]');if(!btn)return;state.filter=btn.dataset.grade;ui.typeFilters.querySelectorAll('button').forEach(n=>{n.classList.toggle('active',n===btn);n.setAttribute('aria-pressed',String(n===btn))});renderResults();refreshDestinations({keepTo:true})});ui.searchForm.addEventListener('submit',submitSearch);ui.sortSelect.addEventListener('change',()=>{state.sort=ui.sortSelect.value;renderResults()});ui.clearRecentBtn.addEventListener('click',()=>{state.recent=[];saveRecent();quickRoutes()});ui.boardingHelp.addEventListener('click',()=>openBoarding());ui.boardingClose.addEventListener('click',()=>ui.boardingDialog.close());ui.helpOpen.addEventListener('click',()=>ui.helpDialog.showModal());ui.helpClose.addEventListener('click',()=>ui.helpDialog.close());ui.tripDate.addEventListener('change',()=>refreshDestinations({keepTo:true}));ui.destinationModeToggle.addEventListener('click',changeDestinationMode);ui.destinationMore.addEventListener('click',scanMoreDestinations);}
dateInit();bind();ui.toInput.disabled=true;destStatus('출발역을 선택하면 전국 모든 도착역에서 찾을 수 있습니다. 직통 여부는 검색 후 확인합니다.');quickRoutes();renderResults();loadStations();