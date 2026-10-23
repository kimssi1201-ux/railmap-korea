// Responsive timetable rendering for official TAGO train and bus data.
// Intermediate station times are intentionally not inferred.
export function timetableTime(v){
 const s=String(v??'');
 if(!/^\d{12,14}$/.test(s))return '—';
 const h=Number(s.slice(8,10)),m=Number(s.slice(10,12));
 return h<24&&m<60?s.slice(8,10)+':'+s.slice(10,12):'—';
}
export function timetableFare(v){return Number.isFinite(v)&&v>0?Math.round(v).toLocaleString('ko-KR')+'원':'미제공'}
export function timetableDuration(a,b){
 if(timetableTime(a)==='—'||timetableTime(b)==='—')return '소요시간 미제공';
 const d=s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8),+s.slice(8,10),+s.slice(10,12));
 const m=(d(String(b))-d(String(a)))/60000;
 if(!Number.isFinite(m)||m<0)return '소요시간 미제공';
 const hours=Math.floor(m/60);
 return hours?hours+'시간 '+m%60+'분':m+'분';
}
export function trainTimetableRows(trains){
 return (Array.isArray(trains)?trains:[]).map(t=>({
  number:String(t.trainNo||'열차').trim(),grade:String(t.grade||'종류 미제공').trim(),
  departure:timetableTime(t.depTime),arrival:timetableTime(t.arrTime),
  fare:timetableFare(t.adultFare),duration:timetableDuration(t.depTime,t.arrTime),
  from:String(t.fromName||''),to:String(t.toName||''),
  isSrt:/SRT/i.test(String(t.grade||'')),raw:t
 }));
}
export function busTimetableRows(buses){
 return (Array.isArray(buses)?buses:[]).map(t=>({
  departure:timetableTime(t.departure),arrival:timetableTime(t.arrival),
  grade:String(t.grade||'등급 미제공'),fare:timetableFare(t.adultFare),
  duration:timetableDuration(t.departure,t.arrival),
  from:String(t.departureName||''),to:String(t.arrivalName||'')
 }));
}
let index=0;
function n(tag,s='',cls=''){const e=document.createElement(tag);e.textContent=String(s);if(cls)e.className=cls;return e}
function link(label,url){const a=n('a',label+' ↗','timetable-action');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
function table(target,headers,rows,subtitle,firstCell,details){
 target.replaceChildren();
 const wrapper=n('div','','timetable-shell'),top=n('div','','timetable-top');
 top.append(n('strong','시간표 '+rows.length+'건'),n('span',subtitle));
 wrapper.append(top);
 const scroll=n('div','','timetable-scroll'),tab=document.createElement('table');
 tab.className='timetable-table';tab.append(n('caption',subtitle,'sr-only'));
 const thead=document.createElement('thead'),header=document.createElement('tr');
 for(const h of headers)header.append(n('th',h));
 thead.append(header);tab.append(thead);
 const tbody=document.createElement('tbody');
 for(const item of rows){
  const tr=document.createElement('tr'),detail=document.createElement('tr'),id='railmap-time-detail-'+(++index);
  detail.className='timetable-detail-row';detail.hidden=true;
  const first=document.createElement('td'),toggle=n('button','','timetable-toggle');
  toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',id);
  firstCell(toggle,item);toggle.append(n('span','⌄','timetable-chevron'));
  toggle.addEventListener('click',()=>{detail.hidden=!detail.hidden;toggle.setAttribute('aria-expanded',String(!detail.hidden))});
  first.append(toggle);tr.append(first);
  for(const value of item.cells)tr.append(n('td',value,'timetable-data'));
  const td=document.createElement('td');td.colSpan=headers.length;td.id=id;
  details(td,item);detail.append(td);tbody.append(tr,detail);
 }
 tab.append(tbody);scroll.append(tab);wrapper.append(scroll);
 wrapper.append(n('p','행을 누르면 소요시간과 공식 예매 링크를 볼 수 있습니다.','timetable-caption'));
 target.append(wrapper);
}
export function renderTrainTimetable(target,trains,{from='',to='',date='',onBoarding}={}){
 const rows=trainTimetableRows(trains).map(r=>({...r,cells:[r.departure,r.arrival,r.fare]}));
 table(target,['열차·종류','출발','도착','성인 요금'],rows,[date,from&&to?from+' → '+to:''].filter(Boolean).join(' · '),
  (button,item)=>button.append(n('strong',item.number),n('small',item.grade)),
  (cell,item)=>{
   const route=[item.from||from,item.to||to].filter(Boolean).join(' → ');
   cell.append(n('p',[route,item.duration].filter(Boolean).join(' · '),'timetable-detail-description'));
   const actions=n('div','','timetable-actions');
   if(typeof onBoarding==='function'){const btn=n('button','타는 곳 안내','timetable-action timetable-button');btn.type='button';btn.addEventListener('click',()=>onBoarding(item.raw));actions.append(btn)}
   actions.append(link('공식 예매',item.isSrt?'https://etk.srail.kr/main.do':'https://www.korail.com/'));
   cell.append(actions);
  }
 );
}
export function renderBusTimetable(target,buses,{from='',to='',date='',bookingUrl='https://www.kobus.co.kr/'}={}){
 const rows=busTimetableRows(buses).map(r=>({...r,cells:[r.arrival,r.grade,r.fare]}));
 table(target,['출발','도착','등급','성인 요금'],rows,[date,from&&to?from+' → '+to:''].filter(Boolean).join(' · '),
  (button,item)=>button.append(n('strong',item.departure),n('small','상세 보기')),
  (cell,item)=>{
   const route=[item.from||from,item.to||to].filter(Boolean).join(' → ');
   cell.append(n('p',[route,item.duration].filter(Boolean).join(' · '),'timetable-detail-description'));
   const actions=n('div','','timetable-actions');actions.append(link('공식 예매처',bookingUrl));cell.append(actions);
  }
 );
}