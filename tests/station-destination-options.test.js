import test from 'node:test';
import assert from 'node:assert/strict';
import {stationGuideCandidates,stationGuideSearch,stationGuideOptions,stationGuideOptionCount,stationGuideNearby,INITIAL_STATION_SUGGESTIONS,STATION_SEARCH_SUGGESTIONS} from '../station-destination-options.js';

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

test('추천 노선이 없는 역도 주요 목적지 8개만 초기 표시하고 전체 역 검색은 유지',()=>{
 const all=['광운대','서울','용산','익산','전주','부산',...Array.from({length:344},(_,i)=>'테스트'+i)].map((name,i)=>({id:'NAT'+String(i).padStart(6,'0'),name}));
 const origin=all[0];
 const opts=stationGuideOptions(origin,all,'');
 assert.equal(opts.length,INITIAL_STATION_SUGGESTIONS);
 assert.equal(opts[0].name,'서울');
 assert.ok(opts.some(s=>s.name==='전주'));
 assert.equal(stationGuideOptionCount(origin,all,''),all.length-1);
 assert.ok(!opts.some(s=>s.id===origin.id));
 assert.equal(new Set(opts.map(s=>s.id)).size,opts.length);
});
test('입력값이 있을 때는 일치하는 등록역 10개까지만 표시',()=>{
 const all=[{id:'a',name:'광운대'},...Array.from({length:21},(_,i)=>({id:'b'+i,name:'중앙'+i}))];
 assert.equal(stationGuideOptions(all[0],all,'중앙').length,STATION_SEARCH_SUGGESTIONS);
 assert.equal(stationGuideOptionCount(all[0],all,'중앙'),21);
 assert.deepEqual(stationGuideOptions(all[0],all,'중앙20').map(x=>x.name),['중앙20']);
 assert.ok(stationGuideOptions(all[0],all,'중앙20').every(x=>x.name==='중앙20'));
});

test('군북에서는 서울을 무관한 초기 목적지로 추천하지 않고 경전선 역을 먼저 보여준다',()=>{
 const a=['군북','서울','용산','함안','반성','진주','마산','창원','순천'].map((name,i)=>({id:'NAT'+String(i).padStart(6,'0'),name}));
 const suggestions=stationGuideOptions(a[0],a,'').map(s=>s.name);
 assert.deepEqual(new Set(suggestions.slice(0,2)),new Set(['함안','반성']));
 assert.ok(suggestions.includes('마산'));
 assert.ok(!suggestions.includes('서울'));
 assert.deepEqual(stationGuideOptions(a[0],a,'서울').map(s=>s.name),['서울']);
 assert.equal(stationGuideNearby(a[0],a,3).length,3);
});
