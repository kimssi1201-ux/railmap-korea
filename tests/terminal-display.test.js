import test from 'node:test';
import assert from 'node:assert/strict';
import {isDisplayableTerminal,visibleTerminals,groupTerminalNames,findUniqueTerminal} from '../terminal-display.js';

test('2구간·7구간·9구간 등 숫자형 구간만 UI에서 제외', () => {
  const records = [
    {name:'2구간',id:'NAEK162'},
    {name:'7구간',id:'NAEK167'},
    {name:'9구간',id:'NAEK159'},
    {name:' 12 구간 ',id:'SECTION12'},
    {name:'서울경부',id:'NAEK010'},
    {name:'동서울',id:'NAEK011'},
    {name:'부산',id:'NAEK012'},
    {name:'경주',id:'NAEK815'},
    {name:'제2터미널',id:'T2'},
  ];
  const filtered = visibleTerminals(records);
  assert.deepEqual(filtered.map(x=>x.name), ['서울경부','동서울','부산','경주','제2터미널']);
  assert.equal(records.length,9,'원본 터미널 데이터를 변경하지 않는다');
});

test('잘못된 표시명과 숫자형 구간을 안전하게 제외하되 API 응답 원본 보존', () => {
  assert.equal(isDisplayableTerminal({name:'９구간'}),false);
  assert.equal(isDisplayableTerminal({name:'10구간'}),false);
  assert.equal(isDisplayableTerminal({name:'공항2구간'}),true);
  assert.equal(isDisplayableTerminal({name:'   '}),false);
  assert.deepEqual(visibleTerminals(null),[]);
});


test('같은 이름의 고속버스 터미널은 한 그룹으로 보이지만 모든 공식 ID를 유지',()=>{
 const input=[
  {name:'전주',id:'NAEK601'}, {name:'전주',id:'NAEK602'},
  {name:'전주',id:'NAEK603'}, {name:'전주',id:'NAEK604'},
  {name:'전주시외',id:'NAEK609'}, {name:'서울경부',id:'NAEK010'},
  {name:'2구간',id:'NAEK162'}
 ];
 const groups=groupTerminalNames(input);
 assert.equal(groups.filter(x=>x.name==='전주').length,1);
 assert.deepEqual(groups.find(x=>x.name==='전주').terminals.map(x=>x.id),['NAEK601','NAEK602','NAEK603','NAEK604']);
 assert.equal(groups.find(x=>x.name==='전주시외').terminals.length,1);
 assert.equal(groups.some(x=>x.name==='2구간'),false);
 assert.equal(input.length,7,'원본 데이터 보존');
});
test('동명이름 여러 코드가 있을 때 텍스트로 임의 ID 선택하지 않음',()=>{
 const list=[{name:'전주',id:'NAEK601'},{name:'전주',id:'NAEK602'},{name:'서울경부',id:'NAEK010'}];
 assert.equal(findUniqueTerminal(list,'전주'),null);
 assert.equal(findUniqueTerminal(list,'전주터미널'),null);
 assert.equal(findUniqueTerminal(list,'서울경부')?.id,'NAEK010');
});


test('전주만이 아니라 모든 지역의 동명이름은 공통 규칙으로 묶는다',()=>{
 const names=[
  {name:'경주',id:'NAEK815'},{name:'경주',id:'NAEK894'},
  {name:'진주',id:'JINJU1'},{name:'진주',id:'JINJU2'},
  {name:'부산',id:'BUSAN1'},{name:'전주',id:'NAEK601'},
 ];
 const groups=groupTerminalNames(names);
 assert.equal(groups.length,4);
 assert.deepEqual(groups.find(g=>g.name==='경주').terminals.map(t=>t.id),['NAEK815','NAEK894']);
 assert.deepEqual(groups.find(g=>g.name==='진주').terminals.map(t=>t.id),['JINJU1','JINJU2']);
 assert.equal(findUniqueTerminal(names,'경주'),null);
 assert.equal(findUniqueTerminal(names,'부산')?.id,'BUSAN1');
});