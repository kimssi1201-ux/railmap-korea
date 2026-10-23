export const TAGO_BASE = 'https://apis.data.go.kr/1613000/TrainInfo';
export class DataError extends Error {constructor(message,status=502){super(message);this.status=status}}
export function normalizeItems(data){const item=data?.response?.body?.items?.item;return Array.isArray(item)?item:item&&typeof item==='object'?[item]:[]}
export function resolveServiceKey(env){const raw=env.TAGO_API_KEY||'';if(!raw)throw new DataError('공식 열차정보 API가 아직 연결되지 않았습니다. 운영자가 TAGO_API_KEY를 설정해야 합니다.',503);try{return decodeURIComponent(raw)}catch{return raw}}
// Retry transient provider network/timeout failures once, never authentication errors.
// The endpoint and service key stay on the server.
export async function callTago(env,operation,parameters={},fetchFn=fetch){
 const allowed=['GetCtyCodeList','GetCtyAcctoTrainSttnList','GetStrtpntAlocFndTrainInfo'];
 if(!allowed.includes(operation))throw new DataError('지원하지 않는 API 요청입니다.',400);
 const key=resolveServiceKey(env),url=new URL(TAGO_BASE+'/'+operation);
 url.searchParams.set('serviceKey',key);url.searchParams.set('_type','json');
 url.searchParams.set('numOfRows','300');url.searchParams.set('pageNo','1');
 for(const [k,v] of Object.entries(parameters))if(v!==undefined&&v!==null)url.searchParams.set(k,String(v));
 for(let attempt=0;attempt<2;attempt++){
  let res;
  try{
   res=await fetchFn(url.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  }catch{
   if(attempt===0)continue;
   throw new DataError('공식 열차정보 서버 연결이 지연되거나 차단되었습니다. 두 차례 조회에 실패했습니다. 잠시 후 재조회하거나 공식 예매처를 확인해 주세요.',503);
  }
  if(!res.ok){
   if(attempt===0&&[502,503,504].includes(res.status))continue;
   if(res.status===401||res.status===403)throw new DataError('열차정보 API 접근이 거부되었습니다. 인증키의 활용승인 상태를 확인해 주세요.',503);
   throw new DataError('공공데이터 열차정보 서버 HTTP '+res.status+' 오류입니다.','502'===String(res.status)?503:502);
  }
  let data;
  try{data=await res.json()}
  catch{
   if(attempt===0)continue;
   throw new DataError('열차정보 서버가 두 차례 유효한 JSON 응답을 보내지 않았습니다. 공공데이터 제공 상태를 확인해 주세요.',502);
  }
  const code=String(data?.response?.header?.resultCode??'');
  if(code&&!['00','0','INFO-000'].includes(code)){
   if(attempt===0&&code==='05')continue;
   throw new DataError('공공데이터 조회 오류: '+String(data?.response?.header?.resultMsg||code),code==='05'?503:502);
  }
  return {items:normalizeItems(data),totalCount:Number(data?.response?.body?.totalCount||0)};
 }
 throw new DataError('열차정보 서버 응답을 받을 수 없습니다.',503);
}
export function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
export function cleanStation(s){return {name:String(s.nodename||s.stationname||s.sttnNm||'').trim(),id:String(s.nodeid||s.stationid||'').trim()}}
export function cleanTrain(t){const charge=Number(t.adultcharge);return {grade:String(t.traingradename||t.trainGradeName||'').trim(),trainNo:String(t.trainno||'').trim(),fromName:String(t.depplacename||'').trim(),toName:String(t.arrplacename||'').trim(),depTime:String(t.depplandtime||'').trim(),arrTime:String(t.arrplandtime||'').trim(),adultFare:Number.isFinite(charge)&&charge>0?charge:null,boarding:{platformNo:null,source:null,checkedAt:null}}}
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().startsWith(s)}
export function withinWindow(date,days=31,now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const today=Date.UTC(+p.year,+p.month-1,+p.day);const diff=(Date.parse(date+'T00:00:00Z')-today)/86400000;return Number.isInteger(diff)&&diff>=0&&diff<=days}