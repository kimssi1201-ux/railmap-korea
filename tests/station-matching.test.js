import test from 'node:test';
import assert from 'node:assert/strict';
import {officialStationIndex,stationMatchingAudit,lookupRegisteredStation,sameCorridorStations,suggestedRegisteredStations} from '../station-matching.js';
import {getStation} from '../station-utils.js';
import {stationGuideOptions} from '../station-destination-options.js';
const create=(name,i,region='경남')=>({name,id:'NAT'+String(i).padStart(6,'0'),region});
test('349개 공식 역코드를 보존하고 어느 역이든 이름 검색으로 접근',()=>{
 const registered=[create('군북',0),create('함안',1),create('반성',2),create('마산',3),create('서울',4,'서울'),
  ...Array.from({length:344},(_,i)=>create('테스트'+i,i+5,i%2?'경남':'충북'))];
 const indexed=officialStationIndex(registered);
 assert.equal(indexed.stations.length,349);
 const audit=stationMatchingAudit(registered);
 assert.equal(audit.registered,349);
 assert.equal(audit.corridorReferenced+audit.noCorridorReference,349);
 assert.equal(audit.scope,'registered-stations-not-verified-direct-routes');
 for(const station of registered.slice(1)){
  const found=stationGuideOptions(registered[0],registered,station.name);
  assert.ok(found.some(s=>s.id===station.id),'missing station '+station.name);
 }
 assert.ok(sameCorridorStations(registered[0],registered).some(s=>s.name==='함안'));
 assert.ok(!sameCorridorStations(registered[0],registered).some(s=>s.name==='서울'));
});
test('같은 이름에 다른 공식 ID라면 처음 역을 잘못 선택하지 않는다',()=>{
 const all=[create('중앙',1,'경기'),create('중앙역',2,'부산'),create('서울',3,'서울')];
 const duplicate=lookupRegisteredStation(all,'중앙역');
 assert.equal(duplicate.station,null);assert.equal(duplicate.ambiguous,true);assert.equal(duplicate.matches.length,2);
 assert.equal(getStation(all,'중앙'),null);
 assert.equal(lookupRegisteredStation(all,'서울').station.id,all[2].id);
 assert.equal(getStation(all,'서울역').id,all[2].id);
 assert.equal(stationMatchingAudit(all).ambiguousNames,1);
});
test('역 코드 중복과 미분류는 별도 감사, 직통노선으로 추정 금지',()=>{
 const rows=[create('서울',1,'서울'),create('서울 복제',1,'서울'),{name:'오류역',id:'?'},create('지역미정',2,null)];
 const indexed=officialStationIndex(rows);
 assert.equal(indexed.stations.length,2);assert.equal(indexed.duplicateIds,1);assert.equal(indexed.discarded,1);
 const audit=stationMatchingAudit(rows);
 assert.equal(audit.registered,2);assert.equal(audit.unclassifiedRegion,1);
 assert.equal(audit.duplicatesById,1);
});
test('노선 힌트 없는 역은 같은 지역으로 중립 분류하고 무근거 직통 표시 금지',()=>{
 const start=create('임시신설역',1,'전북'),neighbor=create('다른역',2,'전북'),city=create('서울',3,'서울');
 const suggestion=suggestedRegisteredStations(start,[start,neighbor,city]);
 assert.equal(suggestion.kind,'region');
 assert.deepEqual(suggestion.stations.map(s=>s.name),['다른역']);
 const unknown=suggestedRegisteredStations({...start,region:null},[start,neighbor,city]);
 assert.equal(unknown.kind,'unmapped');
 assert.deepEqual(unknown.stations,[]);
});
