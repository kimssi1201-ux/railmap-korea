import {normalizeName} from './station-utils.js';
import {RAIL_PROVINCES} from './station-regions.js';
import {suggestedRegisteredStations} from './station-matching.js';
// Show every station returned by TAGO; there is no arbitrary twelve-item cap.
export function stationPickerRegion(station){
 return RAIL_PROVINCES.includes(station?.region)?station.region:'지역 확인 필요';
}
export function stationPickerRegions(stations){
 const counts=new Map();
 for(const s of Array.isArray(stations)?stations:[]){
  if(!s?.id||!s.name)continue;
  const province=stationPickerRegion(s);
  counts.set(province,(counts.get(province)||0)+1);
 }
 return [...RAIL_PROVINCES,'지역 확인 필요'].filter(r=>counts.has(r)).map(region=>({region,count:counts.get(region)}));
}
// Only officially returned stations are selectable. Corridor candidates are merely sorted first.
export function destinationPickerMatches(stations,query='',region='',departure=null,candidates=[]){
 const matches=stationPickerMatches(stations,query,region).filter(s=>s.id!==departure?.id);
 if(normalizeName(query)||region)return matches.slice(0,20);
 const preferred=departure?suggestedRegisteredStations(departure,matches,12).stations:[];
 const order=new Map();
 [...candidates,...preferred].forEach((s,i)=>{if(s?.id&&!order.has(s.id))order.set(s.id,i)});
 return matches.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity)).slice(0,12);
}
export function stationPickerMatches(stations,query='',region=''){
 const q=normalizeName(query);
 return (Array.isArray(stations)?stations:[]).filter(s=>s?.id&&s.name&&(!region||stationPickerRegion(s)===region)&&(!q||normalizeName(s.name).includes(q)))
 .sort((a,b)=>{
  const exactA=normalizeName(a.name)===q?0:1,exactB=normalizeName(b.name)===q?0:1;
  return exactA-exactB||a.name.length-b.name.length||a.name.localeCompare(b.name,'ko');
 });
}
