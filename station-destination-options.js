import {destinationCandidates,RAIL_CORRIDORS} from './train-destinations.js';
import {searchStations} from './station-utils.js';

// Suggested corridors are only candidates; the dated timetable must confirm each link.
export function stationGuideCandidates(origin,editorial=[],official=[],limit=24){
 const seen=new Set();
 return [...(Array.isArray(editorial)?editorial:[]),...destinationCandidates(origin,official,limit)]
  .filter(station=>{
   if(!station?.id||!station?.name||station.id===origin?.id||seen.has(station.id))return false;
   seen.add(station.id);return true;
  });
}
export function stationGuideSearch(official,originId,query,limit=8){
 if(!String(query??'').trim())return [];
 return searchStations((Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==originId),query,limit);
}

const POPULAR_NAMES=['서울','용산','청량리','광명','수원','천안아산','대전','오송','동대구','부산','익산','전주','광주송정','목포','강릉','춘천'];
const normalizeStation=name=>String(name??'').normalize('NFC').replace(/[\s·]/g,'').replace(/역$/u,'').toLowerCase();

// A line is only a station-candidate source; it never establishes a direct train.
export function stationGuideNearby(origin,official=[],limit=8){
 const name=normalizeStation(origin?.name);
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 if(!name)return [];
 const byName=new Map(stations.map(s=>[normalizeStation(s.name),s]));
 const ranked=new Map();
 for(const corridor of RAIL_CORRIDORS){
  const at=corridor.findIndex(n=>normalizeStation(n)===name);
  if(at<0)continue;
  corridor.forEach((n,i)=>{
   const k=normalizeStation(n),st=byName.get(k),distance=Math.abs(i-at);
   if(!st||k===name)return;
   if(!ranked.has(k)||ranked.get(k).distance>distance)ranked.set(k,{station:st,distance});
  });
 }
 return [...ranked.values()].sort((a,b)=>a.distance-b.distance||a.station.name.localeCompare(b.station.name,'ko'))
  .slice(0,Math.max(0,limit)).map(x=>x.station);
}
export const INITIAL_STATION_SUGGESTIONS=8;
export const STATION_SEARCH_SUGGESTIONS=10;
export function stationGuideOptions(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 if(String(query??'').trim())return stationGuideSearch(stations,origin?.id,query,STATION_SEARCH_SUGGESTIONS);
 const nearby=stationGuideNearby(origin,stations,INITIAL_STATION_SUGGESTIONS);
 if(nearby.length)return nearby;
 const popular=POPULAR_NAMES.map(name=>stations.find(s=>normalizeStation(s.name)===normalizeStation(name))).filter(Boolean);
 const seen=new Set();
 return [...popular,...stations].filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true;})
  .slice(0,INITIAL_STATION_SUGGESTIONS);
}
export function stationGuideOptionCount(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 return String(query??'').trim()
  ?stationGuideSearch(stations,origin?.id,query,stations.length).length
  :stations.length;
}
