import {callCitybus,cleanRoute,cleanStop,assertCityCode,assertTerm,assertPage,send,cachedPublic} from '../_lib/citybus.js';
import {DataError} from '../_lib/tago.js';
export async function onRequestGet({env,request}){try{
 const u=new URL(request.url),kind=u.searchParams.get('kind'),city=assertCityCode(u.searchParams.get('city')),q=assertTerm(u.searchParams.get('q')),page=assertPage(u.searchParams.get('page'));
 if(!['stops','routes'].includes(kind))throw new DataError('정류장 또는 노선 검색을 선택해 주세요.',400);
 const operation=kind==='stops'?'stops':'routes',field=kind==='stops'&&/^\d{2,}$/.test(q)?'nodeNo':kind==='stops'?'nodeNm':'routeNo';
 const cachePath=`/api/citybus-search?kind=${kind}&city=${city}&q=${encodeURIComponent(q)}&page=${page}&v=1`;
 return await cachedPublic(request,cachePath,900,async()=>{
  const result=await callCitybus(env,operation,{cityCode:city,[field]:q,numOfRows:100,pageNo:page});
  const clean=kind==='stops'?cleanStop:cleanRoute;
  const all=result.items.map(clean).filter(x=>x.id&&(kind==='stops'?x.name:x.number));
  // Some municipal adapters ignore q. Never display unrelated rows as a match.
  const needle=q.toLocaleLowerCase('ko');
  const items=all.filter(x=>(kind==='stops'?x.name+' '+x.number:x.number).toLocaleLowerCase('ko').includes(needle));
  return send({ok:true,kind,city,q,page,items,totalCount:result.totalCount,partial:result.totalCount>page*100,source:'국토교통부 TAGO'},200,900);
 });
}catch(e){return send({ok:false,error:e instanceof DataError?e.message:'시내버스 검색에 실패했습니다.'},e.status||502)}}