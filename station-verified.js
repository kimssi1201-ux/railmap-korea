import {destinationCandidates} from './train-destinations.js?v=sintanjin-mobile-picks-v1';
import {sameCorridorStations} from './station-matching.js?v=sintanjin-mobile-picks-v1';

// A shortlist is not the full rail network. Only official dated API rows can confirm a route.
export function candidateStationsForVerification(origin,stations=[],limit=8){
 const available=(Array.isArray(stations)?stations:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 const byId=new Set(available.map(s=>s.id));
 const near=sameCorridorStations(origin,available,24);
 const network=destinationCandidates(origin,available,24);
 // Check nearby station pairs first, then larger corridor hubs. Neither is a proven direct route.
 const hubs=['광주송정','광주','순천','목포','익산','용산','서울','부전','청량리','동대구','태화강','포항','동해','경주','진주','마산','대전','부산'];
 const priority=hubs.map(name=>network.find(s=>String(s.name).replace(/역$/u,'')===name)).filter(Boolean);
 const ordered=[...near.slice(0,3),...priority,...near,...network],seen=new Set();
 return ordered.filter(s=>byId.has(s.id)&&!seen.has(s.id)&&(seen.add(s.id),true))
  .slice(0,Math.max(0,Math.min(limit,12)));
}
// All *registered* stations referenced by the same curated corridor, without a UI cap.
// Same corridor never proves that a particular date has a direct train.
export function allCorridorDestinations(origin,stations=[]){
 return sameCorridorStations(origin,stations,1000);
}
export function visibleCorridorDestinations(origin,stations=[],confirmed=[],expanded=false,initialCount=12){
 const corridor=allCorridorDestinations(origin,stations);
 const ids=new Set(),combined=[];
 for(const item of [...confirmed.map(x=>x?.station).filter(Boolean),...corridor]){
  if(!item?.id||item.id===origin?.id||ids.has(item.id))continue;
  ids.add(item.id);combined.push(item);
 }
 return {stations:expanded?combined:combined.slice(0,Math.max(1,initialCount)),
  total:combined.length,hasMore:!expanded&&combined.length>initialCount,
  // Even when the reference list is fully expanded, true direct-service coverage is NOT exhaustive.
  completeDirectRoutes:false};
}
// Unlike region browsing, destination recommendations must have a corridor hint
// or an actual verified train. Province membership alone is not a railway link.
export function stationCorridorReferences(origin,stations=[],limit=8){
 const candidates=candidateStationsForVerification(origin,stations,limit);
 return {kind:candidates.length?'corridor':'none',stations:candidates};
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
