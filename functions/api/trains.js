import {collectTrainPages} from '../_lib/train-pagination.js';
import {callTago,cleanTrain,DataError,json,validDate,withinWindow} from '../_lib/tago.js';
export async function onRequestGet({env,request}){try{const u=new URL(request.url);const from=u.searchParams.get('from')||'';const to=u.searchParams.get('to')||'';const date=u.searchParams.get('date')||'';if(!/^[a-z0-9-]{4,30}$/i.test(from)||!/^[a-z0-9-]{4,30}$/i.test(to)||from===to||!validDate(date)||!withinWindow(date))throw new DataError('출발역, 도착역 또는 날짜가 올바르지 않습니다. 오늘부터 31일 이내 날짜를 선택해 주세요.',400);
 const cache=typeof caches==='undefined'?null:caches.default;
 const cacheUrl=new URL('/api/trains',u.origin);
 for(const [k,v] of Object.entries({from,to,date,v:'reliable-v1'}))cacheUrl.searchParams.set(k,v);
 const cacheKey=new Request(cacheUrl.toString());
 if(cache){try{const hit=await cache.match(cacheKey);if(hit)return hit}catch{}}
 const params={depPlaceId:from,arrPlaceId:to,depPlandTime:date.replaceAll('-','')};const result=await collectTrainPages(page=>callTago(env,'GetStrtpntAlocFndTrainInfo',{...params,...page}),{pageSize:300,maxPages:5});const trains=result.items.map(cleanTrain).filter(r=>/^\d{12,14}$/.test(r.depTime)&&/^\d{12,14}$/.test(r.arrTime));trains.sort((a,b)=>a.depTime.localeCompare(b.depTime));const response=json({ok:true,trains,partial:result.partial,source:'국토교통부 TAGO'},200,{'Cache-Control':'public,max-age=60,s-maxage=90'});
 if(cache){try{await cache.put(cacheKey,response.clone())}catch{}}
 return response;
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'열차정보 조회 중 문제가 발생했습니다.'},error.status||502)}}