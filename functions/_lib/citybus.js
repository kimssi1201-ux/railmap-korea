import {DataError, normalizeItems, resolveServiceKey, json} from './tago.js';

// Government TAGO endpoints; values are checked against the public API operation guides.
export const CITYBUS_SERVICES=Object.freeze({
  areas:{root:'BusSttnInfoInqireService',operation:'getCtyCodeList',secret:'CITYBUS_STOPS_API_KEY'},
  stops:{root:'BusSttnInfoInqireService',operation:'getSttnNoList',secret:'CITYBUS_STOPS_API_KEY'},
  routes:{root:'BusRouteInfoInqireService',operation:'getRouteNoList',secret:'CITYBUS_ROUTES_API_KEY'},
  routeStops:{root:'BusRouteInfoInqireService',operation:'getRouteAcctoThrghSttnList',secret:'CITYBUS_ROUTES_API_KEY'},
  arrivals:{root:'ArvlInfoInqireService',operation:'getSttnAcctoArvlPrearngeInfoList',secret:'CITYBUS_ARRIVALS_API_KEY'}
});

export function resolveCitybusKey(env,service){
  const s=CITYBUS_SERVICES[service];if(!s)throw new DataError('지원하지 않는 시내버스 API입니다.',400);
  return resolveServiceKey({TAGO_API_KEY:env?.[s.secret]||env?.CITYBUS_API_KEY||env?.TAGO_API_KEY||''});
}
export function assertCityCode(city){if(!/^\d{1,7}$/.test(String(city||'')))throw new DataError('지역을 먼저 선택해 주세요.',400);return String(city)}
export function assertNodeId(id){if(!/^[a-zA-Z0-9_-]{2,35}$/.test(String(id||'')))throw new DataError('정류장 ID가 올바르지 않습니다.',400);return String(id)}
export function assertRouteId(id){return assertNodeId(id)}
export function assertTerm(q){const term=String(q||'').trim().normalize('NFC');if(term.length<1||term.length>40||/[<>]/.test(term))throw new DataError('검색어를 1~40자로 입력해 주세요.',400);return term}
export function assertPage(page){const n=Number(page||1);if(!Number.isInteger(n)||n<1||n>30)throw new DataError('페이지 번호가 올바르지 않습니다.',400);return n}
export async function callCitybus(env,service,params={},fetcher=fetch){
  const cfg=CITYBUS_SERVICES[service];if(!cfg)throw new DataError('지원하지 않는 시내버스 API입니다.',400);
  const key=resolveCitybusKey(env,service);
  const u=new URL(`https://apis.data.go.kr/1613000/${cfg.root}/${cfg.operation}`);
  u.searchParams.set('serviceKey',key);u.searchParams.set('_type','json');u.searchParams.set('numOfRows','100');u.searchParams.set('pageNo','1');
  for(const [k,v] of Object.entries(params))if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));
  let response;
  try{response=await fetcher(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)})}
  catch{throw new DataError('시내버스 공공데이터 서버에 연결하지 못했습니다.',503)}
  if(!response.ok)throw new DataError(`시내버스 API HTTP ${response.status} 오류입니다.`,502);
  let data;try{data=await response.json()}catch{throw new DataError('시내버스 응답이 JSON이 아닙니다. API 활용신청 및 인증키를 확인해 주세요.',502)}
  const code=String(data?.response?.header?.resultCode??'');
  if(code&&!['00','0','INFO-000'].includes(code))throw new DataError('시내버스 API 오류: '+String(data?.response?.header?.resultMsg||code),502);
  return {items:normalizeItems(data),totalCount:Number(data?.response?.body?.totalCount||0)};
}
export const cleanCity=x=>({id:String(x.citycode??x.cityCode??'').trim(),name:String(x.cityname??x.cityName??'').trim()});
export function cleanStop(x){return {id:String(x.nodeid??x.nodeId??'').trim(),name:String(x.nodenm??x.nodeNm??'').trim(),number:String(x.nodeno??x.nodeNo??'').trim(),lat:x.gpslati!=null&&x.gpslati!==''&&Number.isFinite(Number(x.gpslati))?Number(x.gpslati):null,lng:x.gpslong!=null&&x.gpslong!==''&&Number.isFinite(Number(x.gpslong))?Number(x.gpslong):null}}
export const cleanRoute=x=>({id:String(x.routeid??x.routeId??'').trim(),number:String(x.routeno??x.routeNo??'').trim(),type:String(x.routetp??x.routeTp??'').trim()});
export function cleanRouteStop(x){return {id:String(x.nodeid??x.nodeId??'').trim(),name:String(x.nodenm??x.nodeNm??'').trim(),order:Number(x.nodeord??x.nodeOrd??0)||null,number:String(x.nodeno??x.nodeNo??'').trim()}}
export function cleanArrival(x){
  const sec=Number(x.arrtime??x.arrTime);const left=Number(x.arrprevstationcnt??x.arrPrevStationCnt);
  return {routeId:String(x.routeid??x.routeId??'').trim(),number:String(x.routeno??x.routeNo??'').trim(),routeType:String(x.routetp??x.routeTp??'').trim(),vehicleType:String(x.vehicletp??x.vehicleTp??'').trim(),etaSeconds:x.arrtime!=null&&x.arrtime!==''&&Number.isFinite(sec)&&sec>=0?Math.round(sec):null,stopsLeft:x.arrprevstationcnt!=null&&x.arrprevstationcnt!==''&&Number.isFinite(left)&&left>=0?Math.round(left):null};
}
export function send(body,status=200,maxAge=0){return json(body,status,maxAge?{'Cache-Control':`public,max-age=${maxAge},s-maxage=${maxAge}`}:{'Cache-Control':'no-store'})}
export async function cachedPublic(request,cacheSlug,maxAge,load){
  const cache=typeof caches!=='undefined'?caches.default:null;
  const cacheKey=new Request(new URL(cacheSlug,request.url).toString());
  if(cache){const hit=await cache.match(cacheKey);if(hit)return hit}
  const response=await load();if(cache&&response.ok)await cache.put(cacheKey,response.clone());
  return response;
}