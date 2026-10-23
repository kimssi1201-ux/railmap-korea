// Regional labels are inferred only from TAGO's official city names/codes.
// A missing or unfamiliar location is left unclassified, never guessed from a station name.
export const RAIL_PROVINCES=Object.freeze(['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']);
export const TAGO_CITY_PROVINCES=Object.freeze({'11':'서울','21':'부산','22':'대구','23':'인천','24':'광주','25':'대전','26':'울산','29':'세종','31':'경기','32':'강원','33':'충북','34':'충남','35':'전북','36':'전남','37':'경북','38':'경남','39':'제주'});
export function provinceFromTagoCity(name,cityCode=''){
 const city=String(name??'').normalize('NFKC').replace(/\s+/g,'').trim();
 const prefix=[['서울','서울'],['부산','부산'],['대구','대구'],['인천','인천'],['광주','광주'],['대전','대전'],['울산','울산'],['세종','세종'],['경기','경기'],['강원','강원'],['충청북','충북'],['충북','충북'],['충청남','충남'],['충남','충남'],['전라북','전북'],['전북','전북'],['전라남','전남'],['전남','전남'],['경상북','경북'],['경북','경북'],['경상남','경남'],['경남','경남'],['제주','제주']];
 return prefix.find(([prefix])=>city.startsWith(prefix))?.[1]||TAGO_CITY_PROVINCES[String(cityCode)]||null;
}
export function categorizedStations(stations){
 const groups=Object.fromEntries(RAIL_PROVINCES.map(p=>[p,[]]));groups['지역 확인 필요']=[];
 const byId=new Set();
 for(const station of Array.isArray(stations)?stations:[]){
  if(!station?.id||!station?.name||byId.has(station.id))continue;
  byId.add(station.id);
  const region=RAIL_PROVINCES.includes(station.region)?station.region:'지역 확인 필요';
  groups[region].push(station);
 }
 for(const group of Object.values(groups))group.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 return groups;
}