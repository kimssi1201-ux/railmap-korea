import test from 'node:test';
import assert from 'node:assert/strict';
import {cachedBusPair} from '../functions/_lib/bus-pair-cache.js';
const args={requestUrl:'https://railmap.example/api/bus-timetables',type:'intercity',from:'ABC100',to:'XYZ200',date:'2026-10-23'};
function fakeCache(){const memory=new Map();return {memory,async match(req){return memory.get(req.url)?.clone()||null},async put(req,res){memory.set(req.url,res.clone())}}}
test('reuses successful official per-pair response without additional provider call',async()=>{
 const cache=fakeCache();let calls=0;const load=async()=>{calls++;return {items:[{depplandtime:'20261023123000'}],totalCount:1}};
 const first=await cachedBusPair({...args,cache,load});const next=await cachedBusPair({...args,cache,load});
 assert.deepEqual(first,next);assert.equal(calls,1);assert.equal(cache.memory.size,1);
});
test('separates dates and destination IDs',async()=>{
 const cache=fakeCache();let count=0;const load=async()=>{count++;return {items:[],totalCount:0}};
 await cachedBusPair({...args,cache,load});await cachedBusPair({...args,to:'XYZ201',cache,load});await cachedBusPair({...args,date:'2026-10-24',cache,load});assert.equal(count,3);
});
test('cache failure does not suppress upstream rows',async()=>{
 const cache={match:async()=>{throw Error('bad cache')},put:async()=>{throw Error('full')}};
 const result=await cachedBusPair({...args,cache,load:async()=>({items:[{trainNo:2}],totalCount:1})});assert.equal(result.items.length,1);
});
test('does not include authentication in cache key',async()=>{
 const cache=fakeCache();await cachedBusPair({...args,cache,load:async()=>({items:[],totalCount:0})});const key=[...cache.memory.keys()][0];assert.ok(!key.includes('serviceKey'));assert.ok(!key.includes('secret'));
});