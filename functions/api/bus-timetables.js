import {DataError,json} from '../_lib/tago.js';
import {busConfig,checkBusDate,callBus,cleanBus,validTerminalId} from '../_lib/bus.js';

export async function onRequestGet({env,request}){
 try{
  const u=new URL(request.url);
  const type=u.searchParams.get('type')||'';
  const conf=busConfig(type);
  const from=u.searchParams.get('from')||'';
  const to=u.searchParams.get('to')||'';
  const date=u.searchParams.get('date')||'';
  if(!validTerminalId(from)||!validTerminalId(to)||from===to)throw new DataError('출발·도착 터미널을 정확히 선택해 주세요.',400);
  checkBusDate(type,date);
  const result=await callBus(env,type,conf.scheduleOp,{depTerminalId:from,arrTerminalId:to,depPlandTime:date.replaceAll('-',''),numOfRows:300,pageNo:1});
  const buses=result.items.map(cleanBus).filter(x=>/^\d{12,14}$/.test(x.departure));
  buses.sort((a,b)=>a.departure.localeCompare(b.departure));
  return json({ok:true,type,date,buses,partial:result.totalCount>result.items.length,source:'국토교통부 TAGO',liveSeats:false});
 }catch(error){return json({ok:false,error:error instanceof DataError?error.message:'버스 시간표 조회에 실패했습니다.'},error.status||502)}
}