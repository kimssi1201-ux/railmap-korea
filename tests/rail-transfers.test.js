import test from 'node:test';
import assert from 'node:assert/strict';
import {transferHubCandidates,connectTimedTrains,clockFromTrainTime,searchOneTransfer,fetchOfficialLeg} from '../rail-transfers.js';
const station=(name,id)=>({name,id});
test('강릉-천안아산 1회 환승 후보 서울역을 찾는다',()=>{
 const all=[station('강릉','NAT601936'),station('서울','NAT010000'),station('청량리','NAT130126'),station('천안아산','NAT123456')];
 const hubs=transferHubCandidates(all[0],all[3],all);
 assert.ok(hubs.some(h=>h.name==='서울'));assert.ok(!hubs.some(h=>h.name==='강릉'||h.name==='천안아산'));
});
test('공식 배차가 당일 30분 대기만 연결하면 환승 1건',()=>{
 const first=[{depTime:'20261023080000',arrTime:'20261023100000',trainNo:'801',grade:'KTX',adultFare:24000}];
 const next=[{depTime:'20261023101500',arrTime:'20261023120000',trainNo:'901',grade:'KTX'},
 {depTime:'20261023103000',arrTime:'20261023120000',trainNo:'902',grade:'KTX',adultFare:19000},
 {depTime:'20261023095500',arrTime:'20261023113000',trainNo:'903',grade:'KTX'},
 {depTime:'20261023140000',arrTime:'20261023150000',trainNo:'904',grade:'KTX'}];
 const paths=connectTimedTrains(first,next,station('서울','NAT010000'),{date:'2026-10-23'});
 assert.equal(paths.length,1);assert.equal(paths[0].waitMinutes,30);assert.equal(paths[0].fare,43000);assert.equal(paths[0].durationMinutes,240);
});
test('익일 환승, 같은 열차번호 및 잘못된 시간은 제외',()=>{
 const first={depTime:'20261023220000',arrTime:'20261023235500',trainNo:'7',grade:'KTX'};
 const tomorrow={depTime:'20261024003000',arrTime:'20261024020000',trainNo:'8',grade:'KTX'};
 assert.equal(connectTimedTrains([first],[tomorrow],station('서울','NAT010000')).length,0);
 const a={...first,depTime:'20261023080000',arrTime:'20261023100000'};
 const same={depTime:'20261023103000',arrTime:'20261023120000',trainNo:'7',grade:'KTX'};
 assert.equal(connectTimedTrains([a],[same],station('서울','NAT010000')).length,0);
 assert.equal(connectTimedTrains([{...a,depTime:'20260230080000'}],[{...same,trainNo:'9'}],station('서울','NAT010000')).length,0);
 assert.equal(connectTimedTrains([a],[{...same,trainNo:'9'}],station('서울','NAT010000'))[0].fare,null);
 assert.equal(clockFromTrainTime('20261023103000'),'10:30');assert.equal(clockFromTrainTime('invalid'),'—');
});
test('응답 오류는 확인 불가로 분리하고 가짜 시간표를 생성하지 않는다',async()=>{
 const all=[station('강릉','NAT601936'),station('서울','NAT010000'),station('천안아산','NAT999999')];
 const failed=await searchOneTransfer({from:all[0],to:all[2],stations:all,date:'2026-10-23',fetchLeg:async()=>{throw Error('network')}});
 assert.equal(failed.routes.length,0);assert.ok(failed.failedHubs>0);
 const success=await searchOneTransfer({from:all[0],to:all[2],stations:all,date:'2026-10-23',fetchLeg:async({from,to})=>{
  if(from===all[0].id&&to===all[1].id)return {trains:[{depTime:'20261023080000',arrTime:'20261023100000',trainNo:'801'}]};
  if(from===all[1].id&&to===all[2].id)return {trains:[{depTime:'20261023104500',arrTime:'20261023123000',trainNo:'902'}]};
  throw Error('unknown pair');
 }});
 assert.equal(success.routes.length,1);assert.equal(success.routes[0].hub.name,'서울');assert.equal(success.routes[0].fromName,'강릉');assert.equal(success.routes[0].toName,'천안아산');
});
test('API 호출은 기존 경로와 동일한 역 ID와 날짜만 전달',async()=>{
 let called;
 const response=await fetchOfficialLeg({from:'NAT601936',to:'NAT010000',date:'2026-10-23',origin:'https://rail.example',fetchFn:async(u)=>{called=new URL(u);return Response.json({ok:true,trains:[]})}});
 assert.equal(called.pathname,'/api/trains');assert.equal(called.searchParams.get('date'),'2026-10-23');assert.equal(response.ok,true);
});
