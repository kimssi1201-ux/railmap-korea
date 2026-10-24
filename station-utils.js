// Stable station names for user-facing search. IDs are the TAGO rail station IDs,
// not metro station IDs. Train schedules are always fetched from the official API.
export const MAJOR_STATIONS = Object.freeze([
  Object.freeze({name:'서울',id:'NAT010000'}),
  Object.freeze({name:'부산',id:'NAT014445'}),
  Object.freeze({name:'용산',id:'NAT010032'})
]);
export function normalizeName(value){
  return String(value??'').normalize('NFC').replace(/\([^)]*\)/g,'').replace(/[\s·]/g,'').replace(/역$/,'').toLowerCase();
}
export function ensureMajorStations(items=[]){
  const majorNames=new Set(MAJOR_STATIONS.map(s=>normalizeName(s.name)));
  const majorIds=new Set(MAJOR_STATIONS.map(s=>s.id));
  const merged=items.filter(s=>s&&s.id&&s.name&&!majorNames.has(normalizeName(s.name))&&!majorIds.has(s.id));
  for(const major of MAJOR_STATIONS){
    const verified=items.find(s=>s.id===major.id);
    merged.push({...verified,...major});
  }
  return merged;
}
export function getStation(items,query){
  const normalized=normalizeName(query);
  if(!normalized)return null;
  const matches=(Array.isArray(items)?items:[]).filter(s=>s?.id&&normalizeName(s.name)===normalized);
  // Exact name matches from multiple official IDs require explicit selection.
  return new Set(matches.map(s=>s.id)).size===1?matches[0]:null;
}
export function searchStations(items,query,limit=12){
  const q=normalizeName(query);
  return items.filter(s=>!q||normalizeName(s.name).includes(q))
    .sort((a,b)=>{
      const aExact=normalizeName(a.name)===q?0:1;
      const bExact=normalizeName(b.name)===q?0:1;
      return aExact-bExact||a.name.length-b.name.length||a.name.localeCompare(b.name,'ko');
    }).slice(0,limit);
}