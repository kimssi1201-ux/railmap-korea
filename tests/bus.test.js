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


test('터미널 ID 조합은 중복을 제거하고 한 번에 36쌍까지만 검색',async()=>{
 const {parseTerminalIds,busPairs}=await import('../functions/api/bus-timetables.js');
 assert.deepEqual(parseTerminalIds('NAEK600,NAEK601,NAEK600'),['NAEK600','NAEK601']);
 assert.deepEqual(busPairs(['NAEK600','NAEK601'],['NAEK602']).map(x=>x.join('/')),['NAEK600/NAEK602','NAEK601/NAEK602']);
 assert.throws(()=>parseTerminalIds('NAEK010,invalid space'),/터미널 정보/);
 assert.throws(()=>busPairs(Array.from({length:7},(_,i)=>'N'+i),Array.from({length:7},(_,i)=>'T'+i)),/너무 많/);
 assert.throws(()=>busPairs(['NAEK600'],['NAEK600']),/다르게/);
});

test('전주 여러 터미널 코드를 자동 조회하고 동일 배차는 한 번만 표시',async()=>{
 const original=globalThis.fetch;
 const calls=[];
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const date=`${p.year}-${p.month}-${p.day}`;
 globalThis.fetch=async url=>{
  const u=new URL(url); const from=u.searchParams.get('depTerminalId'); calls.push(from);
  const common={gradename:'우등',depplandtime:date.replaceAll('-','')+'120000',arrplandtime:date.replaceAll('-','')+'150000',adultcharge:25000,routeid:'R1'};
  const different={gradename:'일반',depplandtime:date.replaceAll('-','')+'170000',arrplandtime:date.replaceAll('-','')+'194000',adultcharge:20000,routeid:'R2'};
  const entries=from==='NAEK604'?[different]:[common];
  return Response.json({response:{header:{resultCode:'00'},body:{items:{item:entries},totalCount:entries.length}}});
 };
 try{
  const query=`https://rail.example/api/bus-timetables?type=express&from=NAEK600,NAEK601,NAEK602,NAEK603,NAEK604&to=NAEK500&date=${date}`;
  const r=await schedules({env:{TAGO_API_KEY:'mock'},request:new Request(query)});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.ok,true);assert.equal(data.partial,false);
  assert.equal(calls.length,5);assert.equal(data.buses.length,2);
  assert.deepEqual(data.buses.map(x=>x.grade),['우등','일반']);
 }finally{globalThis.fetch=original}
});

test('일부 터미널 코드가 실패하면 성공 결과만 표시하며 부분 결과라고 알림',async()=>{
 const original=globalThis.fetch;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const date=`${p.year}-${p.month}-${p.day}`;
 globalThis.fetch=async url=>{
  if(new URL(url).searchParams.get('depTerminalId')==='NAEK601')throw Error('rate limited');
  return Response.json({response:{header:{resultCode:'00'},body:{items:{item:[]},totalCount:0}}});
 };
 try{
  const r=await schedules({env:{TAGO_API_KEY:'mock'},request:new Request(`https://rail.example/api/bus-timetables?type=express&from=NAEK600,NAEK601&to=NAEK500&date=${date}`)});
  assert.equal(r.status,200);assert.equal((await r.json()).partial,true);
 }finally{globalThis.fetch=original}
});


test('버스 시간표 0건의 원본 API 건수와 성공 코드조합을 진단할 수 있다',async()=>{
 const original=globalThis.fetch;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const date=`${p.year}-${p.month}-${p.day}`;
 globalThis.fetch=async()=>Response.json({response:{header:{resultCode:'00'},body:{items:{item:[]},totalCount:0}}});
 try{
  const r=await schedules({env:{TAGO_API_KEY:'mock'},request:new Request(`https://test.example/api/bus-timetables?type=intercity&from=NAI12345&to=NAI98765&date=${date}`)});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.buses.length,0);
  assert.deepEqual(data.diagnostics,{checkedPairs:1,successfulPairs:1,failedPairs:0,sourceTotal:0,receivedItems:0,validRows:0});
  assert.equal(JSON.stringify(data).includes('mock'),false,'API 키는 응답에 노출되지 않음');
 }finally{globalThis.fetch=original}
});

test('API 원본에 운행자료가 있는데 출발시간 형식이 누락되면 원본 1건을 진단한다',async()=>{
 const original=globalThis.fetch;
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const date=`${p.year}-${p.month}-${p.day}`;
 globalThis.fetch=async()=>Response.json({response:{header:{resultCode:'00'},body:{items:{item:[{departureTime:'not-supported'}]},totalCount:1}}});
 try{
  const r=await schedules({env:{TAGO_API_KEY:'mock'},request:new Request(`https://test.example/api/bus-timetables?type=intercity&from=NAI12345&to=NAI98765&date=${date}`)});
  const data=await r.json();
  assert.equal(data.buses.length,0);
  assert.equal(data.diagnostics.sourceTotal,1);
  assert.equal(data.diagnostics.receivedItems,1);
  assert.equal(data.diagnostics.validRows,0);
 }finally{globalThis.fetch=original}
});