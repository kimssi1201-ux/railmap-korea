import {categorizedStations,RAIL_PROVINCES} from './station-regions.js';
const area=document.getElementById('spNationwide');
if(area){
 const input=document.getElementById('spStationSearch'),status=document.getElementById('spDirectoryStatus');
 const container=document.getElementById('spDirectoryResults'),more=document.getElementById('spStationMore');
 const chips=[...area.querySelectorAll('[data-province]')];
 const query=new URLSearchParams(location.search).get('region');
 let region=[...RAIL_PROVINCES,'전체','지역 확인 필요'].includes(query)?query:'전체',groups=null,stations=[],limit=45,partial=false;
 const make=(tag,text='',cls='')=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el};
 function render(){
  chips.forEach(b=>{const chosen=b.dataset.province===region;b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));const count=groups?.[b.dataset.province]?.length;b.textContent=(b.dataset.province==='지역 확인 필요'?'미분류':b.dataset.province)+(count===undefined?'':` ${count}`)});
  container.replaceChildren();
  if(!groups){more.hidden=true;return}
  const q=input.value.normalize('NFKC').trim().replace(/\s+/g,'').replace(/역$/,'').toLowerCase();
  const listed=(region==='전체'?stations:(groups[region]||[])).filter(s=>String(s.name).normalize('NFKC').replace(/\s+/g,'').toLowerCase().includes(q));
  status.textContent=`${region==='전체'?'전국':region} ${listed.length}개 역 조회${partial?' · 일부 지역 목록이 누락됐을 수 있습니다.':''}`;
  const fragment=document.createDocumentFragment();
  for(const station of listed.slice(0,limit)){
   const link=make('a','','sp-station-item');link.href='/stations/'+encodeURIComponent(station.id);
   const title=make('strong',station.name.endsWith('역')?station.name:station.name+'역');
   const subtitle=make('small',(station.region||'지역 확인 필요')+' · 역 안내 및 시간표 조회');
   link.append(title,subtitle,make('span','→'));fragment.append(link);
  }
  if(!listed.length)fragment.append(make('p',q?'입력한 역명을 공식 목록에서 찾지 못했습니다.':'해당 지역에서 조회된 기차역이 없습니다.','sp-directory-empty'));
  container.append(fragment);more.hidden=listed.length<=limit;more.textContent=`다음 역 더 보기 (${Math.min(listed.length-limit,45)}곳)`;
 }
 for(const button of chips)button.addEventListener('click',()=>{region=button.dataset.province;limit=45;const url=new URL(location.href);if(region==='전체')url.searchParams.delete('region');else url.searchParams.set('region',region);history.replaceState(null,'',url);render()});
 input.addEventListener('input',()=>{limit=45;render()});
 more.addEventListener('click',()=>{limit+=45;render()});
 fetch('/api/stations?v=nationwide-regions-v1',{headers:{Accept:'application/json'}})
 .then(async res=>{const body=await res.json();if(!res.ok||!body.ok||!Array.isArray(body.stations))throw Error(body.error||'전국 기차역 정보를 가져오지 못했습니다.');groups=categorizedStations(body.stations);stations=Object.values(groups).flat().sort((a,b)=>a.name.localeCompare(b.name,'ko'));partial=!!body.partial;render()})
 .catch(err=>{status.textContent=err.message+' 아래 주요역 바로가기는 계속 이용할 수 있습니다.';more.hidden=true});
}