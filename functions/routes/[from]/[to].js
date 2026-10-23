import {stationById,routeDetailHtml} from '../../../station-pages.js';
import {getCachedStationList} from '../../api/stations.js';
function notFound(){return new Response('조회 가능한 역 또는 구간이 아닙니다.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'}})}
function htmlResponse(html){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=600'}})}
export function onRequestGet({params,env,request}){
 const a=String(params.from||''),b=String(params.to||'');
 if(!/^[A-Za-z0-9_-]{4,30}$/.test(a)||!/^[A-Za-z0-9_-]{4,30}$/.test(b)||a===b)return notFound();
 const curated=routeDetailHtml(stationById(a),stationById(b));
 if(curated)return htmlResponse(curated);
 if(!env||!request)return notFound();
 return (async()=>{try{
  const data=await getCachedStationList(env,request),from=data.stations.find(s=>s.id===a),to=data.stations.find(s=>s.id===b);
  const page=from&&to?routeDetailHtml(from,to,{allowVerifiedPair:true}):null;
  return page?htmlResponse(page):notFound();
 }catch{return new Response('공식 역 목록을 확인할 수 없습니다. 나중에 다시 조회해 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}})();
}