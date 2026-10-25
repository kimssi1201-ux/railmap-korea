import {RAIL_CORRIDORS} from './train-destinations.js?v=gwangju-destinations-v2';
import {normalizeName} from './station-utils.js';
import {RAIL_PROVINCES} from './station-regions.js';

// A TAGO station is an ID, NOT a route. This module never asserts direct service.
const key=normalizeName;
const validId=id=>/^[a-z0-9-]{4,30}$/i.test(String(id??''));
const validStation=s=>s&&validId(s.id)&&typeof s.name==='string'&&key(s.name);
const lines=RAIL_CORRIDORS.map(line=>line.map(key));
const lineNames=new Set(lines.flat());
const REGION_SET=new Set(RAIL_PROVINCES);
export function officialStationIndex(raw=[]){
 const ids=new Map(),names=new Map();
 let discarded=0,duplicateIds=0;
 for(const s of Array.isArray(raw)?raw:[]){
  if(!validStation(s)){discarded++;continue;}
  const id=String(s.id),candidate={...s,id,name:s.name.trim()};
  if(ids.has(id)){duplicateIds++;continue;}
  ids.set(id,candidate);
  const k=key(candidate.name),existing=names.get(k)||[];
  names.set(k,[...existing,candidate]);
 }
 return {stations:[...ids.values()],names,discarded,duplicateIds};
}
export function lookupRegisteredStation(raw,name){
 const matches=officialStationIndex(raw).names.get(key(name))||[];
 return {station:matches.length===1?matches[0]:null,ambiguous:matches.length>1,matches};
}
export function sameCorridorStations(origin,raw=[],limit=8){
 if(!validStation(origin)||!Array.isArray(raw))return [];
 const name=key(origin.name),index=officialStationIndex(raw);
 const best=new Map();
 for(const line of lines){
  const at=line.indexOf(name);if(at<0)continue;
  line.forEach((candidate,i)=>{
   const options=index.names.get(candidate)||[];
   // If names collide across official IDs, require explicit user selection.
   if(options.length!==1||options[0].id===origin.id)return;
   const st=options[0],distance=Math.abs(i-at);
   const prev=best.get(st.id);
   if(!prev||distance<prev.distance)best.set(st.id,{station:st,distance});
  });
 }
 return [...best.values()].sort((a,b)=>a.distance-b.distance||a.station.name.localeCompare(b.station.name,'ko'))
  .slice(0,Math.max(0,limit)).map(x=>x.station);
}
export function suggestedRegisteredStations(origin,raw=[],limit=8){
 const index=officialStationIndex(raw),stations=index.stations.filter(s=>s.id!==origin?.id);
 const corridor=sameCorridorStations(origin,stations,limit);
 if(corridor.length)return {kind:'corridor',stations:corridor,total:stations.length};
 const region=REGION_SET.has(origin?.region)?origin.region:null;
 if(region){
  const neighbors=stations.filter(s=>s.region===region).sort((a,b)=>a.name.localeCompare(b.name,'ko')).slice(0,limit);
  if(neighbors.length)return {kind:'region',stations:neighbors,total:stations.length};
 }
 // No guessed long-distance service for unmapped stations.
 return {kind:'unmapped',stations:[],total:stations.length};
}
export function stationMatchingAudit(raw=[]){
 const indexed=officialStationIndex(raw),stationList=indexed.stations;
 const ambiguity=[...indexed.names.entries()].filter(([,items])=>items.length>1).map(([name,items])=>({name,ids:items.map(s=>s.id)}));
 return {
  registered:stationList.length,
  corridorReferenced:stationList.filter(s=>lineNames.has(key(s.name))).length,
  noCorridorReference:stationList.filter(s=>!lineNames.has(key(s.name))).length,
  unclassifiedRegion:stationList.filter(s=>!REGION_SET.has(s.region)).length,
  ambiguousNames:ambiguity.length,duplicatesById:indexed.duplicateIds,discarded:indexed.discarded,
  // Only describes registration and manually curated corridor hints, NOT complete direct route coverage.
  scope:'registered-stations-not-verified-direct-routes'
 };
}
