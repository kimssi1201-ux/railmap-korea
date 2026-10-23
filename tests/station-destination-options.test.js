import test from 'node:test';
import assert from 'node:assert/strict';
import {stationGuideCandidates,stationGuideSearch,stationGuideOptions} from '../station-destination-options.js';

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

test('광운대역 같은 노선 매핑 없는 역도 공식 등록된 전국 목적지를 바로 표시한다',()=>{
 const all=['광운대','서울','용산','익산','전주','부산',...Array.from({length:344},(_,i)=>'테스트'+i)].map((name,i)=>({id:'NAT'+String(i).padStart(6,'0'),name}));
 const origin=all[0];
 const opts=stationGuideOptions(origin,all,'');
 assert.equal(opts.length,all.length-1);
 assert.equal(opts[0].name,'서울');
 assert.ok(opts.some(s=>s.name==='전주'));
 assert.ok(!opts.some(s=>s.id===origin.id));
 assert.equal(new Set(opts.map(s=>s.id)).size,opts.length);
});
test('특정 역명 검색에서도 후보 10개 제한 없이 공식 등록역 전부 검색',()=>{
 const all=[{id:'a',name:'광운대'},...Array.from({length:21},(_,i)=>({id:'b'+i,name:'중앙'+i}))];
 assert.equal(stationGuideOptions(all[0],all,'중앙').length,21);
 assert.deepEqual(stationGuideOptions(all[0],all,'중앙20').map(x=>x.name),['중앙20']);
});
