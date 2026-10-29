'use strict';
const PREFIX='notre-maison-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'1.4.0';
const ASSETS=['./','./index.html','./style.css','./config.js','./supabase.min.js','./dynamic-core.js','./screen-policy.js','./mission-wizard.js',
  './assets/app.js','./assets/avatar-presets.png','./icon-192.png','./icon-512.png','./icon.svg','./favicon.svg','./manifest.webmanifest'];
const SOUND=new Map();
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE)
  .then(c=>c.addAll(ASSETS.map(u=>new Request(new URL(u,self.registration.scope),{cache:'reload'}))))
  .then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
  if(!ASSETS.some(a=>u.href===new URL(a,self.registration.scope).href))return;
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}
    return r;
  }).catch(async()=>await caches.match(e.request,{cacheName:CACHE})||Response.error()));
});
function identityDB(){return new Promise((resolve,reject)=>{
  const r=indexedDB.open('mm-identity-'+self.registration.scope,1);
  r.onupgradeneeded=()=>r.result.createObjectStore('identity');
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});}
async function identity(value){const db=await identityDB();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('identity',value===undefined?'readonly':'readwrite'),s=tx.objectStore('identity');
  const r=value===undefined?s.get('user'):s.put(value,'user');
  tx.oncomplete=()=>resolve(value===undefined?r.result:value);tx.onerror=()=>reject(tx.error);
});}finally{db.close();}}
self.addEventListener('message',e=>{
  if(e.data?.type==='SET_USER'&&typeof e.data.userId==='string')e.waitUntil(identity(e.data.userId));
  if(e.data?.type==='NM_SOUND_ACTIVE'&&e.source?.id)SOUND.set(e.source.id,Date.now());
});
self.addEventListener('push',e=>e.waitUntil((async()=>{
  let d;try{d=e.data?.json();}catch{return;}
  if(!d?.userId||d.userId!==await identity())return;
  const cs=await self.clients.matchAll({type:'window'});
  const silent=cs.some(c=>c.visibilityState==='visible'&&Date.now()-(SOUND.get(c.id)||0)<10000);
  await self.registration.showNotification('Une petite mission t’attend',{
    body:'Un petit pas suffit. Retrouve tes missions dans Notre Maison.',
    silent,icon:new URL('icon.svg',self.registration.scope).href,
    tag:'mission-'+(d.jobId||d.tag||'test'),data:{userId:d.userId}
  });
})()));
self.addEventListener('notificationclick',e=>{
  e.notification.close();e.waitUntil((async()=>{
    if(e.notification.data?.userId!==await identity())return;
    const cs=await self.clients.matchAll({type:'window'}),c=cs.find(c=>c.url.startsWith(self.registration.scope));
    if(c)await c.focus();else await self.clients.openWindow(self.registration.scope);
  })());
});
