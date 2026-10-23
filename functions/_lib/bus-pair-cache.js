// Reuse identical TAGO bus departure/arrival/date responses across overlapping
// same-name terminal groups, without exposing credentials or missing routes.
export async function cachedBusPair({cache,requestUrl,type,from,to,date,load}) {
  if(typeof load!=='function')throw new TypeError('load callback required');
  if(!cache)return load();
  const keyUrl=new URL('/api/_bus-pair-cache',requestUrl);
  for(const [k,v] of Object.entries({type,from,to,date}))keyUrl.searchParams.set(k,v);
  const cacheKey=new Request(keyUrl.toString());
  try{
    const cached=await cache.match(cacheKey);
    if(cached?.ok){
      const obj=await cached.json();
      if(obj&&Array.isArray(obj.items)&&Number.isFinite(obj.totalCount))return obj;
    }
  }catch{/* A damaged cache must never turn a valid query into an error. */}
  const data=await load();
  if(data&&Array.isArray(data.items)&&Number.isFinite(data.totalCount)){
    try{
      const response=new Response(JSON.stringify({items:data.items,totalCount:data.totalCount}),{
        headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public,max-age=120,s-maxage=120'}
      });
      await cache.put(cacheKey,response);
    }catch{/* Provider data remains usable even when cache is unavailable. */}
  }
  return data;
}