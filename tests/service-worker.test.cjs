const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('Push identity, logout, sibling tabs and relative cache paths',async()=>{
  let owner='',shown=[],opened=[],focused=0,windows=[],assets=[];const listeners={};
  const req=value=>{const r={result:value};queueMicrotask(()=>r.onsuccess?.());return r};
  const db={close(){},transaction(){const tx={};tx.objectStore=()=>({get:()=>{const r=req(owner);queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));return r},put:v=>{owner=v;const r=req(v);queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));return r}});return tx}};
  const scope='https://example.test/notre-maison/';
  const context={self:{registration:{scope,showNotification:async(...v)=>shown.push(v)},location:{origin:'https://example.test'},addEventListener:(t,f)=>listeners[t]=f,
    clients:{claim:async()=>{},matchAll:async()=>windows,openWindow:async u=>opened.push(u)},skipWaiting:async()=>{}},
    indexedDB:{open:()=>req(db)},URL,Request,Response,Date,Map,
    fetch:async()=>{throw Error('network unavailable')},caches:{keys:async()=>[],open:async()=>({addAll:async r=>assets=r.map(v=>v.url)}),match:async()=>null}};
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
  async function fire(type,data={}){let promise;listeners[type]({...data,waitUntil:p=>promise=p});await promise;}
  const push=id=>fire('push',{data:{json:()=>({userId:id,jobId:'job'})}});
  await fire('install');assert(assets.includes(scope+'assets/app.js'));assert(assets.every(u=>u.startsWith(scope)));
  await push('mom');assert.equal(shown.length,0);
  await fire('message',{data:{type:'SET_USER',userId:'mom'}});await push('dad');assert.equal(shown.length,0);await push('mom');assert.equal(shown.length,1);
  windows=[{url:'https://example.test/other-project/',focus:async()=>{focused++}}];
  await fire('notificationclick',{notification:{close(){},data:{userId:'mom'}}});assert.equal(focused,0);assert.equal(opened[0],scope);
  await fire('message',{data:{type:'SET_USER',userId:''}});await push('mom');assert.equal(shown.length,1);
  let intercepted=false;listeners.fetch({request:new Request('https://example.supabase.co/rest/v1/rpc/nm_rpc'),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
