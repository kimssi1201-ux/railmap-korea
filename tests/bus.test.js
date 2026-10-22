import test from 'node:test';
import assert from 'node:assert/strict';
import {busConfig,checkBusDate,cleanTerminal,cleanBus,resolveBusKey,callBus} from '../functions/_lib/bus.js';
import {onRequestGet as terminals} from '../functions/api/bus-terminals.js';
import {onRequestGet as schedules} from '../functions/api/bus-timetables.js';

const now=new Date('2026-10-22T15:05:00Z');
test('고속·시외 API 엔드포인트와 키 분리',()=>{
 assert.equal(busConfig('express').scheduleOp,'GetStrtpntAlocFndExpbusInfo');
 assert.equal(busConfig('intercity').terminalOp,'GetSuberbsBusTrminlList');
 assert.throws(()=>busConfig('invalid'));
 assert.equal(resolveBusKey({TAGO_API_KEY:'shared'},'express'),'shared');
 assert.equal(resolveBusKey({TAGO_API_KEY:'shared',EXPBUS_API_KEY:'special'},'express'),'special');
 assert.throws(()=>resolveBusKey({},'intercity'));
});
test('시외버스는 당일만, 고속버스는 31일 범위',()=>{
 assert.doesNotThrow(()=>checkBusDate('intercity','2026-10-23',now));
 assert.throws(()=>checkBusDate('intercity','2026-10-24',now),/당일/);
 assert.doesNotThrow(()=>checkBusDate('express','2026-10-24',now));
 assert.throws(()=>checkBusDate('express','2026-11-30',now),/31일/);
});
test('버스터미널과 배차를 안전하게 정리하고 미제공 요금은 숨긴다',()=>{
 assert.deepEqual(cleanTerminal({terminalid:'NAEK010',terminalnm:'서울경부'}),{id:'NAEK010',name:'서울경부'});
 const bus=cleanBus({depplandtime:'20261023130000',arrplandtime:'20261023160000',gradename:'우등',adultcharge:'32000'});
 assert.equal(bus.grade,'우등'); assert.equal(bus.adultFare,32000);
 assert.equal(cleanBus({adultcharge:null}).adultFare,null);
 assert.equal(cleanBus({adultcharge:''}).adultFare,null);
});
test('공공 API 키는 클라이언트 응답에 노출하지 않고 URL 인자만 서버에서 사용',async()=>{
 let requested='';
 const stub=async url=>{requested=url;return Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:{terminalid:'NAEK010',terminalnm:'서울경부'}}}}})};
 const response=await callBus({TAGO_API_KEY:'test-secret'},'express','GetExpBusTrminlList',{},stub);
 assert.equal(response.items.length,1);assert.equal(new URL(requested).searchParams.get('serviceKey'),'test-secret');
 assert.equal(new URL(requested).pathname,'/1613000/ExpBusInfo/GetExpBusTrminlList');
});
test('시외버스 내일 조회는 API 호출 전에 거절',async()=>{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const p=Object.fromEntries(today.map(x=>[x.type,x.value]));const tomorrow=new Date(Date.UTC(+p.year,+p.month-1,+p.day+1)).toISOString().slice(0,10);
 const r=await schedules({env:{TAGO_API_KEY:'not-used'},request:new Request(`https://a.test/api/bus-timetables?type=intercity&from=NAEK010&to=NAEK020&date=${tomorrow}`)});
 assert.equal(r.status,400);assert.match((await r.json()).error,/당일/);
});
test('터미널 목록 성공과 잘못된 파라미터 방어',async()=>{
 const fail=await terminals({env:{},request:new Request('https://a.test/api/bus-terminals?type=bad')});
 assert.equal(fail.status,400);
 const wrong=await schedules({env:{},request:new Request('https://a.test/api/bus-timetables?type=express&from=wrong!!!&to=NAEK020&date=2026-10-23')});
 assert.equal(wrong.status,400);
});
test('고속버스 배차 목록 API 응답 변환',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:{gradename:'우등',depplandtime:'20261023130000',arrplandtime:'20261023163500',adultcharge:32000}}}}});
 try{
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  const today=`${p.year}-${p.month}-${p.day}`;
  const r=await schedules({env:{TAGO_API_KEY:'mock'},request:new Request(`https://a.test/api/bus-timetables?type=express&from=NAEK010&to=NAEK020&date=${today}`)});
  assert.equal(r.status,200);
  const json=await r.json();assert.equal(json.buses[0].grade,'우등');assert.equal(json.buses[0].adultFare,32000);assert.equal(json.liveSeats,false);
 }finally{globalThis.fetch=original}
});