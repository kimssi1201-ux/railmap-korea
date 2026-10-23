import test from 'node:test';
import assert from 'node:assert/strict';
import {FEATURED_STATIONS,stationDetailHtml} from '../station-pages.js';
test('station guide does not show all unverified destinations',()=>{
 for(const station of FEATURED_STATIONS){
  const html=stationDetailHtml(station);
  assert.match(html,/id="spVerifiedRoutes"/);
  assert.match(html,/data-candidates=/);
  assert.ok(!html.includes('id="spDestinationSelect"'));
  assert.ok(!html.includes('id="spDestinationGo"'));
  assert.ok(!html.includes('href="/routes/'),station.name);
 }
});
test('station detail clearly distinguishes a recommended subset from all possible destinations',()=>{
 const html=stationDetailHtml(FEATURED_STATIONS.find(s=>s.name==='용산'));
 assert.match(html,/일부 추천 구간/);
 assert.match(html,/id="spLoadMoreRoutes"/);
 assert.match(html,/id="spOtherStationQuery"/);
 assert.match(html,/id="spOtherStationMatches"/);
 assert.match(html,/data-station-name="용산"/);
 assert.ok(!html.includes('선택한 날짜에 운행편이 확인된 2개 목적지만 표시합니다.'));
});
