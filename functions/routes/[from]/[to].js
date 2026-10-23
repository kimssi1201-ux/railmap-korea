import {stationById,routeDetailHtml} from '../../../station-pages.js';
export function onRequestGet({params}){
 const page=routeDetailHtml(stationById(params.from),stationById(params.to));
 if(!page)return new Response('등록된 구간 페이지가 없습니다.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex'}});
 return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=3600'}});
}