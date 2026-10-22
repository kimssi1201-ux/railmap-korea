import test from 'node:test';
import assert from 'node:assert/strict';
import {isDisplayableTerminal,visibleTerminals} from '../terminal-display.js';

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