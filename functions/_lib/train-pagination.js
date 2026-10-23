// Collect official timetable pages without fabricating or suppressing results.
// A later-page upstream failure returns verified earlier data with partial:true;
// the first-page failure still propagates to the API caller.
export async function collectTrainPages(fetchPage, {pageSize=300, maxPages=5}={}) {
  if(typeof fetchPage!=='function')throw new TypeError('fetchPage must be a function');
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000||!Number.isInteger(maxPages)||maxPages<1||maxPages>10)throw new RangeError('Invalid pagination bounds');
  const entries=[];
  let totalCount=0;
  let partial=false;
  let pages=0;
  for(let pageNo=1;pageNo<=maxPages;pageNo++){
    let result;
    try{result=await fetchPage({numOfRows:pageSize,pageNo})}
    catch(e){if(pageNo===1)throw e;partial=true;break}
    pages++;
    const chunk=Array.isArray(result?.items)?result.items:[];
    const reported=Number(result?.totalCount);
    if(Number.isFinite(reported)&&reported>=0)totalCount=Math.max(totalCount,reported);
    entries.push(...chunk);
    if(chunk.length===0)break;
    if(totalCount>0&&pageNo*pageSize>=totalCount)break;
    // If total count is absent, full pages may mean additional results.
    if(totalCount===0&&chunk.length<pageSize)break;
    if(pageNo===maxPages)partial=true;
  }
  if(totalCount>entries.length)partial=true;
  return {items:entries,totalCount,partial,pages};
}