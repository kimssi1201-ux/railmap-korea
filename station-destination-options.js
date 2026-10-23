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
