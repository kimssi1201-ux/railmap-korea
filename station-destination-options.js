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

// Always provide the whole official list. Missing corridor hints must not empty the selector.
export function stationGuideOptions(origin,official=[],query=''){
 const stations=(Array.isArray(official)?official:[]).filter(s=>s?.id&&s?.name&&s.id!==origin?.id);
 if(String(query??'').trim())return stationGuideSearch(stations,origin?.id,query,stations.length);
 const known=stationGuideCandidates(origin,[],stations,24);
 const popular=POPULAR_NAMES.map(name=>stations.find(s=>normalizeStation(s.name)===normalizeStation(name))).filter(Boolean);
 const ordered=[...known,...popular,...stations];
 const ids=new Set();
 return ordered.filter(s=>{if(ids.has(s.id))return false;ids.add(s.id);return true;});
}
