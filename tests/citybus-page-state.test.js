import test from 'node:test';import assert from 'node:assert/strict';
import {hasMoreCitybusPages} from '../citybus-page-state.js';
test('API reports another page even when current page has zero matches',()=>{
 assert.equal(hasMoreCitybusPages({partial:true,items:[]},1),true);
 assert.equal(hasMoreCitybusPages({partial:true,items:[]},29),true);
});
test('does not propose next beyond final page or complete result',()=>{
 assert.equal(hasMoreCitybusPages({partial:true},30),false);
 assert.equal(hasMoreCitybusPages({partial:false},1),false);
 assert.equal(hasMoreCitybusPages(null,1),false);
});