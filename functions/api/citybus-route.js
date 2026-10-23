import {callCitybus,cleanRouteStop,assertCityCode,assertRouteId,send,cachedPublic} from '../_lib/citybus.js';
import {DataError} from '../_lib/tago.js';
export async function onRequestGet({env,request}){try{
 const u=new URL(request.url),city=assertCityCode(u.searchParams.get('city')),id=assertRouteId(u.searchParams.get('id'));
 return await cachedPublic(request,`/api/citybus-route?city=${city}&id=${encodeURIComponent(id)}&v=1`,3600,async()=>{
  const result=await callCitybus(env,'routeStops',{cityCode:city,routeId:id,numOfRows:300,pageNo:1});
  const stops=result.items.map(cleanRouteStop).filter(x=>x.id&&x.name).sort((a,b)=>(a.order??Infinity)-(b.order??Infinity));
  return send({ok:true,city,id,stops,partial:result.totalCount>result.items.length,source:'국토교통부 TAGO'},200,3600);
 });
}catch(e){return send({ok:false,error:e instanceof DataError?e.message:'노선 경유 정류장 조회에 실패했습니다.'},e.status||502)}}