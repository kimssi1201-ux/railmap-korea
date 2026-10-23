import test from 'node:test';
import assert from 'node:assert/strict';
import {callCitybus,cleanCity,cleanStop,cleanRoute,cleanArrival,assertCityCode,assertTerm,resolveCitybusKey} from '../functions/_lib/citybus.js';
import {onRequestGet as areas} from '../functions/api/citybus-areas.js';
import {onRequestGet as search} from '../functions/api/citybus-search.js';
import {onRequestGet as arrivals} from '../functions/api/citybus-arrivals.js';
import {onRequestGet as route} from '../functions/api/citybus-route.js';
const payload=(rows,total=rows.length)=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:total,items:{item:rows}}}});
function mockEnv(){return {TAGO_API_KEY:'TEST_ONLY'}}
test('지역/정류장/노선/도착 데이터의 공식 필드 매핑',()=>{
 assert.deepEqual(cleanCity({citycode:25,cityname:'대전'}),{id:'25',name:'대전'});
 assert.equal(cleanStop({nodeid:'DJB8001793',nodenm:'북대전',nodeno:'12345'}).id,'DJB8001793');
 assert.equal(cleanRoute({routeid:'DJB30300002',routeno:'5',routetp:'마을버스'}).number,'5');
 assert.deepEqual(cleanArrival({routeno:'5',arrtime:'816',arrprevstationcnt:'15',vehicletp:'저상버스'}).etaSeconds,816);
 assert.equal(cleanArrival({routeno:'3',arrtime:'',arrprevstationcnt:''}).etaSeconds,null); // don't interpret absent data as arrival now
});
test('서버 입력 검증과 검색어 길이 제한',()=>{
 assert.equal(assertCityCode('25'),'25');assert.throws(()=>assertCityCode('ABC'));
 assert.equal(assertTerm('  시청  '),'시청');assert.throws(()=>assertTerm(''));assert.throws(()=>assertTerm('<img>'));
});
test('시내버스 API 키는 별도 Secret이 우선이고 없으면 기존 TAGO 키 사용',()=>{
 assert.equal(resolveCitybusKey({TAGO_API_KEY:'old'},'stops'),'old');
 assert.equal(resolveCitybusKey({TAGO_API_KEY:'old',CITYBUS_ARRIVALS_API_KEY:'new'},'arrivals'),'new');
 assert.throws(()=>resolveCitybusKey({},'areas'));
});
test('공식 서비스 URL 및 매개변수를 서버에서 전송',async()=>{
 let u;const fetcher=async input=>{u=new URL(input);return payload([{nodeid:'DJB8001793',nodenm:'북대전'}])};
 await callCitybus(mockEnv(),'stops',{cityCode:'25',nodeNm:'북대전'},fetcher);
 assert.equal(u.pathname,'/1613000/BusSttnInfoInqireService/getSttnNoList');
 assert.equal(u.searchParams.get('cityCode'),'25');assert.equal(u.searchParams.get('nodeNm'),'북대전');
 assert.equal(u.searchParams.get('serviceKey'),'TEST_ONLY');
});
test('제공 지역 API가 실제 응답만 반환하며 키 노출 안 함',async()=>{
 const orig=globalThis.fetch;globalThis.fetch=async()=>payload([{citycode:25,cityname:'대전'},{citycode:20,cityname:'부산'}]);
 try{const r=await areas({env:mockEnv(),request:new Request('https://rail.test/api/citybus-areas')});const o=await r.json();assert.equal(o.ok,true);assert.equal(o.areas.length,2);assert.equal(JSON.stringify(o).includes('TEST_ONLY'),false)}finally{globalThis.fetch=orig}
});
test('정류장 검색은 도시와 검색어를 전달하고 결과를 반환',async()=>{
 const orig=globalThis.fetch;globalThis.fetch=async()=>payload([{nodeid:'DJB8001793',nodenm:'북대전농협',nodeno:'1234'},{nodeid:'X',nodenm:'다른곳'}]);
 try{const r=await search({env:mockEnv(),request:new Request('https://rail.test/api/citybus-search?kind=stops&city=25&q=북대전')});const o=await r.json();assert.equal(o.ok,true);assert.equal(o.items.length,1);assert.equal(o.items[0].name,'북대전농협')}finally{globalThis.fetch=orig}
});
test('노선 검색과 페이지 넘기기 입력 확인',async()=>{
 const orig=globalThis.fetch;globalThis.fetch=async()=>payload([{routeid:'DJB303',routeno:'5'},{routeid:'DJB000',routeno:'10'}]);
 try{const r=await search({env:mockEnv(),request:new Request('https://rail.test/api/citybus-search?kind=routes&city=25&q=5')});const o=await r.json();assert.equal(o.items.length,1);assert.equal(o.items[0].number,'5')}
 finally{globalThis.fetch=orig}
 const bad=await search({env:mockEnv(),request:new Request('https://rail.test/api/citybus-search?kind=stops&city=25&q=a&page=999')});assert.equal(bad.status,400);
});
test('도착정보는 제공된 초 단위를 유지하며 값을 창작하지 않는다',async()=>{
 const orig=globalThis.fetch;globalThis.fetch=async()=>payload([{routeno:'5',routeid:'DJB300',arrtime:'816',arrprevstationcnt:'15'}]);
 try{const r=await arrivals({env:mockEnv(),request:new Request('https://rail.test/api/citybus-arrivals?city=25&id=DJB8001793')});const o=await r.json();assert.equal(o.ok,true);assert.equal(o.arrivals[0].etaSeconds,816);assert.equal(o.arrivals[0].stopsLeft,15);assert.equal(o.realtime,true)}finally{globalThis.fetch=orig}
});
test('노선 경유 정류장 호출은 실제 순번대로 표시',async()=>{
 const orig=globalThis.fetch;globalThis.fetch=async()=>payload([{nodeid:'S2',nodenm:'두번째',nodeord:2},{nodeid:'S1',nodenm:'첫번째',nodeord:1}]);
 try{const r=await route({env:mockEnv(),request:new Request('https://rail.test/api/citybus-route?city=25&id=DJB30300004')});const o=await r.json();assert.equal(o.stops[0].name,'첫번째');assert.equal(o.stops[1].name,'두번째')}finally{globalThis.fetch=orig}
});