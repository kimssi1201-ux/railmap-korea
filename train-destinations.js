import {normalizeName} from './station-utils.js';
// Candidate corridors are not promises of direct service. Only dated TAGO rows confirm a destination.
export const RAIL_CORRIDORS=Object.freeze([
 ['판교','부발','가남','감곡장호원','앙성온천','충주','살미','수안보온천','연풍','문경'],
 ['서울','광명','천안아산','오송','대전','김천구미','동대구','경주','울산','부산'],
 ['서울','영등포','수원','평택','천안','조치원','신탄진','대전','옥천','영동','김천','구미','대구','동대구','경산','청도','밀양','삼랑진','구포','부산'],
 ['수서','동탄','평택지제','천안아산','오송','대전','김천구미','동대구','경주','울산','부산'],
 ['용산','광명','천안아산','오송','공주','익산','정읍','광주송정','나주','목포'],
 // 호남선 지선·경전선 참고 경유역 (실제 직통운행은 TAGO API로 검증)
 ['광주','극락강','광주송정'],
 ['광주송정','서광주','효천','화순','능주','이양','명봉','보성','득량','예당','조성','벌교','순천'],
 ['수서','동탄','평택지제','천안아산','오송','공주','익산','정읍','광주송정','나주','목포'],
 ['용산','영등포','수원','천안','조치원','서대전','계룡','논산','강경','익산','김제','정읍','장성','광주송정','나주','목포'],
 ['용산','오송','공주','익산','전주','남원','곡성','구례구','순천','여천','여수엑스포'],
 ['서울','청량리','상봉','양평','서원주','만종','횡성','둔내','평창','진부','강릉'],
 ['청량리','상봉','양평','서원주','만종','횡성','둔내','평창','진부','정동진','묵호','동해'],
 ['청량리','덕소','양평','용문','지평','원주','제천','단양','풍기','영주','안동','의성','영천','경주','태화강','부전'],
 ['서울','청량리','상봉','평내호평','청평','가평','강촌','남춘천','춘천'],
 ['용산','영등포','수원','평택','천안','온양온천','신례원','예산','홍성','광천','대천','장항','군산','익산'],
 ['대전','신탄진','조치원','오송','청주','오근장','증평','음성','주덕','충주','봉양','제천'],
 ['동대구','경산','청도','밀양','진영','창원중앙','창원','마산','함안','진주'],
 ['부전','사상','구포','밀양','진영','창원중앙','창원','마산','함안','진주'],
 ['부전','태화강','북울산','경주','서경주','포항','영덕','강구','울진','삼척','동해'],
 // 2026 동해·중앙선 참고 경유역: '같은 선로'는 직통 확정이 아님.
 ['부전','센텀','신해운대','기장','남창','태화강','북울산','경주','포항','영덕','울진','동해'],
 ['서울','청량리','양평','원주','제천','영주','안동','영천','경주','북울산','태화강','남창','기장','센텀','부전'],
 ['동대구','영천','경주','포항','영덕','강구'],
 ['청량리','제천','영주','봉화','춘양','분천','승부','철암','태백','도계','동해'],
 ['부산','구포','밀양','창원중앙','마산','진주','순천','벌교','보성','광주송정'],
 // 경전선 서부 경남 참고 노선 (직통 여부는 TAGO에서만 확인)
 ['동대구','경산','청도','밀양','진영','창원중앙','창원','마산','중리','함안','군북','반성','진주','완사','북천','하동','횡천','진상','광양','순천']
].map(x=>Object.freeze(x)));
const k=normalizeName;
const hubs=new Set(['서울','부산','용산','수서','청량리','대전','동대구','광명','천안아산','오송','익산','광주송정','목포','강릉','부전','판교','충주','문경','여수엑스포'].map(k));
export function destinationCandidates(departure,stations,limit=18){
 const name=k(departure?.name),id=departure?.id;
 if(!name||!id||!Array.isArray(stations))return [];
 const official=new Map(stations.filter(x=>x?.id&&x?.name&&x.id!==id).map(x=>[k(x.name),x]));
 const rank=new Map();
 for(const line of RAIL_CORRIDORS){
  const pos=line.findIndex(s=>k(s)===name);if(pos<0)continue;
  line.forEach((value,i)=>{const key=k(value);if(key===name||!official.has(key))return;
   const score=(hubs.has(key)?0:25)+Math.abs(i-pos);
   if(!rank.has(key)||rank.get(key)>score)rank.set(key,score);
  });
 }
 return [...rank].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0],'ko')).slice(0,Math.max(0,Math.min(24,limit))).map(([name])=>official.get(name));
}
// A user-selected route should be verified before the other suggested candidates.
export function prioritizeDestinationCandidates(candidates,preferred,departureId,limit=18){
 const list=Array.isArray(candidates)?candidates:[];
 const ordered=preferred?.id&&preferred.id!==departureId?[preferred,...list]:list;
 const seen=new Set();
 return ordered.filter(station=>{
  if(!station?.id||station.id===departureId||seen.has(station.id))return false;
  seen.add(station.id);return true;
 }).slice(0,Math.max(0,limit));
}
export function verifiedDestinationResponse(data,grade='전체'){
 if(!data?.ok||!Array.isArray(data.trains))return {state:'error',count:0};
 const valid=data.trains.filter(t=>t&&/^\d{12,14}$/.test(String(t.depTime))&&/^\d{12,14}$/.test(String(t.arrTime)));
 if(data.partial&&!valid.length)return {state:'unknown',count:0};
 const rows=grade==='전체'?valid:valid.filter(t=>{const n=String(t.grade||'').toUpperCase();return grade==='KTX'?n.includes('KTX'):grade==='SRT'?n.includes('SRT'):grade==='일반'?!n.includes('KTX')&&!n.includes('SRT'):false});
 return {state:rows.length?'confirmed':data.partial?'unknown':'empty',count:rows.length};
}