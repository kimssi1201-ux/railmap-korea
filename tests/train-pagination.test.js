import test from 'node:test';
import assert from 'node:assert/strict';
import {collectTrainPages} from '../functions/_lib/train-pagination.js';
test('fetches every page without discarding later results', async()=>{
 const pages=[];
 const got=await collectTrainPages(async({pageNo,numOfRows})=>{pages.push([pageNo,numOfRows]);return {items:pageNo===1?[1,2]:[3],totalCount:3}}, {pageSize:2,maxPages:4});
 assert.deepEqual(got.items,[1,2,3]); assert.deepEqual(pages,[[1,2],[2,2]]); assert.equal(got.partial,false);
});
test('later page API failure keeps official first page, flags partial', async()=>{
 const got=await collectTrainPages(async({pageNo})=>{if(pageNo===2)throw Error('timeout');return {items:[1,2],totalCount:4}}, {pageSize:2});
 assert.deepEqual(got.items,[1,2]);assert.equal(got.partial,true);
});
test('first page failure is not converted to false zero results', async()=>{
 await assert.rejects(collectTrainPages(async()=>{throw Error('auth failed')}),/auth failed/);
});
test('maximum page limit signals incomplete data', async()=>{
 const got=await collectTrainPages(async({pageNo})=>({items:[pageNo],totalCount:5}),{pageSize:1,maxPages:2});
 assert.deepEqual(got.items,[1,2]);assert.equal(got.partial,true);
});
test('empty and invalid bounds',async()=>{
 const got=await collectTrainPages(async()=>({items:[],totalCount:0}));assert.equal(got.items.length,0);assert.equal(got.partial,false);
 await assert.rejects(collectTrainPages(async()=>({}),{pageSize:0}),RangeError);
});