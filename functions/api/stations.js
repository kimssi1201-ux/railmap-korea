import {callTago,cleanStation,DataError,json} from '../_lib/tago.js';

// TAGO station IDs documented in legacy public TAGO integration examples.
// Used only when the regional station list omits these major stations.
// Every train time remains sourced from the live TAGO timetable endpoint.
export const POPULAR_STATIONS = Object.freeze([
  {name:'서울',id:'NAT010000'},
  {name:'부산',id:'NAT014445'},
  {name:'용산',id:'NAT010032'}
]);
const normalize = name => String(name ?? '').normalize('NFC').replace(/\([^)]*\)/g,'').replace(/[\s·]/g,'').replace(/역$/,'').toLowerCase();

export function ensurePopularStations(stations){
 const final=[...stations],names=new Set(final.map(s=>normalize(s.name)));
 for(const s of POPULAR_STATIONS){if(!names.has(normalize(s.name))){final.push({...s,source:'station-id-fallback'});names.add(normalize(s.name))}}
 return final.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}

async function loadAllStations(env){
 const cities=await callTago(env,'GetCtyCodeList',{numOfRows:100});
 const codes=[...new Set(cities.items.map(x=>String(x.citycode||x.cityCode||'').trim()).filter(x=>/^\d{1,3}$/.test(x)))];
 if(!codes.length)throw new DataError('공식 데이터에서 도시코드를 가져오지 못했습니다.',502);
 const stations=[];const failedCodes=[];
 // Maximum 4 parallel requests. Partial city errors should not erase other stations.
 for(let i=0;i<codes.length;i+=4){
  const batch=await Promise.allSettled(codes.slice(i,i+4).map(cityCode=>callTago(env,'GetCtyAcctoTrainSttnList',{cityCode,numOfRows:250})));
  batch.forEach((result,j)=>{
   if(result.status==='fulfilled'){
    for(const st of result.value.items){const cleaned=cleanStation(st);if(cleaned.id&&cleaned.name)stations.push(cleaned)}
   }else failedCodes.push(codes[i+j]);
  });
 }
 const unique=[...new Map(stations.map(s=>[s.id,s])).values()];
 if(!unique.length)throw new DataError('공식 역 목록을 조회하지 못했습니다. API 권한과 응답을 확인해 주세요.',502);
 const final=ensurePopularStations(unique);
 const supplemented=final.filter(s=>s.source==='station-id-fallback').map(s=>s.name);
 return {stations:final,partial:failedCodes.length>0||supplemented.length>0,supplemented};
}
export async function onRequestGet({env,request}){
 try{
  // New cache key prevents pre-fix (incomplete) lists from persisting for 24h.
  const cacheKey=new Request(new URL('/api/stations?v=popular-v2',request.url).toString());
  const cache=typeof caches!=='undefined'?caches.default:null;
  if(cache){const hit=await cache.match(cacheKey);if(hit)return new Response(hit.body,hit)}
  const list=await loadAllStations(env);
  const response=json({ok:true,...list},200,{'Cache-Control':'public,max-age=600,s-maxage=3600'});
  if(cache)await cache.put(cacheKey,response.clone());
  return response;
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'역 목록을 불러오지 못했습니다.'},error.status||502)}
}