import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRailAvailability} from '../route-availability.js';
test('positive validated timetable may be listed',()=>{
 assert.equal(classifyRailAvailability({ok:true,trains:[{depTime:'202610231200'}]}),'confirmed');
});
test('empty complete timetable is excluded from route list',()=>{
 assert.equal(classifyRailAvailability({ok:true,trains:[],partial:false}),'empty');
});
test('failed or partial provider response is not falsely considered no service',()=>{
 assert.equal(classifyRailAvailability({ok:false,error:'connection'}),'unavailable');
 assert.equal(classifyRailAvailability({ok:true,trains:[],partial:true}),'unavailable');
 assert.equal(classifyRailAvailability(null),'unavailable');
});
