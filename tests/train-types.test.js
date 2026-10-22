import test from 'node:test';
import assert from 'node:assert/strict';
import {trainCategory, matchesTrainFilter} from '../train-types.js';

test('고속철도 명칭: KTX와 산천·이음·청룡 및 SRT', () => {
  for (const name of ['KTX', 'KTX-산천', 'KTX-이음', 'KTX-청룡']) {
    assert.equal(trainCategory(name), 'KTX', name);
    assert.equal(matchesTrainFilter(name, 'KTX'), true, name);
  }
  assert.equal(trainCategory('SRT'), 'SRT');
  assert.equal(matchesTrainFilter('SRT', '일반'), false);
});

test('ITX·새마을·무궁화·누리로·통근은 일반열차 선택에 포함', () => {
  for (const name of ['ITX-새마을', 'ITX-마음', 'ITX-청춘', '새마을호', '무궁화호', '누리로', '통근열차']) {
    assert.equal(trainCategory(name), '일반', name);
    assert.equal(matchesTrainFilter(name, '일반'), true, name);
  }
});

test('종류가 확인되지 않은 열차나 관광 열차는 일반열차로 단정하지 않는다', () => {
  for (const name of ['', null, '관광열차', '알수없는열차']) {
    assert.equal(trainCategory(name), '기타');
    assert.equal(matchesTrainFilter(name, '일반'), false);
    assert.equal(matchesTrainFilter(name, '전체'), true);
  }
});