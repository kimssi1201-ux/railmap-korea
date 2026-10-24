import {renderTrainTimetable} from './timetable-view.js';
import {stationGuideOptions,stationGuideOptionCount,stationGuideNearby,stationGuideMode} from './station-destination-options.js?v=national-station-match-v2';
import {lookupRegisteredStation} from './station-matching.js';
import {getStation,normalizeName} from './station-utils.js';

const app=document.getElementById('spStationLookup');
if(app){
 const from=app.dataset.station,fromName=app.dataset.stationName;
 const form=document.getElementById('spStationForm');
 const dateInput=document.getElementById('spCheckDate');
 const input=document.getElementById('spDestinationInput');
 const options=document.getElementById('spDestinationOptions');
 const listStatus=document.getElementById('spStationListStatus');
 const submit=document.getElementById('spStationSubmit');
 const status=document.getElementById('spStationResultStatus');
 const results=document.getElementById('spStationResults');
 const alternatives=document.getElementById('spVerifiedAlternatives');
 let official=[],chosen=null,requestId=0,controller=null,loaded=false;
 const today=(offset=0)=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day+offset)).toISOString().slice(0,10);
 };
 dateInput.min=today();dateInput.max=today(31);dateInput.value=dateInput.min;

 const label=station=>String(station.name).replace(/역$/u,'')+'역';
 function hideOptions(){options.hidden=true;input.setAttribute('aria-expanded','false');}
 function resetResults(){
  requestId++;
  controller?.abort();controller=null;
  submit.disabled=!loaded;submit.textContent='시간표 확인하기 →';
  status.textContent='';status.dataset.status='';
  results.hidden=true;results.replaceChildren();
  if(alternatives){alternatives.hidden=true;alternatives.replaceChildren();}
 }
 function selectStation(station){
  chosen=station;input.value=station.name;
  hideOptions();input.blur();resetResults();
 }
 function suggest(){
  const query=input.value.trim();
  const origin={id:from,name:fromName};
  const matches=stationGuideOptions(origin,official,query);
  const total=stationGuideOptionCount(origin,official,query);
  options.replaceChildren();
  if(!loaded){hideOptions();return;}
  if(!matches.length){
   const empty=document.createElement('div');empty.className='sp-station-options-empty';
   empty.textContent=query?'일치하는 공식 역이 없습니다. 다른 역 이름을 입력해 주세요.':'조회 가능한 도착역이 없습니다.';
   options.append(empty);
  }else{
   const hint=document.createElement('p');
   hint.className='sp-station-options-hint';
   const mode=stationGuideMode(origin,official);
   hint.textContent=query?'등록된 역 '+total+'개 중 '+matches.length+'개 · 직통 여부는 시간표 조회 후 확인':
    (mode==='corridor'?'철도 노선 참고 역 ':mode==='region'?'같은 지역 등록역 ':'전국 등록역 예시 ')+matches.length+'곳 · 직통 운행은 미확인';
   options.append(hint);
   for(const station of matches){
    const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
    const stationName=document.createElement('strong');stationName.textContent=label(station);
    const region=document.createElement('small');region.textContent=station.region||'공식 등록역';
    button.append(stationName,region);
    button.addEventListener('click',()=>selectStation(station));
    options.append(button);
   }
  }
  options.hidden=false;options.scrollTop=0;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('focus',suggest);
 input.addEventListener('click',suggest);
 input.addEventListener('input',()=>{
  chosen=null;resetResults();suggest();
 });
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
 dateInput.addEventListener('change',resetResults);
 async function lookup(event){
  event.preventDefault();hideOptions();
  if(!loaded){status.textContent='공식 역 목록을 불러오지 못했습니다. 다시 접속해 주세요.';status.dataset.status='error';return;}
  const resolved=lookupRegisteredStation(official,input.value);
  const to=chosen&&normalizeName(chosen.name)===normalizeName(input.value)?chosen:resolved.station;
  if(!to||to.id===from){
   status.textContent=resolved.ambiguous?'이름이 같은 역이 여러 곳입니다. 아래 목록에서 지역을 확인하고 선택해 주세요.':
    '공식 목록에서 출발역과 다른 도착역을 선택해 주세요.';
   status.dataset.status='error';input.focus();return;
  }
  const date=dateInput.value;
  if(!date||date<today()||date>today(31)){
   status.textContent='오늘부터 31일 이내 날짜를 선택해 주세요.';
   status.dataset.status='error';return;
  }
  resetResults();
  const id=requestId;
  const active=new AbortController();
  controller=active;
  const signal=active.signal;
  const timer=setTimeout(()=>active.abort(),24000);
  submit.disabled=true;submit.textContent='공식 시간표 확인 중…';
  status.textContent=fromName+'역 → '+label(to)+' · 시간표 조회 중';
  status.dataset.status='';
  try{
   const url=new URL('/api/trains',location.origin);
   for(const [key,value] of Object.entries({from,to:to.id,date}))url.searchParams.set(key,value);
   const response=await fetch(url.toString(),{signal,headers:{Accept:'application/json'}});
   const data=await response.json();
   if(id!==requestId)return;
   if(!response.ok||!data.ok||!Array.isArray(data.trains))throw Error(data.error||'공식 열차정보를 조회하지 못했습니다.');
   const trains=data.trains.filter(row=>/^\d{12,14}$/.test(String(row.depTime))&&/^\d{12,14}$/.test(String(row.arrTime)));
   if(!trains.length){
    status.dataset.status='warning';
    if(data.partial){
     status.textContent='공식 시간표 일부 누락 · 직통 여부를 확정할 수 없습니다. 코레일에서 확인해 주세요.';
     return;
    }
    const nearby=stationGuideNearby({id:from,name:fromName},official,3).filter(station=>station.id!==to.id);
    status.textContent=label(to)+' 직통 시간표 미확인'+(nearby.length?' · 같은 노선의 실제 배차 확인 중…':' · 환승편은 코레일에서 확인하세요.');
    if(!nearby.length)return;
    const responses=await Promise.all(nearby.map(async station=>{
     try{
      const altUrl=new URL('/api/trains',location.origin);
      for(const [key,value] of Object.entries({from,to:station.id,date}))altUrl.searchParams.set(key,value);
      const response=await fetch(altUrl.toString(),{signal,headers:{Accept:'application/json'}});
      const payload=await response.json();
      if(!response.ok||payload?.ok!==true||!Array.isArray(payload.trains))return null;
      const count=payload.trains.filter(row=>/^\d{12,14}$/.test(String(row.depTime))&&/^\d{12,14}$/.test(String(row.arrTime))).length;
      return count?{station,count}:null;
     }catch{return null}
    }));
    if(id!==requestId)return;
    const verified=responses.filter(Boolean);
    if(verified.length&&alternatives){
     alternatives.hidden=false;
     const heading=document.createElement('strong');
     heading.textContent='이 날짜에 직통편이 확인된 주변 역';
     alternatives.append(heading);
     for(const {station,count} of verified){
      const btn=document.createElement('button');btn.type='button';btn.className='sp-alternative-button';
      btn.textContent=label(station)+' · '+count+'편';
      btn.addEventListener('click',()=>{selectStation(station);form.requestSubmit()});
      alternatives.append(btn);
     }
     status.textContent=label(to)+' 직통편 미확인 · 아래는 TAGO에서 직접 배차가 확인된 주변 역입니다. 다른 환승 경로는 공식 예매처에서 확인하세요.';
    }else{
     status.textContent=label(to)+' 직통편 미확인 · 인접 후보역에서도 확정된 배차를 받지 못했습니다. 환승 경로가 없다는 뜻은 아닙니다.';
    }
    return;
   }
   renderTrainTimetable(results,trains,{from:fromName,to:to.name,date});
   results.hidden=false;results.scrollIntoView({block:'nearest',behavior:'smooth'});
   status.textContent=date+' · '+fromName+'역 → '+label(to)+' · 직통 '+trains.length+'편 확인'+(data.partial?' (일부 시간표 누락 가능)':'');
   status.dataset.status=data.partial?'warning':'ok';
  }catch(error){
   if(id!==requestId)return;
   status.textContent=signal.aborted?'공식 시간표 서버 응답이 지연됐습니다. 다시 조회해 주세요.':
    (error.message||'시간표를 조회하지 못했습니다.')+' 운행이 없다는 뜻은 아닙니다.';
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
  if(!response.ok||!data.ok||!Array.isArray(data.stations))throw Error(data.error||'공식 역 목록 조회 오류');
  official=[...new Map(data.stations.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&s.id!==from).map(s=>[s.id,s])).values()];
  if(!official.length)throw Error('조회 가능한 도착역 목록이 없습니다.');
  loaded=true;submit.disabled=false;
  listStatus.textContent='도착역 '+official.length+'곳 검색 가능'+(data.partial?' · 일부 역 정보 누락 가능':'');
  if(document.activeElement===input)suggest();
 })
 .catch(error=>{
  loaded=false;submit.disabled=true;
  listStatus.textContent=(error.message||'공식 역 목록 오류')+' · 전체 기차 검색에서 다시 확인해 주세요.';
 });
}
