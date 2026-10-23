import {classifyRailAvailability} from './route-availability.js';
const area=document.getElementById('spVerifiedRoutes');
if(area){
 const from=area.dataset.station,status=document.getElementById('spRecommendationStatus');
 const dateInput=document.getElementById('spCheckDate');
 const today=(offset=0)=>{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return new Date(Date.UTC(+p.year,+p.month-1,+p.day+offset)).toISOString().slice(0,10);
 };
 dateInput.min=today();dateInput.max=today(31);dateInput.value=dateInput.min;
 let candidates=[];
 try{const all=JSON.parse(area.dataset.candidates||'[]');if(Array.isArray(all))candidates=all.filter(x=>x&&/^[a-z0-9_-]{4,30}$/i.test(x.id)&&typeof x.name==='string'&&x.id!==from)}
 catch{status.textContent='추천 구간 목록을 처리하지 못했습니다.'}
 let revision=0;
 const cache=new Map();
 function routeUrl(to,date){return '/routes/'+encodeURIComponent(from)+'/'+encodeURIComponent(to)+'?date='+encodeURIComponent(date)}
 async function check(to,date){
  const key=to+'|'+date;
  if(cache.has(key))return cache.get(key);
  const uri=new URL('/api/trains',location.origin);
  for(const [k,v] of Object.entries({from,to,date}))uri.searchParams.set(k,v);
  const response=await fetch(uri.toString(),{headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'공식 시간표 조회에 실패했습니다.');
  const state=classifyRailAvailability(data);
  if(state==='confirmed'){const result={state,count:data.trains.length};cache.set(key,result);return result}
  return {state,count:0};
 }
 function linkFor(station,date,count){
  const a=document.createElement('a');a.className='sp-link';a.href=routeUrl(station.id,date);
  const name=document.createElement('strong');name.textContent=station.name+'역';
  const note=document.createElement('small');note.textContent='직통 '+count+'편 확인 · 날짜별 시간표';
  const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
  a.append(name,note,arrow);return a;
 }
 async function update(){
  const id=++revision,date=dateInput.value;
  area.replaceChildren();
  if(!candidates.length){status.textContent='현재 등록된 추천 구간이 없습니다. 다른 목적지는 전체 기차 검색을 이용해 주세요.';return}
  status.textContent='선택한 날짜에 배차가 확인되는 구간만 조회 중입니다…';
  let confirmed=0,unknown=0;
  for(let i=0;i<candidates.length;i+=2){
   const batch=candidates.slice(i,i+2);
   const checks=await Promise.all(batch.map(async x=>{try{return await check(x.id,date)}catch{return {state:'unavailable',count:0}}}));
   if(id!==revision)return;
   checks.forEach((result,j)=>{
    if(result.state==='confirmed'){area.append(linkFor(batch[j],date,result.count));confirmed++}
    if(result.state==='unavailable')unknown++;
   });
  }
  status.textContent=confirmed?'선택한 날짜에 운행편이 확인된 '+confirmed+'개 목적지만 표시합니다.'+(unknown?' 일부 구간은 API 오류로 확인하지 못했습니다.':''):
   unknown?'공식 시간표 서버에 연결되지 않아 추천 구간을 표시하지 않았습니다. 실제 운행이 없다는 뜻은 아닙니다.':
   '해당 날짜에 확인된 직통 추천 구간이 없습니다. 다른 날짜 또는 전체 기차 검색을 이용해 주세요.';
 }
 dateInput.addEventListener('change',update);
 update();
}