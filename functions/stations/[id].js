import {stationById,stationDetailHtml} from '../../station-pages.js';
import {getCachedStationList} from '../api/stations.js';
function notFound(){return new Response('공식 역 목록에 없는 역입니다.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'}})}
function htmlResponse(station){return new Response(stationDetailHtml(station),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=600'}})}
export function onRequestGet({params,env,request}){
 const id=String(params.id||'');if(!/^[A-Za-z0-9_-]{4,30}$/.test(id))return notFound();
 const featured=stationById(id);if(featured)return htmlResponse(featured);
 if(!env||!request)return notFound();
 return (async()=>{try{
  const data=await getCachedStationList(env,request);const station=data.stations.find(st=>st.id===id);
  return station?htmlResponse({...station,region:station.region||'지역 확인 필요'}):notFound();
 }catch{return new Response('공식 역 목록을 확인할 수 없습니다. 나중에 다시 조회해 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}})();
}