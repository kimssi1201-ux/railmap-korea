import test from 'node:test';
import assert from 'node:assert/strict';
import {stationPickerMatches,destinationPickerMatches,stationPickerRegions} from '../station-picker.js';
test('출발역은 12개가 아니라 공식 데이터 전체를 볼 수 있다',()=>{
 const stations=Array.from({length:339},(_,i)=>({id:'NAT'+i,name:'테스트'+String(i).padStart(3,'0'),region:'경기'}));
 assert.equal(stationPickerMatches(stations,'').length,339);
 assert.equal(stationPickerMatches(stations,'테스트').length,339);
});
test('지역별 선택은 검색한 지역의 역만 반환한다',()=>{
 const stations=[{id:'a',name:'서울',region:'서울'},{id:'b',name:'가남',region:'경기'},{id:'c',name:'수원',region:'경기'},{id:'d',name:'부산',region:'부산'}];
 assert.deepEqual(stationPickerMatches(stations,'','경기').map(s=>s.name),['가남','수원']);
 assert.equal(stationPickerMatches(stations,'가남')[0].name,'가남');
 assert.deepEqual(stationPickerRegions(stations).find(r=>r.region==='경기'),{region:'경기',count:2});
});
test('지역 미분류 역도 전체 검색에서 사라지지 않는다',()=>{
 const stations=[{id:'x',name:'임의역'},{id:'y',name:'경주',region:'경북'}];
 assert.equal(stationPickerMatches(stations,'').length,2);
 assert.equal(stationPickerMatches(stations,'','지역 확인 필요')[0].id,'x');
 assert.equal(stationPickerRegions(stations).some(r=>r.region==='지역 확인 필요'),true);
});

test('도착역 기본 목록은 네 후보에 제한되지 않고 모든 공식 역을 포함한다',()=>{
 const r=Array.from({length:330},(_,i)=>({id:'NAT'+i,name:'역'+String(i).padStart(3,'0'),region:'경기'}));
 const suggestions=destinationPickerMatches(r,'','',r[0],[r[5],r[2],r[5]]);
 assert.equal(suggestions.length,329);
 assert.deepEqual(suggestions.slice(0,2).map(x=>x.id),[r[5].id,r[2].id]);
 assert.ok(!suggestions.some(x=>x.id===r[0].id));
 assert.equal(new Set(suggestions.map(x=>x.id)).size,329);
});
test('도착역 이름 검색·시도 필터는 후보 우선순위보다 검색 결과를 존중한다',()=>{
 const r=[{id:'a',name:'서울',region:'서울'},{id:'b',name:'부산',region:'부산'},{id:'c',name:'서대전',region:'대전'},{id:'d',name:'서원주',region:'강원'}];
 assert.deepEqual(destinationPickerMatches(r,'서','',r[0],[r[1]]).map(x=>x.name),['서대전','서원주']);
 assert.deepEqual(destinationPickerMatches(r,'','부산',r[0],[r[2]]).map(x=>x.name),['부산']);
});
