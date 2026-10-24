import {callTago,cleanStation,DataError,json} from '../_lib/tago.js';
import {provinceFromTagoCity} from '../../station-regions.js';
import {stationMatchingAudit} from '../../station-matching.js';

// The fallback ids are reserved for stable well-known stations, not fabricated departures.
export const POPULAR_STATIONS = Object.freeze([
  {name:'서울',id:'NAT010000',region:'서울'},
  {name:'부산',id:'NAT014445',region:'부산'},
  {name:'용산',id:'NAT010032',region:'서울'}
]);
const normalize=name=>String(name??'').normalize('NFC').replace(/\([^)]*\)/g,'').replace(/[\s·]/g,'').replace(/역$/,'').toLowerCase();
export function ensurePopularStations(stations){
 const importantNames=new Set(POPULAR_STATIONS.map(s=>normalize(s.name)));
 const importantIds=new Set(POPULAR_STATIONS.map(s=>s.id));
 const final=stations.filter(s=>!importantNames.has(normalize(s.name))&&!importantIds.has(s.id));
 for(const s of POPULAR_STATIONS){
  const official=stations.find(item=>item.id===s.id);
  final.push(official?{...official,name:s.name,region:official.region||s.region}:{...s,source:'verified-station-code'});
 }
 return final.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
export async function loadAllStations(env){
 const cities=await callTago(env,'GetCtyCodeList',{numOfRows:100});
 const codeNames=new Map();
 for(const city of cities.items){
  const id=String(city.citycode??city.cityCode??'').trim();
  if(/^\d{1,3}$/.test(id))codeNames.set(id,provinceFromTagoCity(city.cityname??city.cityName,id));
 }
 if(!codeNames.size)throw new DataError('공식 데이터에서 도시코드를 가져오지 못했습니다.',502);
 const stations=[];const failedCodes=[];let missingPages=false;
 const codes=[...codeNames.keys()];
 // Bounded batches. Preserve any station lists already returned by the provider.
 for(let i=0;i<codes.length;i+=4){
  const batch=await Promise.allSettled(codes.slice(i,i+4).map(async cityCode=>{
   const records=[];let truncated=false;
   for(let pageNo=1;pageNo<=3;pageNo++){
    const response=await callTago(env,'GetCtyAcctoTrainSttnList',{cityCode,numOfRows:250,pageNo});
    for(const item of response.items){const st=cleanStation(item);if(st.id&&st.name)records.push({...st,name:st.name.replace(/역$/u,''),region:codeNames.get(cityCode)||null,cityCode})}
    if(!response.items.length||response.totalCount<=pageNo*250)break;
    if(pageNo===3)truncated=true;
   }
   return {records,truncated};
  }));
  batch.forEach((result,j)=>{
   if(result.status==='fulfilled'){stations.push(...result.value.records);missingPages ||= result.value.truncated}
   else failedCodes.push(codes[i+j]);
  });
 }
 const unique=[...new Map(stations.map(s=>[s.id,s])).values()];
 if(!unique.length)throw new DataError('공식 역 목록을 조회하지 못했습니다. API 권한과 응답을 확인해 주세요.',502);
 const final=ensurePopularStations(unique);
 const supplemented=final.filter(s=>s.source==='verified-station-code').map(s=>s.name);
 return {stations:final,matching:stationMatchingAudit(final),partial:failedCodes.length>0||missingPages||supplemented.length>0,failedRegions:failedCodes.length,supplemented,source:'국토교통부 TAGO'};
}
export async function getCachedStationList(env,request){
 const key=new Request(new URL('/api/stations?v=nationwide-regions-v1',request.url).toString());
 const cache=typeof caches==='undefined'?null:caches.default;
 if(cache){const hit=await cache.match(key);if(hit){try{const value=await hit.json();if(value?.ok&&Array.isArray(value.stations))return value}catch{}}}
 const data={ok:true,...await loadAllStations(env)};
 if(cache){try{const res=json(data,200,{'Cache-Control':'public,max-age=600,s-maxage=21600'});await cache.put(key,res)}catch{}}
 return data;
}
export async function onRequestGet({env,request}){
 try{const data=await getCachedStationList(env,request);return json(data,200,{'Cache-Control':'public,max-age=600,s-maxage=21600'})}
 catch(e){return json({ok:false,error:e instanceof DataError?e.message:'역 목록을 불러오지 못했습니다.'},e.status||502)}
}