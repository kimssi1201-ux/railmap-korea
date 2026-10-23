import {RAIL_CORRIDORS} from './train-destinations.js';
import {normalizeName} from './station-utils.js';

const PRIORITY=['서울','용산','청량리','오송','천안아산','광명','대전','동대구','익산','서대전','수원','부산','광주송정','부전','제천','원주'];
const key=normalizeName;
const safeId=id=>/^[a-z0-9-]{4,30}$/i.test(String(id??''));
const normalizedDateTime=value=>{
 const s=String(value??'');
 if(!/^\d{12}(\d{2})?$/.test(s))return null;
 const year=Number(s.slice(0,4)),month=Number(s.slice(4,6)),day=Number(s.slice(6,8)),hour=Number(s.slice(8,10)),minute=Number(s.slice(10,12)),second=s.length===14?Number(s.slice(12,14)):0;
 const time=Date.UTC(year,month-1,day,hour,minute,second);
 if(!Number.isFinite(time))return null;
 const d=new Date(time);
 if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day||d.getUTCHours()!==hour||d.getUTCMinutes()!==minute||d.getUTCSeconds()!==second)return null;
 return time;
};
export const clockFromTrainTime=value=>normalizedDateTime(value)===null?'—':String(value).slice(8,10)+':'+String(value).slice(10,12);

// A curated corridor only proposes an interchange station, never claims a train serves it.
export function transferHubCandidates(from,to,stations,limit=2){
 const fromName=key(from?.name),toName=key(to?.name);
 if(!fromName||!toName||fromName===toName||!Array.isArray(stations))return [];
 const a=RAIL_CORRIDORS.filter(line=>line.some(n=>key(n)===fromName));
 const b=RAIL_CORRIDORS.filter(line=>line.some(n=>key(n)===toName));
 if(!a.length||!b.length)return [];
 const nearOrigin=new Set(a.flat().map(key)),nearDestination=new Set(b.flat().map(key));
 const stationMap=new Map(stations.filter(s=>safeId(s?.id)&&s?.name).map(s=>[key(s.name),s]));
 const matches=[...nearOrigin].filter(n=>n!==fromName&&n!==toName&&nearDestination.has(n)&&stationMap.has(n));
 const priority=new Map(PRIORITY.map((name,i)=>[key(name),i]));
 return matches.sort((x,y)=>(priority.get(x)??999)-(priority.get(y)??999)||x.localeCompare(y,'ko'))
  .slice(0,Math.min(3,Math.max(0,limit))).map(n=>stationMap.get(n));
}

export function connectTimedTrains(firstLeg,secondLeg,hub,{date='',minWait=20,maxWait=180,maxResults=4}={}){
 const a=Array.isArray(firstLeg)?firstLeg:[],b=Array.isArray(secondLeg)?secondLeg:[];
 const options=[];
 for(const first of a){
  const dep=normalizedDateTime(first?.depTime),arr=normalizedDateTime(first?.arrTime);
  if(dep===null||arr===null||dep>=arr)continue;
  if(date&&String(first.depTime).slice(0,8)!==date.replaceAll('-',''))continue;
  for(const second of b){
   const change=normalizedDateTime(second?.depTime),end=normalizedDateTime(second?.arrTime);
   if(change===null||end===null||change>=end||end<=arr)continue;
   // First version deliberately supports only same-day, same-station transfers.
   if(String(first.arrTime).slice(0,8)!==String(second.depTime).slice(0,8))continue;
   const wait=(change-arr)/60000;
   if(wait<minWait||wait>maxWait)continue;
   if(first.trainNo&&second.trainNo&&String(first.trainNo)===String(second.trainNo)&&first.grade===second.grade)continue;
   const fare1=first.adultFare,fare2=second.adultFare;
   const fare=Number.isFinite(fare1)&&fare1>0&&Number.isFinite(fare2)&&fare2>0?fare1+fare2:null;
   options.push({hub,first,second,waitMinutes:Math.round(wait),durationMinutes:Math.round((end-dep)/60000),fare,departure:dep,arrival:end});
  }
 }
 return options.sort((x,y)=>x.departure-y.departure||x.arrival-y.arrival||x.waitMinutes-y.waitMinutes).slice(0,maxResults);
}

export async function fetchOfficialLeg({from,to,date,signal,fetchFn=fetch,origin=location.origin}){
 if(!safeId(from)||!safeId(to)||from===to)throw Error('역 코드가 잘못됐습니다.');
 const url=new URL('/api/trains',origin);
 for(const [k,v] of Object.entries({from,to,date}))url.searchParams.set(k,v);
 const response=await fetchFn(url.toString(),{headers:{Accept:'application/json'},signal});
 const body=await response.json();
 if(!response.ok||body?.ok!==true||!Array.isArray(body?.trains))throw Error(body?.error||'공식 열차정보 조회 실패');
 return body;
}

export async function searchOneTransfer({from,to,date,stations,signal,fetchLeg=fetchOfficialLeg,maxHubs=2}){
 const hubs=transferHubCandidates(from,to,stations,maxHubs);
 let failed=0,partial=false;
 const results=[];
 // Two API requests run together per hub, capped to avoid overloading the public provider.
 for(const hub of hubs){
  if(signal?.aborted)throw Error('aborted');
  try{
   const [first,second]=await Promise.all([
    fetchLeg({from:from.id,to:hub.id,date,signal}),
    fetchLeg({from:hub.id,to:to.id,date,signal})
   ]);
   if(signal?.aborted)throw Error('aborted');
   partial=partial||!!first.partial||!!second.partial;
   results.push(...connectTimedTrains(first.trains,second.trains,hub,{date,maxResults:8}).map(option=>({...option,fromName:from.name,toName:to.name})));
  }catch(error){
   if(signal?.aborted)throw error;
   failed++;
  }
 }
 const seen=new Set();
 const unique=results.sort((a,b)=>a.departure-b.departure||a.arrival-b.arrival).filter(x=>{
  const id=[x.hub.id,x.first.trainNo,x.second.trainNo,x.first.depTime,x.second.depTime].join('|');
  if(seen.has(id))return false;seen.add(id);return true;
 }).slice(0,4);
 return {routes:unique,hubsChecked:hubs.length,failedHubs:failed,partial,scope:'당일 · 같은 역 · 1회 환승'};
}

export function renderTransferCards(container,routes){
 container.replaceChildren();
 for(const item of routes){
  const card=document.createElement('article');card.className='transfer-card';
  const heading=document.createElement('strong');heading.className='transfer-heading';
  heading.textContent='🚆 '+String(item.hub.name).replace(/역$/u,'')+'역에서 1회 환승';
  const summary=document.createElement('p');summary.className='transfer-summary';
  summary.textContent=clockFromTrainTime(item.first.depTime)+' 출발 → '+clockFromTrainTime(item.second.arrTime)+' 도착 · 총 '+item.durationMinutes+'분';
  const legs=document.createElement('div');legs.className='transfer-legs';
  const first=document.createElement('p');first.textContent='① '+String(item.fromName||item.first.fromName||'출발').replace(/역$/u,'')+' → '+String(item.hub.name).replace(/역$/u,'')+' · '+(item.first.grade||'열차')+' '+(item.first.trainNo||'')+'  '+clockFromTrainTime(item.first.depTime)+'–'+clockFromTrainTime(item.first.arrTime);
  const change=document.createElement('p');change.className='transfer-wait';change.textContent='환승 대기 '+item.waitMinutes+'분 · 플랫폼은 현장에서 확인';
  const second=document.createElement('p');second.textContent='② '+String(item.hub.name).replace(/역$/u,'')+' → '+String(item.toName||item.second.toName||'도착').replace(/역$/u,'')+' · '+(item.second.grade||'열차')+' '+(item.second.trainNo||'')+'  '+clockFromTrainTime(item.second.depTime)+'–'+clockFromTrainTime(item.second.arrTime);
  legs.append(first,change,second);
  card.append(heading,summary,legs);
  if(item.fare!==null){const fare=document.createElement('small');fare.textContent='구간별 성인 운임 합계 '+item.fare.toLocaleString('ko-KR')+'원 (API 제공 기준)';card.append(fare);}
  container.append(card);
 }
}
