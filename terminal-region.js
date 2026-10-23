// Regional browse is a supplementary view over the existing official TAGO
// terminal-name list. TAGO terminal endpoints do not supply verified addresses;
// do not invent a location for names we cannot identify safely.
export const REGION_NAMES=Object.freeze([
  '서울','부산','대구','인천','광주','대전','울산','세종',
  '경기','강원','충북','충남','전북','전남','경북','경남','제주'
]);

const TOWNS=Object.freeze({
  경기:'수원 용인 성남 고양 화성 평택 안산 안양 부천 남양주 의정부 시흥 파주 김포 광명 군포 하남 오산 이천 안성 양주 구리 포천 의왕 여주 동두천 과천 가평 양평 연천'.split(' '),
  강원:'춘천 원주 강릉 속초 동해 태백 삼척 홍천 횡성 영월 평창 정선 철원 화천 양구 인제 양양'.split(' '),
  충북:'청주 충주 제천 보은 옥천 영동 증평 진천 괴산 음성 단양'.split(' '),
  충남:'천안 공주 보령 아산 서산 논산 계룡 당진 금산 부여 서천 청양 홍성 예산 태안'.split(' '),
  전북:'전주 군산 익산 정읍 남원 김제 완주 진안 무주 장수 임실 순창 고창 부안'.split(' '),
  전남:'목포 여수 순천 나주 광양 담양 곡성 구례 고흥 보성 화순 장흥 강진 해남 영암 무안 함평 영광 장성 완도 진도 신안'.split(' '),
  경북:'포항 경주 김천 안동 구미 영주 영천 상주 문경 경산 의성 청송 영양 영덕 청도 고령 성주 칠곡 예천 봉화 울진 울릉'.split(' '),
  경남:'창원 진주 통영 사천 김해 밀양 거제 양산 의령 함안 창녕 남해 하동 산청 함양 거창 합천'.split(' '),
  제주:'제주 서귀포'.split(' ')
});
const METRO=[
  ['서울','서울'],['부산','부산'],['대구','대구'],['인천','인천'],
  ['광주','광주'],['대전','대전'],['울산','울산'],['세종','세종']
];
const SPECIAL=[
  // Seoul bus terminals are commonly listed without the city prefix.
  ['동서울','서울','서울'],['센트럴시티','서울','서울'],['상봉','서울','서울'],
  ['김포공항','서울','서울'],['서울남부','서울','서울'],
  // Regional station aliases require explicit, geographically identifiable names.
  ['인천공항','인천','인천'],['인천국제공항','인천','인천'],
  ['부산서부','부산','부산'],['서부산','부산','부산'],['사상','부산','부산'],
  ['노포','부산','부산'],['해운대','부산','부산'],['김해공항','부산','부산'],
  ['서대구','대구','대구'],['유성','대전','대전'],['조치원','세종','세종'],
  ['오송','충북','청주'],['진해','경남','창원'],['마산','경남','창원'],
  ['제주공항','제주','제주'],
  ['경기광주','경기','광주'],['경기도광주','경기','광주'],
  ['강원고성','강원','고성'],['경남고성','경남','고성']
];
const clean=s=>String(s??'').normalize('NFKC').replace(/[\s·._-]/g,'').trim();
const record=(region,city)=>({region,city});

export function classifyTerminalRegion(name){
  const raw=String(name??'').normalize('NFKC').trim();
  if(!raw)return null;
  const compact=clean(raw);
  // The exact name '광주' points to Gwangju Metropolitan City, NOT Gyeonggi-do.
  // Separate Gyeonggi labels are needed to disambiguate the latter.
  if(/^광주\((?:경기|경기도)\)/.test(compact))return record('경기','광주');
  if(/^고성\((?:강원|강원도)\)/.test(compact))return record('강원','고성');
  if(/^고성\((?:경남|경상남도)\)/.test(compact))return record('경남','고성');
  for(const [prefix,region,city] of SPECIAL)if(compact.startsWith(prefix))return record(region,city);
  for(const [prefix,region] of METRO)if(compact.startsWith(prefix))return record(region,region);
  let best=null;
  for(const [region,towns] of Object.entries(TOWNS)){
    for(const city of towns){
      if(!compact.startsWith(city))continue;
      if(best&&best.city.length>=city.length)continue;
      best=record(region,city);
    }
  }
  if(best)return best;
  // Names such as '대한리무진(전주)' may identify the municipality at the end.
  const inParens=raw.match(/\(([^)]+)\)\s*$/u)?.[1];
  if(inParens){
    const exact=clean(inParens);
    if(exact==='경기광주')return record('경기','광주');
    for(const [prefix,region] of METRO)if(exact===prefix)return record(region,region);
    for(const [region,towns] of Object.entries(TOWNS))if(towns.includes(exact))return record(region,exact);
  }
  // Example: unqualified '고성' can mean one of two provinces. Never guess.
  return null;
}

// Takes groupTerminalNames() output: [{name,terminals: [{id,name}, ...]}].
// Every name appears once and every official code is retained on the group.
export function buildTerminalRegionDirectory(groups){
  const regions=new Map(REGION_NAMES.map(name=>[name,new Map()]));
  const unclassified=[];
  let classified=0;
  for(const group of Array.isArray(groups)?groups:[]){
    if(!group?.name||!Array.isArray(group.terminals)||!group.terminals.length)continue;
    const place=classifyTerminalRegion(group.name);
    if(!place){unclassified.push(group);continue;}
    const cities=regions.get(place.region);
    if(!cities){unclassified.push(group);continue;}
    if(!cities.has(place.city))cities.set(place.city,[]);
    cities.get(place.city).push(group);
    classified++;
  }
  const byRegion=REGION_NAMES.map(region=>({
    name:region,
    cities:[...regions.get(region)].map(([name,terminals])=>({
      name,terminals:terminals.sort((a,b)=>a.name.localeCompare(b.name,'ko'))
    })).sort((a,b)=>a.name.localeCompare(b.name,'ko'))
  })).map(region=>({...region,count:region.cities.reduce((sum,city)=>sum+city.terminals.length,0)}));
  return {regions:byRegion,classified,unclassified:unclassified.sort((a,b)=>a.name.localeCompare(b.name,'ko'))};
}