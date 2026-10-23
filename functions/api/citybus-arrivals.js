import {callCitybus,cleanArrival,assertCityCode,assertNodeId,send,cachedPublic} from '../_lib/citybus.js';
import {DataError} from '../_lib/tago.js';
export async function onRequestGet({env,request}){try{
 const u=new URL(request.url),city=assertCityCode(u.searchParams.get('city')),id=assertNodeId(u.searchParams.get('id'));
 return await cachedPublic(request,`/api/citybus-arrivals?city=${city}&id=${encodeURIComponent(id)}&v=1`,25,async()=>{
  const result=await callCitybus(env,'arrivals',{cityCode:city,nodeId:id,numOfRows:100});
  const arrivals=result.items.map(cleanArrival).filter(x=>x.number).sort((a,b)=>(a.etaSeconds??Infinity)-(b.etaSeconds??Infinity));
  return send({ok:true,city,id,arrivals,partial:result.totalCount>result.items.length,updatedAt:new Date().toISOString(),source:'국토교통부 TAGO',realtime:true},200,25);
 });
}catch(e){return send({ok:false,error:e instanceof DataError?e.message:'실시간 도착정보 조회에 실패했습니다.'},e.status||502)}}