import test from 'node:test';import assert from 'node:assert/strict';
import {RAIL_PROVINCES,provinceFromTagoCity,categorizedStations} from '../station-regions.js';
import {ensurePopularStations} from '../functions/api/stations.js';
test('17개 시도와 특별자치도 명칭',()=>{
 assert.equal(RAIL_PROVINCES.length,17);
 for(const [input,expected] of [['전북특별자치도','전북'],['강원특별자치도','강원'],['충청남도','충남'],['서울특별시','서울'],['경기도','경기'],['제주특별자치도','제주']])assert.equal(provinceFromTagoCity(input),expected);
 assert.equal(provinceFromTagoCity('익산시'),null);assert.equal(provinceFromTagoCity('', '35'),'전북');
});
test('동명이역 주소 추정 없이 공식 지역정보로만 분류',()=>{
 const grouped=categorizedStations([{id:'A',name:'광주',region:'경기'},{id:'B',name:'광주송정',region:'광주'},{id:'C',name:'감곡장호원',region:null}]);
 assert.equal(grouped['경기'][0].id,'A');assert.equal(grouped['광주'][0].id,'B');assert.equal(grouped['지역 확인 필요'][0].id,'C');
});
test('기존 주요역 보완이 API의 지역을 보존',()=>{
 const st=ensurePopularStations([{id:'NAT010000',name:'서울역',region:'서울'},{id:'NAT014445',name:'부산',region:'부산'}]);
 assert.equal(st.find(s=>s.id==='NAT010000').region,'서울');assert.equal(st.find(s=>s.id==='NAT014445').region,'부산');
});
import {onRequestGet as dynamicStation} from '../functions/stations/[id].js';
import {onRequestGet as dynamicRoute} from '../functions/routes/[from]/[to].js';
import {stationIndexHtml,stationDetailHtml,routeDetailHtml} from '../station-pages.js';
test('지역 목록에 17개 선택지와 공식 전체 역 조회 화면 포함',()=>{
 const html=stationIndexHtml();for(const prov of RAIL_PROVINCES)assert.ok(html.includes(`data-province="${prov}"`));
 assert.ok(html.includes('station-directory.js'));
});
test('서버 캐시에 존재하는 비주요역도 상세페이지와 구간 페이지 제공',async()=>{
 const old=globalThis.caches;try{
  globalThis.caches={default:{match:async()=>new Response(JSON.stringify({ok:true,stations:[{id:'NAT123456',name:'검증역',region:'충북'},{id:'NAT010000',name:'서울',region:'서울'}],partial:false}))}};
  const args={env:{},request:new Request('https://railmap-korea.pages.dev/stations/NAT123456')};
  const s=await dynamicStation({...args,params:{id:'NAT123456'}});
  assert.equal(s.status,200);assert.match(await s.text(),/검증역 시간표 안내/);
  const r=await dynamicRoute({...args,params:{from:'NAT123456',to:'NAT010000'}});
  assert.equal(r.status,200);assert.match(await r.text(),/data-from="NAT123456"/);
  const unavailable=await dynamicStation({...args,params:{id:'NAT999999'}});assert.equal(unavailable.status,404);
 }finally{globalThis.caches=old}
});
test('검증되지 않은 역 링크를 정적 편집 목록으로 발행하지 않는다',()=>{
 const html=stationDetailHtml({id:'NAT123456',name:'검증역',region:'충북'});
 assert.match(html,/name="robots" content="noindex"/);
 const r=routeDetailHtml({id:'NAT123456',name:'검증역'}, {id:'NAT010000',name:'서울'}, {allowVerifiedPair:true});
 assert.match(r,/name="robots" content="noindex"/);
});