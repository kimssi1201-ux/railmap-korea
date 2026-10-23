import {hasConfirmedSchedule} from './result-visibility.js';
import {renderBusTimetable} from './timetable-view.js';
import {visibleTerminals,groupTerminalNames,findTerminalChoice,terminalChoice} from './terminal-display.js';
import {buildTerminalRegionDirectory} from './terminal-region.js';
'use strict';
const byId=id=>document.getElementById(id);
const type=new URLSearchParams(location.search).get('type')==='intercity'?'intercity':'express';
const intercity=type==='intercity';
const ui=Object.fromEntries(['busTitle','busIntro','expressTab','intercityTab','busStatus','busFrom','busTo','busSwap','terminalSuggestions','busForm','busDate','busToday','busTomorrow','busDateHint','dateWarning','busSubmit','busNotice','busResultsSection','busResultsTitle','busResultCount','busResults','busRegionToggle','busRegionPanel','busRegionToggleLabel','busRegionChips','busRegionStatus','busMunicipalityList','busRegionPicked','busRegionFootnote'].map(id=>[id,byId(id)]));
const state={terminals:[],displayTerminals:[],ready:false,selected:{from:null,to:null},focus:null,inFlight:0,directory:null,region:''};
function norm(x){return String(x??'').normalize('NFC').replace(/[\s·()]/g,'').replace(/터미널$|정류장$/,'').toLowerCase()}
function localDate(shift=0){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return new Date(Date.UTC(+p.year,+p.month-1,+p.day+shift)).toISOString().slice(0,10)}
function element(tag,content='',cls=''){const n=document.createElement(tag);n.textContent=content;if(cls)n.className=cls;return n}
function find(name){return findTerminalChoice(state.displayTerminals,name)}
function notify(message='',kind=''){ui.busNotice.textContent=message;ui.busNotice.className='notice'+(kind?' '+kind:'')}
function closeSuggestions(){ui.terminalSuggestions.hidden=true;ui.busFrom.setAttribute('aria-expanded','false');ui.busTo.setAttribute('aria-expanded','false')}
function pick(side,choice){state.selected[side]=choice;const input=side==='from'?ui.busFrom:ui.busTo;input.value=choice.name;closeSuggestions();input.blur();updateDirectorySelection()}
function showSuggestions(side){
 state.focus=side;
 const input=side==='from'?ui.busFrom:ui.busTo;
 const q=norm(input.value);
 const groups=groupTerminalNames(state.displayTerminals).filter(group=>!q||norm(group.name).includes(q)).sort((a,b)=>{
  if(q){const rank=x=>norm(x.name)===q?0:norm(x.name).startsWith(q)?1:2;const delta=rank(a)-rank(b);if(delta)return delta;}
  return a.name.localeCompare(b.name,'ko');
 });
 ui.terminalSuggestions.replaceChildren();
 if(!state.ready)ui.terminalSuggestions.append(element('div','공식 터미널 목록을 불러오는 중입니다.','no-match'));
 else{
  const summary=q?`검색 결과 ${groups.length}곳 · 같은 이름은 한 번만 표시합니다.`:`검색 가능한 터미널 ${groupTerminalNames(state.displayTerminals).length}곳 · 이름을 입력해 찾으세요.`;
  ui.terminalSuggestions.append(element('div',summary,'terminal-list-hint'));
  if(!groups.length)ui.terminalSuggestions.append(element('div','일치하는 터미널이 없습니다. 다른 이름으로 검색해 보세요.','no-match'));
  for(const group of groups){
   const choice=terminalChoice(group);if(!choice)continue;
   const button=element('button','','terminal-choice');button.type='button';button.setAttribute('role','option');
   button.append(element('strong',group.name));
   if(choice.ids.length>1)button.append(element('small','시간표 통합 조회'));
   button.addEventListener('click',()=>pick(side,choice));
   ui.terminalSuggestions.append(button);
  }
 }
 ui.terminalSuggestions.hidden=false;
 ui.terminalSuggestions.scrollTop=0;
 input.setAttribute('aria-expanded','true');
}
function resolve(side){const input=side==='from'?ui.busFrom:ui.busTo;const existing=state.selected[side];if(existing&&norm(existing.name)===norm(input.value))return existing;const match=find(input.value);if(match){state.selected[side]=match;input.value=match.name}return match}
function formatTime(s){return /^\d{12,14}$/.test(String(s))?String(s).slice(8,10)+':'+String(s).slice(10,12):'—'}
function duration(a,b){if(!/^\d{12,14}$/.test(a)||!/^\d{12,14}$/.test(b))return '소요시간 미제공';const start=Date.UTC(+a.slice(0,4),+a.slice(4,6)-1,+a.slice(6,8),+a.slice(8,10),+a.slice(10,12));const end=Date.UTC(+b.slice(0,4),+b.slice(4,6)-1,+b.slice(6,8),+b.slice(8,10),+b.slice(10,12));const delta=(end-start)/60000;if(delta<0||!Number.isFinite(delta))return '소요시간 미제공';const h=Math.floor(delta/60),m=delta%60;return h?`${h}시간 ${m}분`:`${m}분`}
function empty(title,desc){ui.busResults.replaceChildren();const div=element('div','','bus-empty');div.append(element('strong',title),element('span',desc));ui.busResults.append(div)}
function render(buses,from,to,partial,diagnostics=null){
 ui.busResults.replaceChildren();
 ui.busResultsTitle.textContent=from+' → '+to;ui.busResultCount.textContent=buses.length+'건';
 if(!hasConfirmedSchedule(buses)){ui.busResultsSection.hidden=true;ui.busResultCount.textContent='—';return;}
 ui.busResultsSection.hidden=false;
 renderBusTimetable(ui.busResults,buses,{from,to,date:ui.busDate.value,bookingUrl:intercity?'https://txbus.t-money.co.kr/':'https://www.kobus.co.kr/'});
 if(partial)ui.busResults.append(element('p','공식 API의 페이지 제한 또는 일부 조회 실패로 결과가 누락됐을 수 있습니다.','bus-info-note'));
}
async function loadTerminals(){ui.busStatus.textContent='공식 터미널 연결 중';try{const r=await fetch('/api/bus-terminals?type='+type,{headers:{Accept:'application/json'}});const data=await r.json();if(!r.ok||!data.ok||!Array.isArray(data.terminals))throw Error(data.error||'목록을 불러오지 못했습니다.');state.terminals=data.terminals.filter(x=>x&&x.id&&x.name);state.displayTerminals=visibleTerminals(state.terminals);if(!state.displayTerminals.length)throw Error('조회 가능한 터미널이 없습니다.');state.ready=true;renderRegionDirectory();ui.busStatus.textContent=`검색 터미널 ${groupTerminalNames(state.displayTerminals).length}곳`;ui.busStatus.className='service-status ok';if(data.partial)notify('일부 터미널이 목록에서 누락될 수 있습니다.','');if(!ui.terminalSuggestions.hidden&&state.focus)showSuggestions(state.focus);for(const side of ['from','to'])resolve(side)}catch(error){state.ready=false;ui.busStatus.textContent='API 연결 확인 필요';ui.busStatus.className='service-status error';notify(`${error.message} · 공공데이터 활용 승인과 Cloudflare TAGO_API_KEY 설정을 확인해 주세요.`,'error');closeSuggestions()}}
async function search(e){e.preventDefault();closeSuggestions();if(!state.ready){notify('터미널 API가 아직 연결되지 않았습니다.','error');return}const from=resolve('from'),to=resolve('to');if(!from){notify('목록에서 출발 터미널을 선택해 주세요.','error');ui.busFrom.focus();return}if(!to){notify('목록에서 도착 터미널을 선택해 주세요.','error');ui.busTo.focus();return}if(from.name===to.name || (from.ids.length===1&&to.ids.length===1&&from.ids[0]===to.ids[0])){notify('출발·도착 터미널은 달라야 합니다.','error');return}const date=ui.busDate.value;if(intercity&&date!==localDate()){notify('시외버스는 공식 API에서 오늘 배차만 조회할 수 있습니다.','error');return}if(!intercity&&(date<localDate()||date>localDate(31))){notify('오늘부터 31일 이내 날짜를 선택해 주세요.','error');return}const seq=++state.inFlight;ui.busSubmit.disabled=true;ui.busSubmit.querySelector('span').textContent='조회 중…';notify('공식 시간표를 확인하고 있습니다.');ui.busResultsSection.hidden=true;try{const url=new URL('/api/bus-timetables',location.origin);for(const [k,v] of Object.entries({type,from:from.ids.join(','),to:to.ids.join(','),date}))url.searchParams.set(k,v);const r=await fetch(url.toString(),{headers:{Accept:'application/json'}});const data=await r.json();if(seq!==state.inFlight)return;if(!r.ok||!data.ok)throw Error(data.error||'시간표 조회에 실패했습니다.');const buses=Array.isArray(data.buses)?data.buses:[];render(buses,from.name,to.name,!!data.partial,data.diagnostics);
 if(!hasConfirmedSchedule(buses)){
  const unparsed=data.diagnostics?.receivedItems>0;
  const message=unparsed?'공식 데이터가 도착했지만 시간 정보를 정상적으로 해석하지 못했습니다.':data.partial?'일부 터미널 코드의 조회에 실패하여 운행 여부를 판단할 수 없습니다.':'해당 날짜에 TAGO에서 확인된 직통 배차가 없습니다. 실제 운행이 없다는 뜻은 아닙니다.';
  notify(message+' 공식 예매처에서 확인해 주세요.',unparsed?'error':'');
  const links=intercity?[['버스타고','https://www.bustago.or.kr/'],['티머니 시외버스','https://txbus.t-money.co.kr/']]:[['고속버스 예매','https://www.kobus.co.kr/']];
  for(const [label,href] of links){ui.busNotice.append(document.createTextNode(' · '));const a=element('a',label+' ↗','bus-verify-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';ui.busNotice.append(a)}
  return;
 }
 notify(data.partial?`${date} · 일부 터미널 코드의 조회가 실패했거나 배차가 더 있을 수 있습니다. 공식 예매처에서도 확인해 주세요.`:`${date} · 공식 ${intercity?'시외':'고속'}버스 배차정보 조회 완료. 잔여좌석과 예매 가능 여부는 예매처에서 확인해 주세요.`,data.partial?'':'ok');
 ui.busResultsSection.scrollIntoView({block:'start',inline:'nearest',behavior:'smooth'});}catch(error){if(seq!==state.inFlight)return;ui.busResultsSection.hidden=true;ui.busResultCount.textContent='—';notify(error.message+' · 실제 운행이 없다는 뜻은 아닙니다.','error')}finally{if(seq===state.inFlight){ui.busSubmit.disabled=false;ui.busSubmit.querySelector('span').textContent='버스 시간표 검색하기'}}}
function start(){ui.busResultsSection.hidden=true;ui.busTitle.textContent=intercity?'시외버스 시간표 찾기':'고속버스 시간표 찾기';ui.busIntro.textContent=intercity?'오늘 출발하는 시외버스 배차를 터미널별로 확인하세요.':'터미널과 날짜를 선택하면 공식 배차 정보를 조회합니다.';ui[intercity?'intercityTab':'expressTab'].setAttribute('aria-current','page');ui.busDate.value=localDate();ui.busDate.min=localDate();ui.busDate.max=intercity?localDate():localDate(31);ui.busDateHint.textContent=intercity?'오늘 출발편만 조회':'출발일 기준';ui.busTomorrow.hidden=intercity;ui.dateWarning.hidden=!intercity;for(const side of ['from','to']){const input=side==='from'?ui.busFrom:ui.busTo;input.addEventListener('focus',()=>showSuggestions(side));input.addEventListener('input',()=>{state.selected[side]=null;updateDirectorySelection();showSuggestions(side)});input.addEventListener('keydown',event=>{if(event.key==='Escape')closeSuggestions();if(event.key==='Enter'&&!ui.terminalSuggestions.hidden){const first=ui.terminalSuggestions.querySelector('button');if(first){event.preventDefault();first.click()}}})}document.addEventListener('pointerdown',event=>{if(!event.target.closest('.station-fields')&&!event.target.closest('#terminalSuggestions'))closeSuggestions()});ui.busSwap.addEventListener('click',()=>{const temp=ui.busFrom.value;ui.busFrom.value=ui.busTo.value;ui.busTo.value=temp;const old=state.selected.from;state.selected.from=state.selected.to;state.selected.to=old;updateDirectorySelection();closeSuggestions()});ui.busToday.addEventListener('click',()=>ui.busDate.value=localDate());ui.busTomorrow.addEventListener('click',()=>ui.busDate.value=localDate(1));ui.busForm.addEventListener('submit',search);initRegionDirectory();loadTerminals()}
function updateDirectorySelection(){
 const sideName=side=>state.selected[side]?.name||'미선택';
 ui.busRegionPicked.textContent=`선택한 터미널 · 출발 ${sideName('from')} / 도착 ${sideName('to')}`;
}
function renderRegionCities(){
 ui.busMunicipalityList.replaceChildren();
 const region=state.directory?.regions.find(item=>item.name===state.region);
 if(!region){ui.busRegionStatus.textContent='시·도를 선택해 주세요.';return}
 ui.busRegionStatus.textContent=`${region.name} · ${region.cities.length}개 시·군 · 터미널 이름 ${region.count}곳`;
 if(!region.count){ui.busMunicipalityList.append(element('p','현재 공식 목록에 이 지역으로 확인되는 터미널이 없습니다. 위 전국 이름 검색을 이용해 주세요.','bus-region-empty'));return}
 for(const city of region.cities){
  const details=element('details','','bus-municipality');
  const summary=element('summary');
  summary.append(element('strong',city.name),element('small',`${city.terminals.length}곳`));
  details.append(summary);
  const items=element('div','','bus-municipality-items');
  for(const group of city.terminals){
   const row=element('div','','bus-directory-terminal');
   row.append(element('strong',group.name,'bus-directory-terminal-name'));
   const actions=element('div','','bus-directory-actions');
   for(const [side,label] of [['from','출발'],['to','도착']]){
    const button=element('button',label,'bus-directory-pick');
    button.type='button';button.setAttribute('aria-label',`${group.name}을 ${label} 터미널로 선택`);
    button.addEventListener('click',()=>{
     const choice=terminalChoice(group);if(!choice)return;
     pick(side,choice);
     notify(`${label} 터미널로 ${choice.name}을 선택했습니다. 나머지 터미널과 날짜를 확인하세요.`,'ok');
     if(state.selected.from&&state.selected.to)ui.busForm.scrollIntoView({block:'start',behavior:'smooth'});
    });
    actions.append(button);
   }
   row.append(actions);items.append(row);
  }
  details.append(items);ui.busMunicipalityList.append(details);
 }
}
function chooseRegion(region,updateUrl=true){
 if(!state.directory?.regions.some(x=>x.name===region))return;
 state.region=region;
 ui.busRegionChips.querySelectorAll('button').forEach(button=>{
  const selected=button.dataset.region===region;
  button.classList.toggle('active',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 renderRegionCities();
 if(updateUrl){
  const url=new URL(location.href);url.searchParams.set('region',region);
  history.replaceState(null,'',url);
 }
 for(const [id,kind] of [['expressTab','express'],['intercityTab','intercity']]){
  ui[id].href=`/bus.html?type=${kind}&region=${encodeURIComponent(region)}`;
 }
}
function renderRegionDirectory(){
 const directory=buildTerminalRegionDirectory(groupTerminalNames(state.displayTerminals));
 state.directory=directory;
 ui.busRegionChips.replaceChildren();
 for(const region of directory.regions){
  const button=element('button','','bus-region-chip');button.type='button';button.dataset.region=region.name;
  button.append(element('strong',region.name),element('small',`${region.count}곳`));
  button.disabled=region.count===0;
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>chooseRegion(region.name));ui.busRegionChips.append(button);
 }
 ui.busRegionFootnote.textContent=`지역명으로 분류하기 어려운 ${directory.unclassified.length}곳은 임의로 배치하지 않았습니다. 위 전국 이름 검색에서 계속 찾을 수 있습니다.`;
 ui.busRegionToggle.disabled=false;
 updateDirectorySelection();
 const fromUrl=new URLSearchParams(location.search).get('region');
 const requested=directory.regions.find(r=>r.name===fromUrl&&r.count>0);
 if(requested){
  ui.busRegionPanel.hidden=false;ui.busRegionToggle.setAttribute('aria-expanded','true');ui.busRegionToggleLabel.textContent='접기 ▴';
  chooseRegion(requested.name,false);
 }else if(state.region){
  chooseRegion(state.region,false);
 }else ui.busRegionStatus.textContent='시·도를 먼저 선택해 주세요.';
}
function initRegionDirectory(){
 ui.busRegionToggle.addEventListener('click',()=>{
  const open=ui.busRegionPanel.hidden;
  ui.busRegionPanel.hidden=!open;
  ui.busRegionToggle.setAttribute('aria-expanded',String(open));
  ui.busRegionToggleLabel.textContent=open?'접기 ▴':'펼치기 ▾';
 });
}
start();