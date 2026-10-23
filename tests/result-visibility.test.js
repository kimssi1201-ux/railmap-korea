import test from 'node:test';
import assert from 'node:assert/strict';
import {hasConfirmedSchedule,knownArrivalRows,showCitySearchResults} from '../result-visibility.js';
test('train and coach 0 results do not create an empty timetable',()=>{
 assert.equal(hasConfirmedSchedule([]),false);assert.equal(hasConfirmedSchedule(null),false);
 assert.equal(hasConfirmedSchedule([{departure:'202610231200'}]),true);
});
test('missing city bus ETA values are omitted, not presented as upcoming',()=>{
 const input=[{number:'100',etaSeconds:null},{number:'101',etaSeconds:0},{number:'102',etaSeconds:380},{number:'103',etaSeconds:-1}];
 assert.deepEqual(knownArrivalRows(input).map(x=>x.number),['101','102']);
 assert.equal(knownArrivalRows([]).length,0);
});
test('a 0-match page keeps next-page discovery available',()=>{
 assert.equal(showCitySearchResults([],true),true);
 assert.equal(showCitySearchResults([],false),false);
 assert.equal(showCitySearchResults([{id:'some-stop'}],false),true);
});
