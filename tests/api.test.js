import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItems,cleanStation,cleanTrain,validDate,withinWindow,callTago,DataError} from '../functions/_lib/tago.js';
import {onRequestGet as getTrains} from '../functions/api/trains.js';
import {onRequestGet as getStations} from '../functions/api/stations.js';

test('TAGO 단일 item/배열/비어있는 목록 정규화',()=>{
 assert.deepEqual(normalizeItems({response:{body:{items:{item:{nodeid:'NAT100'}}}}}),[{nodeid:'NAT100'}]);
 assert.deepEqual(normalizeItems({response:{body:{items:{item:[{a:1},{a:2}]}}}}),[{a:1},{a:2}]);
 assert.deepEqual(normalizeItems({response:{body:{items:''}}}),[]);
});
test('역 및 열차 데이터 정리',()=>{
 assert.deepEqual(cleanStation({nodename:'서울',nodeid:'NAT010000'}),{name:'서울',id:'NAT010000'});
 assert.equal(cleanTrain({traingradename:'KTX',adultcharge:'59800',depplandtime:20261022120000}).adultFare,59800);
 assert.equal(cleanTrain({adultcharge:null}).adultFare,null);
});
test('KST 날짜 검증 및 31일 범위',()=>{
 assert.ok(validDate('2026-10-22'));assert.ok(!validDate('2026-02-30'));
 assert.equal(withinWindow('2026-10-22',31,new Date('2026-10-21T15:30:00Z')),true);
 assert.equal(withinWindow('2026-10-21',31,new Date('2026-10-21T15:30:00Z')),false);
 assert.equal(withinWindow('2026-11-23',31,new Date('2026-10-21T15:30:00Z')),false);
});
test('TAGO 키 없으면 API를 호출하지 않고 오류 반환',async()=>{
 await assert.rejects(()=>callTago({},'GetCtyCodeList',{},()=>{throw new Error('must not call')}),DataError);
 const currentKst = new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
 const r=await getTrains({env:{},request:new Request(`https://rail.example/api/trains?from=NAT010000&to=NAT014445&date=${currentKst}`)});
 assert.equal(r.status,503);assert.equal((await r.json()).ok,false);
});
test('잘못된 날짜/출도착역은 API 조회 전에 차단',async()=>{
 const r=await getTrains({env:{},request:new Request('https://rail.example/api/trains?from=aaa&to=aaa&date=2026-02-30')});
 assert.equal(r.status,400);
});
test('stations endpoint 키 누락 시 오류',async()=>{
 const r=await getStations({env:{},request:new Request('https://rail.example/api/stations')});
 assert.equal(r.status,503);
});
test('TAGO 응답의 실제 출발·도착시간 추출',async()=>{
 const mock=async()=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:{traingradename:'KTX',depplandtime:20261022120000,arrplandtime:20261022142500,adultcharge:50000}}}}});
 const v=await callTago({TAGO_API_KEY:'test-key'},'GetStrtpntAlocFndTrainInfo',{depPlaceId:'NAT010000'},mock);assert.equal(v.items.length,1);assert.equal(v.items[0].adultcharge,50000)
});

test('일부 도시 역 데이터가 누락되어도 서울·부산 빠른 구간의 공개 역 코드를 보완한다',async()=>{
 const {ensurePopularStations}=await import('../functions/api/stations.js');
 const stations=ensurePopularStations([{name:'대전',id:'NAT011668'},{name:'부산역',id:'NAT014445'}]);
 assert.equal(stations.find(s=>s.name==='서울')?.id,'NAT010000');
 assert.equal(stations.find(s=>s.name==='용산')?.id,'NAT010032');
 assert.equal(stations.filter(s=>s.id==='NAT014445').length,1);
 assert.equal(stations.find(s=>s.name==='서울')?.source,'station-id-fallback');
});

test('TAGO 원본에 주요 역이 모두 있으면 보완 중복을 만들지 않는다',async()=>{
 const {ensurePopularStations}=await import('../functions/api/stations.js');
 const stations=ensurePopularStations([{name:'서울',id:'NAT010000'},{name:'부산',id:'NAT014445'},{name:'용산',id:'NAT010032'}]);
 assert.equal(stations.length,3);
 assert.equal(stations.some(s=>s.source==='station-id-fallback'),false);
});