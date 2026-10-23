const section=document.getElementById('spDestinationPicker');
if(section){
 const from=section.dataset.station,select=document.getElementById('spDestinationSelect');
 const button=document.getElementById('spDestinationGo'),hint=document.getElementById('spDestinationHint');
 const disabled=message=>{hint.textContent=message;button.disabled=true};
 select.addEventListener('change',()=>{button.disabled=!select.value||select.value===from});
 button.addEventListener('click',()=>{if(!select.value||select.value===from)return;location.href='/routes/'+encodeURIComponent(from)+'/'+encodeURIComponent(select.value)});
 fetch('/api/stations?v=nationwide-regions-v1',{headers:{Accept:'application/json'}}).then(async res=>{const data=await res.json();if(!res.ok||!data.ok||!Array.isArray(data.stations))throw Error(data.error||'목적지를 불러오지 못했습니다.');
  if(!data.stations.some(s=>s.id===from))throw Error('해당 역을 공식 목록에서 확인하지 못했습니다.');
  const options=data.stations.filter(s=>s.id&&s.name&&s.id!==from).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  select.replaceChildren();const placeholder=document.createElement('option');placeholder.textContent='목적지 역을 선택하세요';placeholder.value='';select.append(placeholder);
  for(const station of options){const opt=document.createElement('option');opt.value=station.id;opt.textContent=station.name.endsWith('역')?station.name:station.name+'역';select.append(opt)}
  select.disabled=false;hint.textContent=`선택 가능한 공식 역 ${options.length}곳 · 직통 여부는 시간표 조회 후 확인`;
 }).catch(e=>disabled(e.message+' 메인 기차 검색도 이용해 주세요.'));
}