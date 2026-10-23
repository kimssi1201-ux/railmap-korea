import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationCandidates,prioritizeDestinationCandidates,verifiedDestinationResponse} from '../train-destinations.js';
const stations=(...names)=>names.map((name,i)=>({name,id:'NAT'+String(i).padStart(6,'0')}));
test('가남은 중부내륙선 후보만, 강진은 제외',()=>{
 const r=stations('가남','판교','부발','충주','문경','강진','부산');
 const found=destinationCandidates(r[0],r).map(x=>x.name);
 for(const n of ['판교','부발','충주','문경'])assert.ok(found.includes(n));
 assert.ok(!found.includes('강진'));assert.ok(!found.includes('부산'));
});
test('자기 자신 및 공식 역 목록에 없는 후보 제외',()=>{const r=stations('가남','강진');assert.deepEqual(destinationCandidates(r[0],r),[])});
test('후보 개수 제한 및 중복 제거',()=>{const r=stations('서울','광명','대전','부산','강릉','동대구','용산','천안아산','수원','영등포');const out=destinationCandidates(r[0],r,4);assert.equal(out.length,4);assert.equal(new Set(out.map(x=>x.id)).size,4)});
test('TAGO 실제 배차가 있으면 확인, 없거나 실패면 제외',()=>{const row={grade:'KTX-이음',depTime:'20261023100100',arrTime:'20261023110200'};assert.equal(verifiedDestinationResponse({ok:true,trains:[row]}).state,'confirmed');assert.equal(verifiedDestinationResponse({ok:true,trains:[]}).state,'empty');assert.equal(verifiedDestinationResponse({ok:true,trains:[],partial:true}).state,'unknown');assert.equal(verifiedDestinationResponse({ok:false}).state,'error');assert.equal(verifiedDestinationResponse({ok:true,trains:[row]},'SRT').state,'empty')});

test('선택했던 인기 구간 도착역을 첫 검증 묶음에서 먼저 확인',()=>{
 const r=stations('서울','광명','대전','동대구','부산','오송');
 const ranked=prioritizeDestinationCandidates(destinationCandidates(r[0],r),r[4],r[0].id,4);
 assert.equal(ranked[0].name,'부산');
 assert.equal(ranked.length,4);
 assert.equal(new Set(ranked.map(x=>x.id)).size,4);
});
test('출발역 재선택은 도착역으로 취급하지 않으며 후보 중복 제거',()=>{
 const r=stations('서울','광명','대전');
 const ranked=prioritizeDestinationCandidates([r[1],r[2],r[1]],r[0],r[0].id,4);
 assert.deepEqual(ranked.map(s=>s.name),['광명','대전']);
});
