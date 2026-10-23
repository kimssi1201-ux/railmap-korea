import {classifyRailAvailability} from './route-availability.js';
const section=document.getElementById('spDestinationPicker');
if(section){
 const from=section.dataset.station,select=document.getElementById('spDestinationSelect');
 const button=document.getElementById('spDestinationGo'),hint=document.getElementById('spDestinationHint');
 const dateInput=document.getElementById('spCheckDate');
 const recommendationStatus=document.getElementById('spRecommendationStatus');
 const recommended=[...document.querySelectorAll('.sp-verified-route')];
 const today=(offset=0)=>{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+p.year,+p.month-1,+p.day+offset)).toISOString().slice(0,10);
 };
 dateInput.min=today();dateInput.max=today(31);dateInput.value=today();
 const cache=new Map();let scanId=0,selectId=0;
 const makeUrl=(to,date)=>'/routes/'+encodeURIComponent(from)+'/'+encodeURIComponent(to)+'?date='+encodeURIComponent(date);
 async function check(to,date){
  const key=from+'|'+to+'|'+date;
  if(cache.has(key))return cache.get(key);
  const url=new URL('/api/trains',location.origin);
  for(const [k,v] of Object.entries({from,to,date}))url.searchParams.set(k,v);
  const response=await fetch(url.toString(),{headers:{Accept:'application/json'}});
  const body=await response.json();
  if(!response.ok||!body.ok)throw new Error(body.error||'공식 시간표 조회에 실패했습니다.');
  const result=classifyRailAvailability(body);
  cache.set(key,result);
  return result;
 }
 function checkSelected(){button.disabled=!select.value||select.value===from}
 async function renderRecommendations(){
  const id=++scanId,date=dateInput.value;
  recommended.forEach(a=>a.hidden=true);
  if(!recommended.length){if(recommendationStatus)recommendationStatus.textContent='직통 여부가 확인된 추천 구간이 없습니다. 아래에서 목적지를 선택해 확인하세요.';return}
  if(recommendationStatus)recommendationStatus.textContent='해당 날짜에 시간표가 확인되는 추천 구간만 표시하고 있습니다.';
  let confirmed=0,unavailable=0;
  // No more than two simultaneous public API requests.
  for(let i=0;i<recommended.length;i+=2){
   await Promise.all(recommended.slice(i,i+2).map(async link=>{
    try{
     const result=await check(link.dataset.destinationId,date);
     if(id!==scanId)return;
     if(result==='confirmed'){link.hidden=false;link.href=makeUrl(link.dataset.destinationId,date);confirmed++}
     else if(result==='unavailable')unavailable++;
    }catch{if(id===scanId)unavailable++}
   }));
   if(id!==scanId)return;
  }
  if(recommendationStatus){
   recommendationStatus.textContent=confirmed
    ?'선택 날짜에 공식 시간표가 확인된 구간만 표시합니다.'+(unavailable?' 일부 구간은 서버 오류로 확인하지 못했습니다.':'')
    :unavailable?'현재 공식 시간표 서버 응답을 확인할 수 없어 추천 구간을 표시하지 않습니다.':'선택 날짜에 확인된 직통 추천 구간이 없습니다.';
  }
 }
 select.addEventListener('change',()=>{checkSelected();hint.textContent=''});
 dateInput.addEventListener('change',()=>{selectId++;checkSelected();hint.textContent='날짜가 변경됐습니다. 목적지를 확인해 주세요.';renderRecommendations()});
 button.addEventListener('click',async()=>{
  const to=select.value,date=dateInput.value;if(!to||to===from||button.disabled)return;
  const id=++selectId;
  button.disabled=true;button.textContent='공식 시간표 확인 중…';hint.textContent='';
  try{
   const result=await check(to,date);
   if(id!==selectId)return;
   if(result==='confirmed'){location.href=makeUrl(to,date);return}
   hint.textContent=result==='empty'
     ?'선택 날짜에 공식 직통 시간표가 확인되지 않아 이 구간의 빈 상세페이지로 이동하지 않습니다. 다른 날짜나 목적지를 선택해 주세요.'
     :'API에서 일부 정보만 받아 직통 여부를 판단할 수 없습니다. 잠시 후 다시 확인해 주세요.';
  }catch(e){if(id!==selectId)return;hint.textContent='공식 시간표 조회에 실패했습니다. 실제 운행이 없다는 뜻은 아닙니다. '+(e.message||'')}
  finally{if(id===selectId){button.textContent='선택한 목적지 시간표 보기 →';checkSelected()}}
 });
 fetch('/api/stations?v=nationwide-regions-v1',{headers:{Accept:'application/json'}})
 .then(async res=>{
  const data=await res.json();if(!res.ok||!data.ok||!Array.isArray(data.stations))throw new Error(data.error||'목적지를 불러오지 못했습니다.');
  if(!data.stations.some(s=>s.id===from))throw new Error('해당 역을 공식 목록에서 확인하지 못했습니다.');
  const options=data.stations.filter(s=>s.id&&s.name&&s.id!==from).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  select.replaceChildren();const placeholder=document.createElement('option');placeholder.textContent='목적지 역을 선택하세요';placeholder.value='';select.append(placeholder);
  for(const station of options){const opt=document.createElement('option');opt.value=station.id;opt.textContent=station.name.endsWith('역')?station.name:station.name+'역';select.append(opt)}
  select.disabled=false;hint.textContent='공식 역 '+options.length+'곳 · 시간표가 확인된 경우에만 상세페이지로 이동합니다.';
 }).catch(e=>{hint.textContent=e.message+' 메인 기차 검색도 이용해 주세요.';button.disabled=true});
 renderRecommendations();
}
