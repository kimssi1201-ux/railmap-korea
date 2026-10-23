import test from 'node:test';
import assert from 'node:assert/strict';
import {timetableTime,timetableFare,timetableDuration,trainTimetableRows,busTimetableRows} from '../timetable-view.js';
test('공식 시간 형식 검증',()=>{assert.equal(timetableTime('202610230705'),'07:05');assert.equal(timetableTime('202610239999'),'—');assert.equal(timetableTime(''),'—')});
test('없는 운임은 미제공 표시',()=>{assert.equal(timetableFare(null),'미제공');assert.equal(timetableFare(0),'미제공');assert.equal(timetableFare(33500),'33,500원')});
test('다음날 도착 소요시간',()=>{assert.equal(timetableDuration('202610232300','202610240115'),'2시간 15분');assert.equal(timetableDuration('202610232300',''),'소요시간 미제공')});
test('기차 열차번호와 종류 보존',()=>{const x=trainTimetableRows([{trainNo:'840',grade:'KTX-이음',depTime:'202610230705',arrTime:'202610230733',adultFare:32000}])[0];assert.deepEqual([x.number,x.grade,x.departure,x.arrival,x.fare],['840','KTX-이음','07:05','07:33','32,000원'])});
test('시외버스 등급·시간 보존',()=>{const x=busTimetableRows([{departure:'202610231210',arrival:'202610231520',grade:'우등',adultFare:null}])[0];assert.deepEqual([x.departure,x.arrival,x.grade,x.fare],['12:10','15:20','우등','미제공'])});
