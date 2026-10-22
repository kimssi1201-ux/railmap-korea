import {DataError,json} from '../_lib/tago.js';
import {busConfig,callBus,cleanTerminal} from '../_lib/bus.js';

export async function onRequestGet({env,request}){
 try{
  const type=new URL(request.url).searchParams.get('type')||'';
  const conf=busConfig(type);
  const cache=typeof caches==='undefined'?null:caches.default;
  const key=new Request(new URL(`/api/bus-terminals?type=${type}&v=1`,request.url));
  if(cache){const hit=await cache.match(key);if(hit)return hit}
  const seen=new Map();let partial=false;
  for(let pageNo=1;pageNo<=10;pageNo++){
   const response=await callBus(env,type,conf.terminalOp,{numOfRows:200,pageNo});
   const page=response.items.map(cleanTerminal).filter(x=>x.id&&x.name);
   for(const t of page)seen.set(t.id,t);
   if(response.totalCount<=pageNo*200||response.items.length===0)break;
   if(pageNo===10)partial=true;
  }
  if(!seen.size)throw new DataError('공식 버스터미널 목록이 비어 있습니다. API 승인 상태를 확인해 주세요.',502);
  const terminals=[...seen.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const result=json({ok:true,type,terminals,partial,source:'국토교통부 TAGO'},200,{'Cache-Control':'public,max-age=600,s-maxage=21600'});
  if(cache)await cache.put(key,result.clone());
  return result;
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'터미널 조회 중 오류가 발생했습니다.'},error.status||502)}
}