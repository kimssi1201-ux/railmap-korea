import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateStationsForVerification,verifyStationDestinations} from '../station-verified.js';
import {RAIL_CORRIDORS} from '../train-destinations.js';

const station=(name,id)=>({name,id});
const origin=station('남창','NAT750560');
const stations=[origin,...['부전','태화강','동대구','서울','청량리','포항','동해','경주','대전','기장','센텀']
 .map((name,i)=>station(name,'NAT'+String(500+i)))];

test('남창역 참고 노선을 포함하되 서울·동대구·부전 등 후보는 직통이라고 주장하지 않는다',()=>{
 assert.ok(RAIL_CORRIDORS.some(line=>line.includes('남창')));
 const candidates=candidateStationsForVerification(origin,stations,8);
 assert.equal(candidates.length,8);
 assert.ok(candidates.some(s=>s.name==='부전'));
 assert.ok(candidates.some(s=>s.name==='서울'));
 assert.ok(!candidates.some(s=>s.name==='대전'));
 assert.ok(!candidates.some(s=>s.id===origin.id));
});
test('선택 날짜에 TAGO 배차가 나온 도착역만 직통 추천',async()=>{
 const hit=new Set(['부전','태화강','서울']);
 const calls=[];
 const response=await verifyStationDestinations({origin,stations,date:'2026-10-24',request:async({from,to,date})=>{
  calls.push({from,to,date});
  const target=stations.find(s=>s.id===to);
  return {ok:true,trains:hit.has(target.name)?[{depTime:'20261024103500',arrTime:'20261024135800'}]:[]};
 }});
 assert.equal(response.checked,8);
 assert.equal(response.candidates,8);
 assert.equal(response.failed,0);
 assert.equal(response.exhaustive,false);
 assert.deepEqual(new Set(response.confirmed.map(x=>x.station.name)),hit);
 assert.ok(calls.every(x=>x.from===origin.id&&x.date==='2026-10-24'));
});
test('다른 날짜의 운행 편은 추천하지 않고 부분응답과 오류는 확인 실패로 분류',async()=>{
 let n=0;
 const response=await verifyStationDestinations({origin,stations,date:'2026-10-24',limit:4,request:async()=>{
  n++;
  if(n===1)return {ok:true,trains:[{depTime:'20261023103000',arrTime:'20261023123000'}]};
  if(n===2)return {ok:true,partial:true,trains:[]};
  if(n===3)throw Error('provider down');
  return {ok:false,trains:[]};
 }});
 assert.equal(response.confirmed.length,0);
 assert.equal(response.checked,4);
 assert.equal(response.failed,2);
 assert.equal(response.unknown.length,4);
});
test('요청 취소 상태에서는 남은 목적지를 확인하지 않는다',async()=>{
 const abort=new AbortController();
 let calls=0;
 const response=await verifyStationDestinations({origin,stations,date:'2026-10-24',signal:abort.signal,request:async()=>{
  calls++;abort.abort();
  return {ok:true,trains:[{depTime:'20261024102000',arrTime:'20261024110000'}]};
 }});
 assert.equal(response.confirmed.length,0);
 assert.equal(response.checked,0);
 assert.equal(calls,2);
});

test('광주역·극락강역·서광주역·효천역은 추천 후보가 비지 않는다',()=>{
 const sample=['광주','극락강','광주송정','서광주','효천','화순','순천','용산','익산'].map((name,i)=>station(name,'NAT'+String(200+i)));
 for(const [start,end] of [['광주','극락강'],['극락강','광주송정'],['광주송정','서광주'],['서광주','효천'],['효천','서광주']]){
  const from=sample.find(s=>s.name===start);
  const c=candidateStationsForVerification(from,sample,8);
  assert.ok(c.some(s=>s.name===end),start+' → '+end);
  assert.ok(!c.some(s=>s.id===from.id));
 }
});
test('광주 지역 빈 공식 시간표라도 검증 후보는 유지하며 직통을 만들어내지 않는다',async()=>{
 const list=['광주','극락강','광주송정','서광주','효천'].map((name,i)=>station(name,'NAT'+String(300+i)));
 const response=await verifyStationDestinations({origin:list[1],stations:list,date:'2026-10-25',request:async()=>({ok:true,trains:[]})});
 assert.ok(response.candidates>=2);
 assert.equal(response.confirmed.length,0);
 assert.equal(response.failed,0);
 assert.equal(response.exhaustive,false);
});

test('신탄진역에서도 조치원·대전 등 경부선 역이 날짜 조회 전 바로 선택 후보에 나타난다',()=>{
 const stations=['신탄진','대전','조치원','오송','옥천','서울','논산'].map((name,i)=>station(name,'NAT'+String(400+i)));
 const start=stations[0],choices=candidateStationsForVerification(start,stations,8);
 assert.ok(choices.some(s=>s.name==='대전'),'Daejeon should be a nearby corridor candidate');
 assert.ok(choices.some(s=>s.name==='조치원'),'Jochiwon should be a nearby corridor candidate');
 assert.ok(!choices.some(s=>s.name==='논산'),'Unrelated stations should not be guessed as a direct train');
 assert.ok(choices.every(s=>s.id!==start.id));
});
