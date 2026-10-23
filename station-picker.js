import {normalizeName} from './station-utils.js';
import {RAIL_PROVINCES} from './station-regions.js';
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
export function stationPickerMatches(stations,query='',region=''){
 const q=normalizeName(query);
 return (Array.isArray(stations)?stations:[]).filter(s=>s?.id&&s.name&&(!region||stationPickerRegion(s)===region)&&(!q||normalizeName(s.name).includes(q)))
 .sort((a,b)=>{
  const exactA=normalizeName(a.name)===q?0:1,exactB=normalizeName(b.name)===q?0:1;
  return exactA-exactB||a.name.length-b.name.length||a.name.localeCompare(b.name,'ko');
 });
}
