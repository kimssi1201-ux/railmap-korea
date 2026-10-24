import {destinationCandidates} from './train-destinations.js';
import {sameCorridorStations} from './station-matching.js';

// A shortlist is not the full rail network. Only official dated API rows can confirm a route.
export function candidateStationsForVerification(origin,stations=[],limit=8){
 const map=new Map((Array.isArray(stations)?stations:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id).map(s=>[s.id,s]));
 const priority=new Map(['서울','청량리','부전','동대구','태화강','포항','동해','경주','진주','마산','익산','대전','부산','목포','광주송정'].map((s,i)=>[s,i]));
 const suggested=destinationCandidates(origin,[...map.values()],24);
 const nearby=sameCorridorStations(origin,[...map.values()],24);
 const unique=new Map([...suggested,...nearby].map(s=>[s.id,s]));
 return [...unique.values()].sort((a,b)=>{
  const pa=priority.get(a.name.replace(/역$/u,'')),pb=priority.get(b.name.replace(/역$/u,''));
  return (pa??999)-(pb??999)||a.name.localeCompare(b.name,'ko');
 }).slice(0,Math.max(0,Math.min(limit,12)));
}
export async function verifyStationDestinations({origin,stations,date,request,signal,limit=8}){
 const candidates=candidateStationsForVerification(origin,stations,limit);
 const confirmed=[],unknown=[];
 let checked=0,failed=0;
 const datePrefix=String(date).replaceAll('-','');
 // Limit provider pressure to two concurrent station pairs at a time.
 for(let i=0;i<candidates.length;i+=2){
  if(signal?.aborted)break;
  const batch=candidates.slice(i,i+2);
  const values=await Promise.all(batch.map(async station=>{
   try{
    const data=await request({from:origin.id,to:station.id,date,signal});
    if(data?.ok!==true||!Array.isArray(data.trains))throw Error('invalid provider response');
    const count=data.trains.filter(t=>/^\d{12,14}$/.test(String(t?.depTime))&&
      /^\d{12,14}$/.test(String(t?.arrTime))&&String(t.depTime).slice(0,8)===datePrefix).length;
    // A date-mismatched provider response must never be treated as confirmed absence.
    return {station,count,partial:!!data.partial||(data.trains.length>0&&count===0)};
   }catch{return {station,failed:true}}
  }));
  if(signal?.aborted)break;
  for(const item of values){
   checked++;
   if(item.failed){failed++;unknown.push(item.station);continue;}
   if(item.count)confirmed.push({station:item.station,count:item.count});
   else if(item.partial)unknown.push(item.station);
  }
 }
 return {confirmed,unknown,checked,candidates:candidates.length,failed,exhaustive:false,date};
}
