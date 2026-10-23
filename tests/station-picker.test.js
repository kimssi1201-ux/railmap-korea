import test from 'node:test';
import assert from 'node:assert/strict';
import {stationPickerMatches,stationPickerRegions} from '../station-picker.js';
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
