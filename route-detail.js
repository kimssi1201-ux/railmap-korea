import {renderTrainTimetable} from './timetable-view.js';
import {matchesTrainFilter} from './train-types.js';
const app=document.getElementById('routeApp');
if(app){
 const form=document.getElementById('routeSearchForm'),dateInput=document.getElementById('routeDate'),gradeInput=document.getElementById('routeGrade');
 const submit=document.getElementById('routeSubmit'),status=document.getElementById('routeStatus'),results=document.getElementById('routeResults');
 const {from,to,fromName,toName}=app.dataset;
 const ymd=(days=0)=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return new Date(Date.UTC(+p.year,+p.month-1,+p.day+days)).toISOString().slice(0,10)};
 const url=new URL(location.href),suppliedDate=url.searchParams.get('date');
 dateInput.min=ymd();dateInput.max=ymd(31);dateInput.value=suppliedDate&&suppliedDate>=dateInput.min&&suppliedDate<=dateInput.max?suppliedDate:dateInput.min;
 const incomingGrade=url.searchParams.get('grade');if(['전체','KTX','SRT','일반'].includes(incomingGrade))gradeInput.value=incomingGrade;
 let revision=0;
 const message=(text,kind='')=>{status.textContent=text;status.dataset.status=kind};
 async function load(){
  const date=dateInput.value,grade=gradeInput.value;
  if(date<ymd()||date>ymd(31)){message('오늘부터 31일 이내 날짜를 선택해 주세요.','error');return}
  const requestId=++revision;submit.disabled=true;submit.textContent='공식 시간표 조회 중…';results.hidden=false;results.textContent='국토교통부 공식 데이터를 확인하고 있습니다.';message(`${fromName}역 → ${toName}역 시간표 검색 중`);
  const target=new URL(location.href);target.searchParams.set('date',date);if(grade==='전체')target.searchParams.delete('grade');else target.searchParams.set('grade',grade);history.replaceState(null,'',target);
  try{
   const u=new URL('/api/trains',location.origin);for(const [k,v] of Object.entries({from,to,date}))u.searchParams.set(k,v);
   const response=await fetch(u,{headers:{Accept:'application/json'}});const data=await response.json();
   if(requestId!==revision)return;
   if(!response.ok||!data.ok||!Array.isArray(data.trains))throw Error(data.error||'공식 시간표 응답을 처리하지 못했습니다.');
   const rows=data.trains.filter(r=>matchesTrainFilter(r.grade,grade));
   if(!rows.length){
    // No blank schedule table or misleading green "0 results" success message.
    results.replaceChildren();results.hidden=true;
    const note=data.trains.length?'선택한 열차 종류에 확인된 운행이 없습니다. 다른 종류로 바꿔보세요.':
      data.partial?'공식 데이터가 일부만 도착해 이 구간의 운행 여부를 판단할 수 없습니다.':
      '해당 날짜에 확인된 직통 시간표가 없어 빈 결과 표를 표시하지 않습니다. 다른 날짜나 목적지를 선택해 주세요.';
    message(note,'warning');return;
   }
   results.hidden=false;
   renderTrainTimetable(results,rows,{from:fromName,to:toName,date});
   message(`${date} 기준 · ${rows.length}건 확인${data.partial?' · 일부 배차 누락 가능':''}. 잔여좌석과 최종 운행정보는 공식 예매처에서 확인하세요.`,data.partial?'warning':'ok');
  }catch(error){
   if(requestId!==revision)return;
   results.hidden=false;results.replaceChildren();
   const box=document.createElement('div');box.className='sp-fetch-failure';
   const summary=document.createElement('p');summary.textContent='공식 열차정보 서버에서 시간표를 받아오지 못했습니다. 실제 운행이 없다는 뜻은 아닙니다.';
   const retry=document.createElement('button');retry.type='button';retry.className='sp-retry-button';retry.textContent='다시 조회하기';retry.addEventListener('click',()=>load());
   const official=document.createElement('a');official.className='sp-secondary-link';official.href='https://www.korail.com/';official.target='_blank';official.rel='noopener noreferrer';official.textContent='코레일에서 확인 ↗';
   box.append(summary,retry,official);results.append(box);
   message(error.message||'열차 시간표를 확인하지 못했습니다.','error');
  }
  finally{if(requestId===revision){submit.disabled=false;submit.textContent='시간표 조회하기'}}
 }
 form.addEventListener('submit',e=>{e.preventDefault();load()});
 load();
}