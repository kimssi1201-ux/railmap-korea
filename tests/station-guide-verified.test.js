import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEATURED_STATIONS,stationDetailHtml} from '../station-pages.js';

test('every featured station displays one direct timetable search and no candidate expansion',()=>{
 for(const station of FEATURED_STATIONS){
  const html=stationDetailHtml(station);
  assert.match(html,/id="spStationLookup"/);
  assert.match(html,/id="spStationForm"/);
  assert.match(html,/id="spCheckDate"/);
  assert.match(html,/id="spDestinationInput"/);
  assert.match(html,/id="spDestinationOptions"/);
  assert.match(html,/id="spStationSubmit"/);
  assert.match(html,/id="spStationResults"/);
  assert.ok(!html.includes('id="spVerifiedRoutes"'));
  assert.ok(!html.includes('id="spLoadMoreRoutes"'));
  assert.ok(!html.includes('id="spOtherStationQuery"'));
  assert.ok(!html.includes('data-candidates='));
  assert.ok(!html.includes('다른 주요역 찾아보기'));
  assert.ok(!html.includes('추천 후보 더 확인'));
  assert.ok(!html.includes('href="/routes/'),station.name);
  assert.equal((html.match(/id="spStationForm"/g)||[]).length,1);
 }
});
test('Yongsan station search is no longer restricted to two featured destinations',()=>{
 const html=stationDetailHtml(FEATURED_STATIONS.find(s=>s.name==='용산'));
 assert.match(html,/data-station-name="용산"/);
 assert.match(html,/예: 익산, 전주, 광주송정/);
 assert.match(html,/공식 직통 열차 시간표/);
 assert.match(html,/환승편이 있을 수 있습니다/);
});

test('station destination input has visible options container for nationwide lookups',()=>{
 const html=stationDetailHtml({id:'NAT999999',name:'광운대',region:'서울'});
 assert.match(html,/id="spDestinationOptions"/);
 assert.match(html,/rail-transfer-v1/);
 assert.ok(!html.includes('id="spLoadMoreRoutes"'));
});

test('station detail includes official dated 1-transfer fallback without showing invented routes',()=>{
 const html=stationDetailHtml(FEATURED_STATIONS[0]);
 assert.match(html,/rail-transfer-v1/);
 const js=readFileSync(new URL('../station-destination.js',import.meta.url),'utf8');
 assert.match(js,/searchOneTransfer/);
 assert.match(js,/renderTransferCards/);
 assert.match(js,/1회 환승편 조회 중/);
});
