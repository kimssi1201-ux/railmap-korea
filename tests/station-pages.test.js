import test from 'node:test';
import assert from 'node:assert/strict';
import {FEATURED_STATIONS,FEATURED_PAIRS,stationById,stationDetailHtml,routeDetailHtml,stationIndexHtml,sitemapUrls,isFeaturedPair,recommendedDestinations} from '../station-pages.js';
import {onRequestGet as stationReq} from '../functions/stations/[id].js';
import {onRequestGet as routeReq} from '../functions/routes/[from]/[to].js';
test('10 unique verified station IDs, no invented timetables',()=>{
 assert.equal(FEATURED_STATIONS.length,10);assert.equal(new Set(FEATURED_STATIONS.map(s=>s.id)).size,10);
 for(const s of FEATURED_STATIONS){assert.equal(stationById(s.id)?.name,s.name);const html=stationDetailHtml(s);assert.ok(html.includes('<link rel="canonical"'));assert.ok(html.includes(s.name+'역'));assert.ok(!html.includes('59,800원'))}
});
test('route pages exist only for known curated pairs and reverse',()=>{
 for(const [a,b] of FEATURED_PAIRS){assert.ok(isFeaturedPair(a,b));assert.ok(isFeaturedPair(b,a));const page=routeDetailHtml(stationById(a),stationById(b));assert.ok(page.includes('id="routeSearchForm"'));assert.ok(page.includes('data-from="'+a+'"'));assert.ok(page.includes('data-to="'+b+'"'))}
 assert.equal(routeDetailHtml(stationById('NAT010000'),stationById('NAT032563')),null);
});
test('unknown station or unknown route returns true 404 not thin SEO page',()=>{
 assert.equal(stationReq({params:{id:'unknown'}}).status,404);
 assert.equal(routeReq({params:{from:'NAT010000',to:'NAT032563'}}).status,404);
});
test('SSR station and route response has HTML and canonical URL',async()=>{
 const s=stationReq({params:{id:'NAT010000'}});assert.equal(s.status,200);assert.match(s.headers.get('Content-Type'),/text\/html/);assert.match(await s.text(),/https:\/\/railmap-korea.pages.dev\/stations\/NAT010000/);
 const r=routeReq({params:{from:'NAT010000',to:'NAT014445'}});assert.equal(r.status,200);assert.match(await r.text(),/NAT010000/);
});
test('directory contains all ten and sitemap only curated URLs',()=>{
 const html=stationIndexHtml();for(const station of FEATURED_STATIONS)assert.ok(html.includes('/stations/'+station.id));
 const links=sitemapUrls();assert.equal(links.length,2+10+FEATURED_PAIRS.length*2);assert.equal(new Set(links).size,links.length);
 assert.ok(recommendedDestinations('NAT130126').some(s=>s.name==='강릉'));
});