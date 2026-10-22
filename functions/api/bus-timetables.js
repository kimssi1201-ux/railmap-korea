import {DataError,json} from '../_lib/tago.js';
import {busConfig,checkBusDate,callBus,cleanBus,validTerminalId} from '../_lib/bus.js';

// One station-name choice may map to several official TAGO terminal IDs.
// Avoid forcing users to choose opaque code identifiers; guard quota use.
export function parseTerminalIds(value){
 const raw=String(value||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!raw.length||raw.length>8||raw.some(x=>!validTerminalId(x)))throw new DataError('터미널 정보가 올바르지 않습니다.',400);
 return [...new Set(raw)];
}
export function busPairs(fromIds,toIds){
 const pairs=[];
 for(const from of fromIds)for(const to of toIds)if(from!==to)pairs.push([from,to]);
 if(!pairs.length)throw new DataError('출발·도착 터미널을 다르게 선택해 주세요.',400);
 if(pairs.length>36)throw new DataError('같은 이름에 연결된 터미널 코드가 너무 많습니다. 더 구체적인 터미널명을 선택해 주세요.',400);
 return pairs;
}
function uniqueBusKey(bus){
 // Identical provider entries can appear via multiple IDs for one public terminal.
 return [bus.departure,bus.arrival,bus.departureName,bus.arrivalName,bus.grade,bus.adultFare,bus.routeId].join('\u001f');
}
export async function onRequestGet({env,request}){
 try{
  const u=new URL(request.url);
  const type=u.searchParams.get('type')||'';
  const conf=busConfig(type);
  const fromIds=parseTerminalIds(u.searchParams.get('from'));
  const toIds=parseTerminalIds(u.searchParams.get('to'));
  const date=u.searchParams.get('date')||'';
  checkBusDate(type,date);
  const pairs=busPairs(fromIds,toIds);
  const cache=typeof caches==='undefined'?null:caches.default;
  // Cache only this service response, never API keys; 2 minutes to limit calls.
  const cacheUrl=new URL('/api/bus-timetables',u.origin);
  for(const [k,v] of Object.entries({type,from:fromIds.join(','),to:toIds.join(','),date}))cacheUrl.searchParams.set(k,v);
  const cacheKey=new Request(cacheUrl.toString());
  if(cache){const hit=await cache.match(cacheKey);if(hit)return hit}
  const found=new Map();let partial=false,successes=0,failures=0,lastError=null;
  for(let i=0;i<pairs.length;i+=3){
   // Cap concurrent TAGO requests to protect the public API rate limit.
   const batch=await Promise.allSettled(pairs.slice(i,i+3).map(([from,to])=>
     callBus(env,type,conf.scheduleOp,{depTerminalId:from,arrTerminalId:to,depPlandTime:date.replaceAll('-',''),numOfRows:300,pageNo:1})
   ));
   for(const item of batch){
    if(item.status==='rejected'){failures++;lastError=item.reason;partial=true;continue}
    successes++;
    const result=item.value;
    partial ||= result.totalCount>result.items.length;
    for(const row of result.items.map(cleanBus))if(/^\d{12,14}$/.test(row.departure))found.set(uniqueBusKey(row),row);
   }
  }
  if(!successes)throw lastError instanceof DataError?lastError:new DataError('버스 시간표 서버 연결에 실패했습니다.',502);
  const buses=[...found.values()].sort((a,b)=>a.departure.localeCompare(b.departure));
  const response=json({ok:true,type,date,buses,partial,source:'국토교통부 TAGO',liveSeats:false},200,{'Cache-Control':'public,max-age=120,s-maxage=120'});
  if(cache)await cache.put(cacheKey,response.clone());
  return response;
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'버스 시간표 조회에 실패했습니다.'},error.status||502)}
}