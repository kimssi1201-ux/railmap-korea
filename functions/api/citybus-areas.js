import {callCitybus,cleanCity,send,cachedPublic} from '../_lib/citybus.js';
import {DataError} from '../_lib/tago.js';
export async function onRequestGet({env,request}){try{return await cachedPublic(request,'/api/citybus-areas?v=1',21600,async()=>{
 const result=await callCitybus(env,'areas',{numOfRows:200});
 const areas=[...new Map(result.items.map(cleanCity).filter(x=>/^\d{1,7}$/.test(x.id)&&x.name).map(x=>[x.id,x])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 if(!areas.length)throw new DataError('TAGO에서 제공 지역 목록을 받지 못했습니다.',502);
 return send({ok:true,areas,source:'국토교통부 TAGO',notice:'지역별 실시간 도착정보 제공 여부는 다를 수 있습니다.'},200,21600);
})}catch(e){return send({ok:false,error:e instanceof DataError?e.message:'제공 지역 조회에 실패했습니다.'},e.status||502)}}