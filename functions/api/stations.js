import {callTago,cleanStation,DataError,json} from '../_lib/tago.js';
async function loadAllStations(env){const cities=await callTago(env,'GetCtyCodeList',{numOfRows:100});const codes=[...new Set(cities.items.map(x=>String(x.citycode||x.cityCode||'').trim()).filter(x=>/^\d{1,3}$/.test(x)))];if(!codes.length)throw new DataError('공식 데이터에서 도시코드를 가져오지 못했습니다.',502);
 const stations=[];let failures=0;
 // Four concurrent requests at most; public API quotas are intentionally protected.
 for(let i=0;i<codes.length;i+=4){const batch=await Promise.allSettled(codes.slice(i,i+4).map(cityCode=>callTago(env,'GetCtyAcctoTrainSttnList',{cityCode,numOfRows:250})));for(const result of batch){if(result.status==='fulfilled'){for(const st of result.value.items){const cleaned=cleanStation(st);if(cleaned.id&&cleaned.name)stations.push(cleaned)}}else failures++}}
 const unique=[...new Map(stations.map(s=>[s.id,s])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));if(!unique.length)throw new DataError('역 목록을 조회하지 못했습니다. API 권한과 응답을 확인해 주세요.',502);return {stations:unique,partial:failures>0}}
export async function onRequestGet({env,request}){try{
 const cacheKey=new Request(new URL('/api/stations',request.url).toString());const cache=typeof caches!=='undefined'?caches.default:null;if(cache){const hit=await cache.match(cacheKey);if(hit)return new Response(hit.body,hit)}
 const list=await loadAllStations(env);const response=json({ok:true,...list},200,{'Cache-Control':'public,max-age=3600,s-maxage=86400'});if(cache)await cache.put(cacheKey,response.clone());return response;
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'역 목록을 불러오지 못했습니다.'},error.status||502)}}