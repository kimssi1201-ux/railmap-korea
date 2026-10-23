import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('popular train pair remains chosen for date search',()=>{
 const src=read('app.js');
 assert.match(src,/state\.destinationMode='all';refreshDestinations\(\{keepTo:true\}\)/);
 assert.match(src,/destinationMode:'all'/);
 assert.doesNotMatch(read('train.html'),/id="destinationModeToggle"/);
 assert.match(src,/state\.selected\.to=oldTo;ui\.toInput\.value=oldTo\.name/);
});
test('city-bus search kind invalidates pending async results',()=>{
 const src=read('citybus.js');
 assert.match(src,/function setKind\(kind\)\{\+\+state\.searchId;\+\+state\.detailId;/);
 assert.match(src,/ui\.cityMore\.disabled=true/);
});
test('avoid duplicate full-search links and erroneous device-wide storage claims',()=>{
 assert.ok(!read('station-pages.js').includes('전체 기차 검색으로 이동 →'));
 assert.ok(!read('citybus.html').includes('이 아이폰에만 저장'));
 assert.ok(!read('citybus.html').includes('class="city-help"'));
});

test('train search keeps its accessible name without repeated visible heading',()=>{
 const html=read('train.html');
 assert.match(html,/<section class="search-card" aria-labelledby="searchTitle">/);
 assert.match(html,/<h2 id="searchTitle" class="sr-only">열차 검색<\/h2>/);
 assert.match(html,/<div class="card-head card-head-compact">/);
 assert.match(html,/id="serviceStatus"/);
 assert.match(read('styles.css'),/\.card-head-compact\{justify-content:flex-end;margin-bottom:9px\}/);
});

test('nationwide train search removes the redundant explanation panel while keeping form controls',()=>{
 const html=read('train.html');
 assert.doesNotMatch(html,/destination-match-info/);
 assert.doesNotMatch(html,/id="destinationStatus"/);
 assert.doesNotMatch(html,/id="destinationMore"/);
 assert.doesNotMatch(html,/id="destinationModeToggle"/);
 assert.match(html,/id="fromInput"/);
 assert.match(html,/id="toInput"/);
 assert.match(html,/id="tripDate"/);
 assert.match(html,/id="serviceStatus"/);
 assert.match(read('app.js'),/destinationMode:'all'/);
});

test('train search logic tolerates physically removed destination help controls',()=>{
 const src=read('app.js');
 assert.match(src,/function destStatus\(message\)\{if\(ui\.destinationStatus\)/);
 assert.match(src,/function destinationMoreState\(\)\{\s*if\(!ui\.destinationMore\)return/);
 assert.match(src,/ui\.destinationModeToggle\?\.addEventListener/);
 assert.match(src,/ui\.destinationMore\?\.addEventListener/);
 assert.match(read('styles.css'),/\.search-card \.date-block\{margin-top:15px\}/);
});

test('regional rail-station directory is landing page; train form survives on dedicated page',()=>{
 const home=read('index.html'),search=read('train.html'),directory=read('stations/index.html');
 assert.match(home,/<h1>전국 지역별 기차역 찾기<\/h1>/);
 assert.match(home,/id="spNationwide"/);
 assert.match(home,/id="spStationSearch"/);
 assert.match(home,/href="\/train.html"/);
 assert.match(home,/rel="canonical" href="https:\/\/railmap-korea.pages.dev\/"/);
 assert.match(directory,/rel="canonical" href="https:\/\/railmap-korea.pages.dev\/"/);
 assert.match(search,/id="searchForm"/);
 assert.match(search,/id="fromInput"/);
 assert.match(search,/id="toInput"/);
 assert.match(search,/href="\/train.html" aria-current="page"/);
});

test('dedicated train timetable stays a direct lookup without automatic transfers',()=>{
 const src=read('app.js'),page=read('train.html');
 assert.doesNotMatch(src,/searchOneTransfer/);
 assert.doesNotMatch(src,/renderTransferCards/);
 assert.match(src,/\/api\/trains/);
 assert.match(page,/app\.js\?v=rail-simple-v1/);
 assert.match(page,/station-pages\.css\?v=rail-simple-v1/);
});

test('homepage prompts for region and hides the long nationwide list until a choice',()=>{
 const home=read('index.html'),directory=read('station-directory.js');
 assert.match(home,/지역 선택/);
 assert.doesNotMatch(home,/빠른 바로가기 · 주요역 10곳/);
 assert.match(directory,/const awaitingChoice=region==='전체'&&!q/);
 assert.match(directory,/stations=\[\],limit=12/);
 assert.match(directory,/awaitingChoice\?\[\]:listed\.slice\(0,limit\)/);
});
