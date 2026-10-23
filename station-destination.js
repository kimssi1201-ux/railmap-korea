import {classifyRailAvailability} from './route-availability.js';
import {stationGuideCandidates,stationGuideSearch} from './station-destination-options.js';

const area=document.getElementById('spVerifiedRoutes');
if(area){
 const from=area.dataset.station,fromName=area.dataset.stationName;
 const status=document.getElementById('spRecommendationStatus');
 const dateInput=document.getElementById('spCheckDate');
 const more=document.getElementById('spLoadMoreRoutes');
 const stationSearch=document.getElementById('spOtherStationQuery');
 const stationMatches=document.getElementById('spOtherStationMatches');
 const stationResult=document.getElementById('spOtherStationResult');
 const today=(offset=0)=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day+offset)).toISOString().slice(0,10);
 };
 dateInput.min=today();dateInput.max=today(31);dateInput.value=dateInput.min;

 let editorial=[];
 try{
  const rows=JSON.parse(area.dataset.candidates||'[]');
  if(Array.isArray(rows))editorial=rows.filter(x=>x&&/^[a-z0-9_-]{4,30}$/i.test(x.id)&&typeof x.name==='string'&&x.id!==from);
 }catch{status.textContent='추천 구간 목록을 처리하지 못했습니다.';}

 let official=[],candidates=stationGuideCandidates({id:from,name:fromName},editorial,[]);
 let revision=0,offset=0,confirmed=0,unknown=0,busy=false,originLoading=true;
 let activeController=null,checkingStation=false;
 const cache=new Map();
 const routeUrl=(to,date)=>'/routes/'+encodeURIComponent(from)+'/'+encodeURIComponent(to)+'?date='+encodeURIComponent(date);

 async function check(to,date,signal){
  const key=to+'|'+date;
  if(cache.has(key))return cache.get(key);
  const url=new URL('/api/trains',location.origin);
  for(const [key,value] of Object.entries({from,to,date}))url.searchParams.set(key,value);
  const response=await fetch(url.toString(),{headers:{Accept:'application/json'},signal});
  const data=await response.json();
  if(!response.ok||!data.ok||!Array.isArray(data.trains))throw Error(data.error||'공식 시간표 조회 실패');
  const state=classifyRailAvailability(data);
  const result={state,count:state==='confirmed'?data.trains.length:0};
  if(!data.partial)cache.set(key,result);
  return result;
 }
 function linkFor(station,date,count){
  const a=document.createElement('a');a.className='sp-link';a.href=routeUrl(station.id,date);
  const name=document.createElement('strong');name.textContent=station.name.replace(/역$/u,'')+'역';
  const note=document.createElement('small');note.textContent='직통 '+count+'편 확인 · 날짜별 시간표';
  const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
  a.append(name,note,arrow);return a;
 }
 function renderProgress(){
  const left=Math.max(0,candidates.length-offset);
  more.hidden=left===0;
  more.disabled=busy;
  more.textContent=busy?'공식 배차 확인 중…':'추천 후보 더 확인 ('+left+'곳 남음)';
  if(busy){
   status.textContent='추천 후보 '+offset+'/'+candidates.length+'곳 확인 중 · 직통 '+confirmed+'곳';
  }else{
   status.textContent='추천 후보 '+offset+'곳 중 직통 '+confirmed+'곳 확인'+(unknown?' · 일부 API 응답 미확인':'')+
    (left?' · 나머지 '+left+'곳은 아래 버튼으로 추가 확인':'')+
    (originLoading?' · 전국 역 목록을 불러오는 중':'')+
    '. 전체 직통 목적지 수는 아닙니다.';
  }
 }
 async function loadMore(){
  if(busy||offset>=candidates.length)return;
  const token=revision,date=dateInput.value;
  const batch=candidates.slice(offset,offset+8);
  offset+=batch.length;busy=true;renderProgress();
  const controller=new AbortController();activeController?.abort();activeController=controller;
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
   for(let i=0;i<batch.length;i+=2){
    const pair=batch.slice(i,i+2);
    const results=await Promise.all(pair.map(async station=>{
     try{return await check(station.id,date,controller.signal)}
     catch{return {state:'unavailable',count:0}}
    }));
    if(token!==revision)return;
    results.forEach((result,i)=>{
     if(result.state==='confirmed'){area.append(linkFor(pair[i],date,result.count));confirmed++;}
     else if(result.state==='unavailable'||result.state==='unknown')unknown++;
    });
   }
  }finally{
   clearTimeout(timer);
   if(token===revision){busy=false;renderProgress();}
  }
 }
 function update(){
  revision++;
  activeController?.abort();busy=false;offset=0;confirmed=0;unknown=0;
  area.replaceChildren();
  more.hidden=true;
  if(!candidates.length){
   status.textContent='등록된 추천 구간이 없습니다. 아래에서 도착역 이름을 검색해 보세요.';
   return;
  }
  renderProgress();loadMore();
 }
 function renderMatches(){
  stationMatches.replaceChildren();
  const q=stationSearch.value.trim();
  if(!q){stationResult.textContent='역 이름을 입력하면 등록된 공식 역에서 찾습니다.';return;}
  if(!official.length){stationResult.textContent='공식 역 목록을 불러오는 중이거나 조회할 수 없습니다. 전체 기차 검색을 이용해 주세요.';return;}
  const found=stationGuideSearch(official,from,q,8);
  stationResult.textContent=found.length?'목적지를 누르면 선택 날짜의 실제 직통편을 확인합니다.':'일치하는 공식 기차역이 없습니다.';
  for(const station of found){
   const btn=document.createElement('button');btn.type='button';btn.className='sp-station-choice';
   btn.textContent=station.name.replace(/역$/u,'')+'역';
   btn.addEventListener('click',()=>checkSelectedStation(station));
   stationMatches.append(btn);
  }
 }
 async function checkSelectedStation(station){
  if(checkingStation)return;
  checkingStation=true;const date=dateInput.value;
  stationMatches.querySelectorAll('button').forEach(button=>{button.disabled=true});
  stationResult.textContent=station.name.replace(/역$/u,'')+'역 직통 시간표 확인 중…';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const result=await check(station.id,date,controller.signal);
   if(dateInput.value!==date){stationResult.textContent='날짜가 변경됐습니다. 목적지를 다시 선택해 주세요.';return;}
   if(result.state==='confirmed'){location.assign(routeUrl(station.id,date));return;}
   stationResult.textContent=result.state==='unknown'?
    '공식 응답이 일부만 도착해 직통 여부를 확인하지 못했습니다. 공식 예매처에서 확인해 주세요.':
    '선택한 날짜에 해당 직통 구간의 시간표가 확인되지 않았습니다. 환승편이 없다는 뜻은 아닙니다.';
  }catch{
   stationResult.textContent='공식 API 연결을 확인하지 못했습니다. 공식 예매처에서 운행 여부를 확인해 주세요.';
  }finally{
   clearTimeout(timer);checkingStation=false;
   stationMatches.querySelectorAll('button').forEach(button=>{button.disabled=false});
  }
 }
 more.addEventListener('click',loadMore);
 dateInput.addEventListener('change',()=>{update();stationResult.textContent='날짜가 변경됐습니다. 필요한 목적지를 다시 확인해 주세요.';});
 stationSearch.addEventListener('input',renderMatches);
 update();
 fetch('/api/stations?v=nationwide-regions-v1',{headers:{Accept:'application/json'}})
 .then(async response=>{
  const body=await response.json();
  if(!response.ok||!body.ok||!Array.isArray(body.stations))throw Error('공식 역 목록 조회 실패');
  official=body.stations.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string');
  candidates=stationGuideCandidates({id:from,name:fromName},editorial,official);
  originLoading=false;
  update();renderMatches();
 })
 .catch(()=>{
  originLoading=false;
  renderProgress();
  stationResult.textContent='전국 공식 역 목록을 가져오지 못했습니다. 메인 시간표 검색을 이용해 주세요.';
 });
}
