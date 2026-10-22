import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanTrain} from '../functions/_lib/tago.js';
import {onRequestGet as getTrains} from '../functions/api/trains.js';

test('TAGO 시간표만으로는 승강장 번호를 제공하지 않음',()=>{
  const sample=cleanTrain({traingradename:'KTX',trainno:'123',depplandtime:20261022200000,arrplandtime:20261022220000,platform:'7',platformNo:'7',adultcharge:'50000'});
  assert.deepEqual(sample.boarding,{platformNo:null,source:null,checkedAt:null});
  assert.equal(sample.trainNo,'123');
});

test('열차 API 결과에서도 임의 승강장 번호를 전달하지 않음',async()=>{
  const orig=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({response:{header:{resultCode:'00'},body:{totalCount:1,items:{item:{traingradename:'KTX',trainno:'123',depplandtime:20261022200000,arrplandtime:20261022220000,platform:'4',platformNo:'4'}}}}});
  try{
    const request=new Request('https://railmap.example/api/trains?from=NAT010000&to=NAT014445&date=2026-10-22');
    const res=await getTrains({env:{TAGO_API_KEY:'test'},request});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.trains.length,1);
    assert.equal(data.trains[0].boarding.platformNo,null);
  }finally{globalThis.fetch=orig}
});