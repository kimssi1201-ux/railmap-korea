import {renderTrainTimetable} from './timetable-view.js';
import {stationGuideCandidates,stationGuideSearch} from './station-destination-options.js';
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
  submit.disabled=!loaded;submit.textContent='직통 시간표 조회하기 →';
  status.textContent='';status.dataset.status='';
  results.hidden=true;results.replaceChildren();
 }
 function selectStation(station){
  chosen=station;input.value=station.name;
  hideOptions();input.blur();resetResults();
 }
 function suggest(){
  const query=input.value.trim();
  const matches=query?stationGuideSearch(official,from,query,10):
   stationGuideCandidates({id:from,name:fromName},[],official,12).slice(0,10);
  options.replaceChildren();
  if(!loaded){hideOptions();return;}
  if(!matches.length){
   const empty=document.createElement('div');empty.className='sp-station-options-empty';
   empty.textContent=query?'등록된 역을 찾지 못했습니다. 역 이름을 확인해 주세요.':'도착역 이름을 입력해 주세요.';
   options.append(empty);
  }else{
   if(!query){
    const hint=document.createElement('p');
    hint.className='sp-station-options-hint';hint.textContent='참고 노선의 역 · 실제 직통 운행은 조회 후 확인';
    options.append(hint);
   }
   for(const station of matches){
    const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
    const stationName=document.createElement('strong');stationName.textContent=label(station);
    const region=document.createElement('small');region.textContent=station.region||'공식 등록역';
    button.append(stationName,region);
    button.addEventListener('click',()=>selectStation(station));
    options.append(button);
   }
  }
  options.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('focus',suggest);
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
  const to=chosen&&normalizeName(chosen.name)===normalizeName(input.value)?chosen:getStation(official,input.value);
  if(!to||to.id===from){
   status.textContent='공식 목록에서 출발역과 다른 도착역을 선택해 주세요.';
   status.dataset.status='error';input.focus();return;
  }
  const date=dateInput.value;
  if(!date||date<today()||date>today(31)){
   status.textContent='오늘부터 31일 이내 날짜를 선택해 주세요.';
   status.dataset.status='error';return;
  }
  resetResults();
  const id=requestId;
  controller=new AbortController();
  const signal=controller.signal;
  const timer=setTimeout(()=>controller?.abort(),18000);
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
    status.textContent=data.partial?'공식 시간표 일부가 누락되어 직통 운행 여부를 판단할 수 없습니다.':
      '선택한 날짜에 직통 시간표가 확인되지 않았습니다. 환승편은 별도로 확인해 주세요.';
    status.dataset.status='warning';return;
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
   if(id===requestId){controller=null;submit.disabled=false;submit.textContent='직통 시간표 조회하기 →';}
  }
 }
 form.addEventListener('submit',lookup);
 submit.disabled=true;
 fetch('/api/stations?v=nationwide-regions-v1',{headers:{Accept:'application/json'}})
 .then(async response=>{
  const data=await response.json();
  if(!response.ok||!data.ok||!Array.isArray(data.stations))throw Error(data.error||'공식 역 목록 조회 오류');
  official=[...new Map(data.stations.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&s.id!==from).map(s=>[s.id,s])).values()];
  if(!official.length)throw Error('조회 가능한 도착역 목록이 없습니다.');
  loaded=true;submit.disabled=false;
  listStatus.textContent='전국 공식 역 '+official.length+'곳 검색 가능'+(data.partial?' · 일부 역 정보 누락 가능':'')+' · 직통 여부는 조회 후 확인';
  if(document.activeElement===input)suggest();
 })
 .catch(error=>{
  loaded=false;submit.disabled=true;
  listStatus.textContent=(error.message||'공식 역 목록 오류')+' · 전체 기차 검색에서 다시 확인해 주세요.';
 });
}
