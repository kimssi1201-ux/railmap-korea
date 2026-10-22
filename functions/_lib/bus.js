import {DataError,normalizeItems,resolveServiceKey,validDate,withinWindow} from './tago.js';

const SERVICES = Object.freeze({
 express:{base:'https://apis.data.go.kr/1613000/ExpBusInfo',terminalOp:'GetExpBusTrminlList',scheduleOp:'GetStrtpntAlocFndExpbusInfo',secret:'EXPBUS_API_KEY'},
 intercity:{base:'https://apis.data.go.kr/1613000/SuburbsBusInfo',terminalOp:'GetSuberbsBusTrminlList',scheduleOp:'GetStrtpntAlocFndSuberbsBusInfo',secret:'SUBURBSBUS_API_KEY'}
});
export function busConfig(type){if(!Object.hasOwn(SERVICES,type))throw new DataError('버스 종류가 올바르지 않습니다.',400);return SERVICES[type]}
export function checkBusDate(type,date,now=new Date()){
 busConfig(type);
 if(!validDate(date))throw new DataError('날짜 형식이 올바르지 않습니다.',400);
 if(type==='intercity'&&!withinWindow(date,0,now))throw new DataError('시외버스 공공데이터는 현재 당일 배차만 제공합니다. 오늘 날짜를 선택해 주세요.',400);
 if(type==='express'&&!withinWindow(date,31,now))throw new DataError('오늘부터 31일 이내 날짜를 선택해 주세요.',400);
}
export function resolveBusKey(env,type){const conf=busConfig(type);return resolveServiceKey({TAGO_API_KEY:env?.[conf.secret]||env?.TAGO_API_KEY||''})}
export async function callBus(env,type,operation,params={},fetchFn=fetch){
 const conf=busConfig(type);
 if(![conf.terminalOp,conf.scheduleOp].includes(operation))throw new DataError('지원하지 않는 버스 API 요청입니다.',400);
 const key=resolveBusKey(env,type);
 const url=new URL(`${conf.base}/${operation}`);
 url.searchParams.set('serviceKey',key);
 url.searchParams.set('_type','json');
 url.searchParams.set('pageNo','1');
 url.searchParams.set('numOfRows','200');
 for(const [name,value] of Object.entries(params))if(value!==null&&value!==undefined)url.searchParams.set(name,String(value));
 let response;
 try{response=await fetchFn(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)})}
 catch{throw new DataError('버스 공공데이터 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',503)}
 if(!response.ok)throw new DataError(`버스 공공데이터 요청 실패 (HTTP ${response.status})`,502);
 let data;
 try{data=await response.json()}catch{throw new DataError('버스 API 응답이 JSON이 아닙니다. 인증키와 사용 승인을 확인해 주세요.',502)}
 const code=String(data?.response?.header?.resultCode??'');
 if(code&&!['00','0','INFO-000'].includes(code))throw new DataError('버스 API 오류: '+String(data?.response?.header?.resultMsg||code),502);
 return {items:normalizeItems(data),totalCount:Number(data?.response?.body?.totalCount||0)};
}
export function cleanTerminal(raw){
 return {id:String(raw.terminalid??raw.terminalId??'').trim(),name:String(raw.terminalnm??raw.terminalNm??raw.terminalname??'').trim()};
}
export function cleanBus(raw){
 const fareValue=raw.adultcharge??raw.adultCharge??null;
 const fare=fareValue===null||fareValue===''?null:Number(fareValue);
 return {
  departure:String(raw.depplandtime??raw.depPlandTime??'').trim(),
  arrival:String(raw.arrplandtime??raw.arrPlandTime??'').trim(),
  departureName:String(raw.depplacename??raw.depPlaceName??'').trim(),
  arrivalName:String(raw.arrplacename??raw.arrPlaceName??'').trim(),
  grade:String(raw.gradename??raw.gradeNm??raw.busgradename??raw.busGradeName??'').trim(),
  adultFare:Number.isFinite(fare)&&fare>0?fare:null,
  routeId:String(raw.routeid??raw.routeId??'').trim()
 };
}
export function validTerminalId(value){return /^[A-Za-z0-9_-]{2,35}$/.test(String(value||''))}