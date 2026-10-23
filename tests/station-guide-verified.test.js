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