import {renderTrainTimetable} from './timetable-view.js';
import {stationGuideSearch,stationGuideOptionCount} from './station-destination-options.js?v=verified-shortlist-v1';
import {verifyStationDestinations,candidateStationsForVerification,stationCorridorReferences,allCorridorDestinations,visibleCorridorDestinations} from './station-verified.js?v=all-destinations-v1';
import {lookupRegisteredStation} from './station-matching.js?v=sintanjin-mobile-picks-v1';
import {normalizeName} from './station-utils.js';

const app=document.getElementById('spStationLookup');
if(app){
 const from=app.dataset.station,fromName=app.dataset.stationName,fromRegion=app.dataset.stationRegion||'';
 const form=document.getElementById('spStationForm');
 const dateInput=document.getElementById('spCheckDate');
 const input=document.getElementById('spDestinationInput');
 const options=document.getElementById('spDestinationOptions');
 const listStatus=document.getElementById('spStationListStatus');
 const submit=document.getElementById('spStationSubmit');
 const status=document.getElementById('spStationResultStatus');
 const results=document.getElementById('spStationResults');
 const quickWrap=document.getElementById('spQuickWrap');
 const quick=document.getElementById('spQuickDestinations');
 const quickSource=document.getElementById('spQuickSource');
 const quickMore=document.getElementById('spQuickMore');
 const quickVerify=document.getElementById('spQuickVerifyMore');
 const quickSummary=document.getElementById('spQuickSummary');
 let official=[],chosen=null,requestId=0,controller=null,loaded=false,verifySequence=0,verifyAbort=null,expandedDestinations=false;
 let verified={date:'',state:'idle',confirmed:[],checked:0,candidates:0,failed:0};
 const today=(offset=0)=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day+offset)).toISOString().slice(0,10);
 };
 dateInput.min=today();dateInput.max=today(31);dateInput.value=dateInput.min;
 const label=station=>String(station.name).replace(/역$/u,'')+'역';
 function hideOptions(){options.hidden=true;input.setAttribute('aria-expanded','false');}
 function resetResults(){
  requestId++;controller?.abort();controller=null;
  submit.disabled=!loaded;submit.textContent='시간표 확인하기 →';
  status.textContent='';status.dataset.status='';
  results.hidden=true;results.replaceChildren();
 }
 function resetVerified(){
  verifySequence++;verifyAbort?.abort();verifyAbort=null;
  verified={date:'',state:'idle',confirmed:[],checked:0,candidates:0,failed:0};
 }
 async function getTimetable({from:origin,to,date,signal}){
  const url=new URL('/api/trains',location.origin);
  for(const [key,value] of Object.entries({from:origin,to,date}))url.searchParams.set(key,value);
  const response=await fetch(url.toString(),{signal,headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||data?.ok!==true||!Array.isArray(data.trains))throw Error(data?.error||'공식 시간표 조회 실패');
  return data;
 }
 function startVerification(){
  if(!loaded||!dateInput.value||dateInput.value<today()||dateInput.value>today(31))return;
  if(verified.date===dateInput.value&&verified.state!=='idle')return;
  resetVerified();
  const token=verifySequence,date=dateInput.value;
  const active=new AbortController();verifyAbort=active;
  verified={date,state:'checking',confirmed:[],checked:0,candidates:0,failed:0};
  const timeout=setTimeout(()=>active.abort(),25000);
  verifyStationDestinations({origin:{id:from,name:fromName},stations:official,date,signal:active.signal,request:getTimetable,limit:8})
   .then(data=>{
    if(token!==verifySequence)return;
    verified={date,state:'done',...data};
   }).catch(()=>{
    if(token!==verifySequence)return;
    verified={date,state:'failed',confirmed:[],checked:0,candidates:0,failed:1};
   }).finally(()=>{
    clearTimeout(timeout);
    if(token===verifySequence){
     verifyAbort=null;
     renderQuickDestinations();
     if(document.activeElement===input&&!input.value.trim())showOptions();
    }
   });
 }
 function getReferenceSuggestions(){
  const stations=allCorridorDestinations({id:from,name:fromName},official);
  return {kind:stations.length?'corridor':'none',stations};
 }
 function verifyNextDestinations(){
  if(!loaded||verified.date!==dateInput.value||verified.state==='checking')return;
  const all=getReferenceSuggestions().stations;
  const checked=new Set(verified.testedIds||[]);
  const remaining=all.filter(station=>!checked.has(station.id)).slice(0,8);
  if(!remaining.length)return;
  const token=verifySequence,date=dateInput.value,base={...verified};
  const active=new AbortController();verifyAbort=active;
  verified={...base,state:'checking'};
  renderQuickDestinations();
  const timeout=setTimeout(()=>active.abort(),25000);
  verifyStationDestinations({origin:{id:from,name:fromName},stations:official,
   date,signal:active.signal,request:getTimetable,limit:8,candidates:remaining})
   .then(data=>{
    if(token!==verifySequence)return;
    const confirmed=new Map([...base.confirmed,...data.confirmed].map(x=>[x.station.id,x]));
    verified={date,state:'done',confirmed:[...confirmed.values()],
     unknown:[...(base.unknown||[]),...data.unknown],checked:(base.checked||0)+data.checked,
     candidates:(base.candidates||0)+data.candidates,failed:(base.failed||0)+data.failed,
     testedIds:[...new Set([...(base.testedIds||[]),...data.testedIds])]};
   }).catch(()=>{
    if(token!==verifySequence)return;
    verified={...base,state:'failed'};
   }).finally(()=>{
    clearTimeout(timeout);
    if(token===verifySequence){verifyAbort=null;renderQuickDestinations();
     if(document.activeElement===input&&!input.value.trim())showOptions();}
   });
 }
 if(quickVerify)quickVerify.addEventListener('click',verifyNextDestinations);
 function renderQuickDestinations(){
  if(!quick)return;
  quick.replaceChildren();
  if(!loaded){quickSource.textContent='공식 등록역 불러오는 중';return;}
  const origin={id:from,name:fromName};
  const confirmed=verified.date===dateInput.value?verified.confirmed:[];
  const counts=new Map(confirmed.map(x=>[x.station.id,x.count]));
  const visible=visibleCorridorDestinations(origin,official,confirmed,expandedDestinations,12);
  const listed=visible.stations;
  if(quickWrap)quickWrap.hidden=visible.total===0;
  quickSource.textContent='노선 참고 '+visible.total+'곳 · 직통 운행은 날짜별 확인';
  if(quickMore){
   quickMore.hidden=visible.total<=12;
   quickMore.textContent=expandedDestinations?'목적지 목록 접기':'노선 참고 목적지 전체 '+visible.total+'곳 보기';
   quickMore.setAttribute('aria-expanded',String(expandedDestinations));
  }
  if(quickVerify){
   const checked=new Set(verified.testedIds||[]);
   const remaining=getReferenceSuggestions().stations.filter(station=>!checked.has(station.id));
   quickVerify.hidden=verified.state==='idle'||verified.state==='checking'||!remaining.length;
   quickVerify.textContent='다른 목적지 직통 여부 추가 확인 ('+remaining.length+'곳 남음)';
  }
  if(quickSummary){
   const progress=verified.date===dateInput.value&&verified.state==='checking'?' · 공식 시간표 확인 중':
    verified.state==='failed'?' · 조회 지연 또는 실패':'';
   quickSummary.textContent='✓ 직통 '+confirmed.length+'곳 확인'+
    (verified.checked?' · 노선 참고역 '+verified.checked+'/'+visible.total+'곳 조회':'')+progress+
    ' · 노선 참고역은 직통 확정이 아니며, 다른 역은 아래에서 검색 가능합니다.';
  }
  if(!listed.length){
   const note=document.createElement('p');note.className='sp-quick-empty';
   note.textContent='노선 참고 목적지가 없습니다. 아래에서 역 이름을 검색하세요.';
   quick.append(note);return;
  }
  for(const station of listed){
   const b=document.createElement('button');b.type='button';b.className='sp-quick-item';
   const name=document.createElement('span');name.textContent=label(station);
   b.append(name);
   if(counts.has(station.id)){
    const mark=document.createElement('small');mark.textContent='✓ 직통 '+counts.get(station.id)+'편';
    b.append(mark);b.classList.add('is-confirmed');
   }
   if(chosen?.id===station.id)b.classList.add('is-selected');
   b.setAttribute('aria-label',label(station)+(counts.has(station.id)?' 직통 배차 확인':' 노선 참고, 직통 미확인'));
   b.addEventListener('click',()=>selectStation(station));
   quick.append(b);
  }
 }
 if(quickMore)quickMore.addEventListener('click',()=>{
  expandedDestinations=!expandedDestinations;
  renderQuickDestinations();
 });
 function selectStation(station){
  chosen=station;input.value=station.name;hideOptions();input.blur();resetResults();renderQuickDestinations();
 }
 function showOptions(){
  if(!loaded){hideOptions();return;}
  const query=input.value.trim(),empty=!query;
  if(empty)startVerification();
  const reference=empty?getReferenceSuggestions():{kind:'none',stations:[]};
  const nearby=reference.stations;
  const checked=new Map(verified.confirmed.map(x=>[x.station.id,x.count]));
  const confirmed=verified.confirmed.map(x=>x.station);
  const suggestions=nearby.filter(s=>!checked.has(s.id));
  const matches=empty?[...confirmed,...suggestions].slice(0,10):
   stationGuideSearch(official,from,query,10);
  options.replaceChildren();
  const hint=document.createElement('p');hint.className='sp-station-options-hint';
  if(empty){
   const progress=verified.state==='checking'?' · 공식 시간표 확인 중':
    verified.state==='failed'||verified.failed||verified.unknown?.length?' · 일부 구간 확인 실패':'';
   hint.textContent=(confirmed.length?'직통 확인 '+confirmed.length+'곳 · ':'')+
    (reference.kind==='corridor'?'노선 참고 ':'검증된 참고역 없음 · ')+suggestions.length+'곳'+progress+
    ' · 참고역의 직통 여부는 미확인';
   if(!matches.length)hint.textContent='노선 참고 후보가 없습니다. 역 이름을 직접 입력해 시간표를 조회하세요.';
  }else{
   const total=stationGuideOptionCount({id:from,name:fromName},official,query);
   hint.textContent='전국 등록역 검색 '+total+'곳 중 '+matches.length+'곳 · 직통 여부는 별도 확인';
  }
  options.append(hint);
  for(const station of matches){
   const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
   const heading=document.createElement('strong');heading.textContent=label(station);
   const info=document.createElement('small');
   info.textContent=checked.has(station.id)?'직통 '+checked.get(station.id)+'편 확인':
    empty?'노선 참고 · 직통 미확인':(station.region||'공식 등록역')+' · 직통 미확인';
   if(checked.has(station.id))button.classList.add('sp-option-confirmed');
   button.append(heading,info);
   button.addEventListener('click',()=>selectStation(station));
   options.append(button);
  }
  options.hidden=false;options.scrollTop=0;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('focus',showOptions);
 input.addEventListener('click',showOptions);
 input.addEventListener('input',()=>{chosen=null;resetResults();renderQuickDestinations();showOptions();});
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){hideOptions();return;}
  if(event.key==='Enter'&&!options.hidden){
   const first=options.querySelector('button[role="option"]');
   if(first){event.preventDefault();first.click();}
  }
 });
 document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('.sp-station-picker'))hideOptions();
 });
 dateInput.addEventListener('change',()=>{
  resetResults();resetVerified();renderQuickDestinations();startVerification();
  listStatus.textContent='날짜를 바꿨습니다. 참고 목적지는 그대로 표시되며 직통 배차는 새 날짜로 확인합니다.';
  if(document.activeElement===input)showOptions();
 });
 async function lookup(event){
  event.preventDefault();hideOptions();
  if(!loaded){status.textContent='공식 역 목록을 불러오지 못했습니다.';status.dataset.status='error';return;}
  const resolved=lookupRegisteredStation(official,input.value);
  const to=chosen&&normalizeName(chosen.name)===normalizeName(input.value)?chosen:resolved.station;
  if(!to||to.id===from){
   status.textContent=resolved.ambiguous?'동명이역이 있습니다. 목록에서 지역을 보고 선택해 주세요.':'공식 역 목록에서 다른 도착역을 선택해 주세요.';
   status.dataset.status='error';input.focus();return;
  }
  const date=dateInput.value;
  if(!date||date<today()||date>today(31)){
   status.textContent='오늘부터 31일 이내의 날짜를 선택해 주세요.';status.dataset.status='error';return;
  }
  resetResults();
  const id=requestId,active=new AbortController();controller=active;
  const timer=setTimeout(()=>active.abort(),17000),signal=active.signal;
  submit.disabled=true;submit.textContent='공식 시간표 확인 중…';
  status.textContent=fromName+'역 → '+label(to)+' · 직통 시간표 조회 중';
  try{
   const data=await getTimetable({from,to:to.id,date,signal});
   if(id!==requestId)return;
   const expectedDate=date.replaceAll('-','');
   const trains=data.trains.filter(row=>/^\d{12,14}$/.test(String(row?.depTime))&&
    /^\d{12,14}$/.test(String(row?.arrTime))&&String(row.depTime).slice(0,8)===expectedDate);
   if(!trains.length){
    if(data.partial||data.trains.length){
     status.textContent='역 코드는 정상 매칭됐지만 공식 시간표 응답이 불완전하거나 날짜가 맞지 않습니다. 코레일에서 다시 확인해 주세요.';
    }else{
     status.textContent=fromName+'역 → '+label(to)+'은 공식 역 코드로 정상 매칭됐습니다. 다만 '+date+' 직통 운행 시간표는 확인되지 않았습니다. 환승 경로는 코레일에서 확인해 주세요.';
    }
    status.dataset.status='warning';return;
   }
   renderTrainTimetable(results,trains,{from:fromName,to:to.name,date});
   results.hidden=false;
   status.textContent=date+' · '+fromName+'역 → '+label(to)+' · 직통 '+trains.length+'편 확인'+(data.partial?' (일부 시간표 누락 가능)':'');
   status.dataset.status=data.partial?'warning':'ok';
  }catch(error){
   if(id!==requestId)return;
   status.textContent=signal.aborted?'공식 시간표 응답이 지연됐습니다. 잠시 후 다시 확인해 주세요.':
    (error.message||'시간표 조회 실패')+' · 직통편이 없다는 뜻은 아닙니다.';
   status.dataset.status='error';
  }finally{
   clearTimeout(timer);
   if(id===requestId){controller=null;submit.disabled=false;submit.textContent='시간표 확인하기 →';}
  }
 }
 form.addEventListener('submit',lookup);
 submit.disabled=true;
 fetch('/api/stations?v=national-station-match-v2',{headers:{Accept:'application/json'}})
  .then(async response=>{
   const data=await response.json();
   if(!response.ok||!data.ok||!Array.isArray(data.stations))throw Error(data.error||'공식 역 목록 조회 실패');
   official=[...new Map(data.stations.filter(s=>s?.id&&s?.name&&s.id!==from).map(s=>[s.id,s])).values()];
   if(!official.length)throw Error('등록된 도착역 목록이 비어 있습니다.');
   loaded=true;submit.disabled=false;
   renderQuickDestinations();
   startVerification();
   listStatus.textContent='공식 등록역 '+official.length+'곳 · 노선 참고역 전체 보기 또는 이름으로 직접 검색';
   if(document.activeElement===input)showOptions();
  }).catch(error=>{
   loaded=false;submit.disabled=true;listStatus.textContent=(error.message||'역 목록 오류')+' · 다시 접속해 주세요.';
  });
}
