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
  const requestId=++revision;submit.disabled=true;submit.textContent='공식 시간표 조회 중…';results.textContent='국토교통부 공식 데이터를 확인하고 있습니다.';message(`${fromName}역 → ${toName}역 시간표 검색 중`);
  const target=new URL(location.href);target.searchParams.set('date',date);if(grade==='전체')target.searchParams.delete('grade');else target.searchParams.set('grade',grade);history.replaceState(null,'',target);
  try{
   const u=new URL('/api/trains',location.origin);for(const [k,v] of Object.entries({from,to,date}))u.searchParams.set(k,v);
   const response=await fetch(u,{headers:{Accept:'application/json'}});const data=await response.json();
   if(requestId!==revision)return;
   if(!response.ok||!data.ok||!Array.isArray(data.trains))throw Error(data.error||'공식 시간표 응답을 처리하지 못했습니다.');
   const rows=data.trains.filter(r=>matchesTrainFilter(r.grade,grade));
   if(!rows.length){results.textContent=data.trains.length?'선택한 열차 종류의 조회 결과가 없습니다. 전체 열차로 바꿔보세요.':'공공데이터에서 이 구간의 직통 시간표를 받지 못했습니다. 운행 여부는 공식 예매처에서 재확인해 주세요.'}
   else renderTrainTimetable(results,rows,{from:fromName,to:toName,date});
   message(`${date} 기준 · ${rows.length}건 표시${data.partial?' · 일부 배차 누락 가능':''}. 잔여좌석과 최종 운행정보는 공식 예매처에서 확인하세요.`,data.partial?'warning':'ok');
  }catch(error){if(requestId!==revision)return;results.textContent='공식 API 조회에 실패했습니다. 상단 검색 조건과 공식 예매처를 확인해 주세요.';message(error.message||'열차 시간표를 확인하지 못했습니다.','error')}
  finally{if(requestId===revision){submit.disabled=false;submit.textContent='시간표 조회하기'}}
 }
 form.addEventListener('submit',e=>{e.preventDefault();load()});
 load();
}