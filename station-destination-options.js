import {destinationCandidates} from './train-destinations.js';
import {searchStations} from './station-utils.js';
import {sameCorridorStations,suggestedRegisteredStations} from './station-matching.js';

// Editorial corridor data are only navigation hints. Never treat them as a timetable.
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
export const INITIAL_STATION_SUGGESTIONS=8;
export const STATION_SEARCH_SUGGESTIONS=10;
const POPULAR_NAMES=['서울','용산','청량리','광명','수원','천안아산','대전','오송','동대구','부산','익산','전주','광주송정','목포','강릉','춘천'];
const key=s=>String(s??'').normalize('NFC').replace(/\([^)]*\)/g,'').replace(/[\s·]/g,'').replace(/역$/u,'').toLowerCase();
export function stationGuideNearby(origin,official=[],limit=8){
 return sameCorridorStations(origin,official,limit);
}
export function stationGuideMode(origin,official=[]){
 const selection=suggestedRegisteredStations(origin,official,INITIAL_STATION_SUGGESTIONS);
 return selection.kind==='corridor'?'corridor':selection.kind==='region'?'region':'examples';
}
export function stationGuideOptions(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 if(String(query??'').trim())return stationGuideSearch(stations,origin?.id,query,STATION_SEARCH_SUGGESTIONS);
 const matched=suggestedRegisteredStations(origin,stations,INITIAL_STATION_SUGGESTIONS);
 if(matched.stations.length)return matched.stations;
 // If no corridor or region is known, show neutral examples, not alleged direct routes.
 const popular=POPULAR_NAMES.map(name=>stations.find(s=>key(s.name)===key(name))).filter(Boolean);
 const seen=new Set();
 return [...popular,...stations].filter(s=>{if(seen.has(s.id))return false;seen.add(s.id);return true;}).slice(0,INITIAL_STATION_SUGGESTIONS);
}
export function stationGuideOptionCount(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 return String(query??'').trim()?stationGuideSearch(stations,origin?.id,query,stations.length).length:stations.length;
}
