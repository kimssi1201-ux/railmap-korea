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
 assert.match(html,/역 이름 입력 또는 확인된 직통역 선택/);
 assert.match(html,/같은 노선의 역을 빠르게 선택하거나/);
 assert.match(html,/환승 경로·좌석·운행 변경은 공식 예매처에서 확인하세요/);
});

test('station destination input has visible options container for nationwide lookups',()=>{
 const html=stationDetailHtml({id:'NAT999999',name:'광운대',region:'서울'});
 assert.match(html,/id="spDestinationOptions"/);
 assert.match(html,/sintanjin-mobile-picks-v1/);
 assert.ok(!html.includes('id="spLoadMoreRoutes"'));
});

test('station detail keeps one direct timetable search and does not auto-load transfer connections',()=>{
 const html=stationDetailHtml(FEATURED_STATIONS[0]);
 assert.match(html,/sintanjin-mobile-picks-v1/);
 const js=readFileSync(new URL('../station-destination.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/searchOneTransfer/);
 assert.doesNotMatch(js,/renderTransferCards/);
 assert.match(js,/직통 운행 시간표는 확인되지 않았습니다/);
});


test('date-specific official direct shortlist replaces misleading registered-station recommendations',()=>{
 const html=stationDetailHtml(FEATURED_STATIONS[0]);
 assert.doesNotMatch(html,/spVerifiedAlternatives/);
 assert.match(html,/같은 노선의 역을 빠르게 선택하거나/);
 const js=readFileSync(new URL('../station-destination.js',import.meta.url),'utf8');
 assert.match(js,/verifyStationDestinations/);
 assert.match(js,/verified\.confirmed/);
 assert.match(js,/data\.partial/);
 assert.match(js,/역 코드는 정상 매칭됐지만/);
 assert.doesNotMatch(js,/const responses=await Promise\.all/);
});

test('광주 등 후보가 검증 대기 중에도 관련 역을 먼저 선택할 수 있다',()=>{
 const js=readFileSync(new URL('../station-destination.js',import.meta.url),'utf8');
 assert.match(js,/candidateStationsForVerification/);
 assert.match(js,/노선 참고 · 직통 미확인/);
 assert.match(js,/sp-option-confirmed/);
 assert.match(js,/전국 등록역 검색/);
});

test('station detail offers destination buttons before manual search on mobile',()=>{
 const html=stationDetailHtml({id:'NAT999999',name:'신탄진',region:'대전'});
 assert.match(html,/id="spQuickWrap"/);
 assert.match(html,/id="spQuickDestinations"/);
 assert.match(html,/id="spQuickSource"/);
 assert.ok(html.indexOf('id="spCheckDate"')<html.indexOf('id="spQuickDestinations"'));
 assert.ok(html.indexOf('id="spQuickDestinations"')<html.indexOf('id="spDestinationInput"'));
 const js=readFileSync(new URL('../station-destination.js',import.meta.url),'utf8');
 assert.match(js,/renderQuickDestinations/);
 assert.match(js,/getReferenceSuggestions/);
 assert.match(js,/quick\.append\(b\)/);
 assert.match(js,/selectStation\(station\)/);
});
