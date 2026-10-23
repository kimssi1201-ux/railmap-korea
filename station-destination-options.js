import {destinationCandidates} from './train-destinations.js';
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

// Render only a short set of suggestions. All TAGO-registered stations remain searchable.
export const INITIAL_STATION_SUGGESTIONS=8;
export const STATION_SEARCH_SUGGESTIONS=10;
export function stationGuideOptions(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 const q=String(query??'').trim();
 if(q)return stationGuideSearch(stations,origin?.id,q,STATION_SEARCH_SUGGESTIONS);
 const popular=POPULAR_NAMES.map(name=>stations.find(s=>normalizeStation(s.name)===normalizeStation(name))).filter(Boolean);
 const known=stationGuideCandidates(origin,[],stations,24);
 const ordered=[...popular,...known,...stations];
 const ids=new Set();
 return ordered.filter(s=>{if(ids.has(s.id))return false;ids.add(s.id);return true;}).slice(0,INITIAL_STATION_SUGGESTIONS);
}
// Used only for a truthful search-result count, never as the displayed suggestion list.
export function stationGuideOptionCount(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 return String(query??'').trim()
  ?stationGuideSearch(stations,origin?.id,query,stations.length).length
  :stations.length;
}
