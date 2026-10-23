import test from 'node:test';
import assert from 'node:assert/strict';
import {REGION_NAMES,classifyTerminalRegion,buildTerminalRegionDirectory} from '../terminal-region.js';
const c=name=>classifyTerminalRegion(name);

test('17 regions remain selectable',()=>{
  assert.equal(REGION_NAMES.length,17);
  assert.equal(new Set(REGION_NAMES).size,17);
});
test('Jeonju and Yongin classify to the intended regional folders',()=>{
  assert.deepEqual(c('전주'),{region:'전북',city:'전주'});
  assert.deepEqual(c('전주시외터미널'),{region:'전북',city:'전주'});
  assert.deepEqual(c('용인'),{region:'경기',city:'용인'});
  assert.deepEqual(c('전주대'),{region:'전북',city:'전주'});
  assert.deepEqual(c('대한리무진(전주)'),{region:'전북',city:'전주'});
});
test('Gwangju metro and Gyeonggi Gwangju are distinct',()=>{
  assert.deepEqual(c('광주(유·스퀘어)'),{region:'광주',city:'광주'});
  assert.deepEqual(c('광주비아'),{region:'광주',city:'광주'});
  assert.deepEqual(c('경기광주'),{region:'경기',city:'광주'});
  assert.deepEqual(c('광주(경기)'),{region:'경기',city:'광주'});
});
test('major terminal aliases are classified without changing their name',()=>{
  assert.deepEqual(c('서울경부'),{region:'서울',city:'서울'});
  assert.deepEqual(c('동서울'),{region:'서울',city:'서울'});
  assert.deepEqual(c('센트럴시티'),{region:'서울',city:'서울'});
  assert.deepEqual(c('서부산'),{region:'부산',city:'부산'});
  assert.deepEqual(c('마산'),{region:'경남',city:'창원'});
  assert.deepEqual(c('조치원'),{region:'세종',city:'세종'});
});
test('no invented location for ambiguous labels or plain Goseong',()=>{
  assert.equal(c('고성'),null);
  assert.equal(c('제2터미널'),null);
  assert.equal(c('구간'),null);
  assert.deepEqual(c('강원고성'),{region:'강원',city:'고성'});
  assert.deepEqual(c('경남고성'),{region:'경남',city:'고성'});
});
test('deduplicated names remain one regional row with all official IDs',()=>{
  const groups=[
   {name:'전주',terminals:[{id:'NAEK600',name:'전주'},{id:'NAEK601',name:'전주'}]},
   {name:'전주시외터미널',terminals:[{id:'NAEK609',name:'전주시외터미널'}]},
   {name:'광주',terminals:[{id:'NAEK500',name:'광주'}]},
   {name:'경기광주',terminals:[{id:'NAEK151',name:'경기광주'}]},
   {name:'제2터미널',terminals:[{id:'N2',name:'제2터미널'}]}
  ];
  const dir=buildTerminalRegionDirectory(groups);
  assert.equal(dir.classified,4);
  assert.equal(dir.unclassified.length,1);
  const jeonju=dir.regions.find(r=>r.name==='전북').cities.find(t=>t.name==='전주');
  assert.equal(jeonju.terminals.length,2);
  assert.deepEqual(jeonju.terminals.find(t=>t.name==='전주').terminals.map(x=>x.id),['NAEK600','NAEK601']);
  assert.equal(dir.regions.find(r=>r.name==='광주').count,1);
  assert.equal(dir.regions.find(r=>r.name==='경기').count,1);
});