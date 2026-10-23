import test from 'node:test';
import assert from 'node:assert/strict';
import {callTago,DataError} from '../functions/_lib/tago.js';
const ok=(count=1)=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:count,items:{item:{trainno:'123'}}}}});
test('TAGO transient connection failure retries once and recovers',async()=>{
 let attempts=0;const result=await callTago({TAGO_API_KEY:'TEST'},'GetStrtpntAlocFndTrainInfo',{},async()=>{attempts++;if(attempts===1)throw Error('temporary');return ok()});
 assert.equal(attempts,2);assert.equal(result.items[0].trainno,'123');
});
test('TAGO HTTP 503 retries once',async()=>{
 let attempts=0;const result=await callTago({TAGO_API_KEY:'TEST'},'GetCtyCodeList',{},async()=>++attempts===1?new Response('bad gateway',{status:503}):ok(1));
 assert.equal(attempts,2);assert.equal(result.totalCount,1);
});
test('TAGO application timeout code 05 retries once',async()=>{
 let attempts=0;const result=await callTago({TAGO_API_KEY:'TEST'},'GetCtyCodeList',{},async()=>++attempts===1?Response.json({response:{header:{resultCode:'05',resultMsg:'SERVICETIMEOUT_ERROR'}}}):ok());
 assert.equal(result.items.length,1);assert.equal(attempts,2);
});
test('TAGO auth error and service key missing never retry',async()=>{
 let attempts=0;await assert.rejects(()=>callTago({TAGO_API_KEY:'TEST'},'GetCtyCodeList',{},async()=>{attempts++;return new Response('',{status:403})}),e=>e instanceof DataError&&e.status===503);
 assert.equal(attempts,1);
 await assert.rejects(()=>callTago({},'GetCtyCodeList',{},async()=>{attempts++}),DataError);assert.equal(attempts,1);
});
test('TAGO repeated fetch failure returns explanatory 503 without exposing key',async()=>{
 let attempts=0;
 await assert.rejects(()=>callTago({TAGO_API_KEY:'SECRET-KEY'},'GetCtyCodeList',{},async()=>{attempts++;throw Error('no network')}),e=>e instanceof DataError&&e.status===503&&/두 차례/.test(e.message)&&!e.message.includes('SECRET'));
 assert.equal(attempts,2);
});
