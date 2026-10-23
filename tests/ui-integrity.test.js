import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const screens=[['app.js','train.html'],['bus.js','bus.html'],['citybus.js','citybus.html']];
for(const [script,page] of screens){
 test(page+' has no duplicate HTML ids or missing JavaScript-mapped controls',()=>{
  const html=load(page),js=load(script),m=js.match(/Object\.fromEntries\(\[([\s\S]*?)\]\.map/);
  assert.ok(m,'UI ID map must exist');
  const ids=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  const declared=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(declared).size,declared.length,'duplicate HTML id');
  for(const id of ids)assert.ok(declared.includes(id),'missing control '+id);
 });
}
