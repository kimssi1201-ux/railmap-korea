import test from 'node:test';
import assert from 'node:assert/strict';
import {stationGuideCandidates,stationGuideSearch} from '../station-destination-options.js';

test('용산 후보가 기존 수동 등록된 두 구간만으로 제한되지 않는다',()=>{
 const names=['용산','광주송정','목포','익산','전주','공주','정읍','논산','서대전','천안아산','오송'];
 const all=names.map((name,i)=>({name,id:'NAT'+String(i).padStart(6,'0')}));
 const favorites=[all[1],all[2]];
 const candidates=stationGuideCandidates(all[0],favorites,all);
 assert.ok(candidates.length>2);
 assert.equal(candidates[0].name,'광주송정');
 assert.equal(candidates[1].name,'목포');
 assert.ok(candidates.some(x=>x.name==='익산'));
 assert.ok(candidates.some(x=>x.name==='전주'));
 assert.ok(!candidates.some(x=>x.name==='용산'));
 assert.equal(new Set(candidates.map(x=>x.id)).size,candidates.length);
});
test('전국 도착역 직접 검색은 실제 공식 목록에 있는 역만 반환한다',()=>{
 const stations=[{id:'1',name:'용산'},{id:'2',name:'익산'},{id:'3',name:'전주'}];
 assert.deepEqual(stationGuideSearch(stations,'1','전').map(x=>x.name),['전주']);
 assert.deepEqual(stationGuideSearch(stations,'1','용산'),[]);
 assert.deepEqual(stationGuideSearch(stations,'1',''),[]);
});
