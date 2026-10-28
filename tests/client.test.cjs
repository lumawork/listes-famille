const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
const {webcrypto}=require('node:crypto');

function harness(config={}) {
  const values={},events={},calls=[],messages=[];let signouts=0;
  const storage={getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=String(v)},removeItem:k=>{delete values[k]}};
  const localStorage=new Proxy(storage,{ownKeys:()=>Object.keys(values),getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
  const auth={signInWithPassword:async data=>({data:{session:{user:{id:'mom'}}}}),signOut:async()=>{signouts++},onAuthStateChange:fn=>{auth.changed=fn}};
  let handler=async()=>({data:{ok:true}});
  const options=[];
  const client={auth,rpc:async(name,args)=>{calls.push({name,args});return handler(name,args)}};
  const context={exports:{},module:{exports:{}},URL,Event,AbortSignal,TextEncoder,Date,Uint8Array,crypto:webcrypto,console,
    localStorage,navigator:{onLine:true,serviceWorker:{getRegistration:async()=>({active:{postMessage:m=>messages.push(m)}})}},
    document:{hidden:false,addEventListener:()=>{}},
    location:{hostname:'example.test'},setTimeout:f=>f()};
  context.window={MAISON_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_example',missionsUrl:'https://example.test/mes-missions/',...config},
    supabase:{createClient:(u,k,o)=>{options.push(o);return client}},addEventListener:(type,fn)=>events[type]=fn,dispatchEvent:()=>{}};
  const source=fs.readFileSync('src/client.ts','utf8').replace('import.meta.url',JSON.stringify('https://example.test/notre-maison/assets/app.js'));
  vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs'}).code,context);
  return {options,api:context.module.exports,context,values,events,calls,messages,auth,get signouts(){return signouts},set handler(fn){handler=fn}};
}
test('Paths resolve beneath a GitHub Pages project, not the domain root',()=>{
  const h=harness();assert.equal(h.api.base.href,'https://example.test/notre-maison/');assert.equal(h.api.local('sw.js'),'https://example.test/notre-maison/sw.js');
});
test('RPC uses the existing server engine and opaque scoped device token',async()=>{
  const h=harness();h.values['mm-v11-device-token:/notre-maison/']='device-secret';
  await h.api.rpc('complete',{id:'occ',requestId:'same-request'});
  assert.equal(h.calls[0].name,'nm_rpc');assert.equal(h.calls[0].args.p_token,'device-secret');assert.equal(h.calls[0].args.p_data.requestId,'same-request');
  await h.api.rpc('legacy:plan',{listId:'list'});assert.equal(h.calls[1].name,'nm_legacy');assert.equal(h.calls[1].args.p_token,undefined);
});
test('A rejected pairing preserves the previous session and access',async()=>{
  const h=harness();h.values['mm-v11-device-token:/notre-maison/']='old';h.handler=async()=>({data:{error:'PAIR_DENIED'}});
  await assert.rejects(h.api.post('/api/pair',{code:'wrong'}),/PAIR_DENIED/);
  assert.equal(h.signouts,0);assert.equal(h.values['mm-v11-device-token:/notre-maison/'],'old');
});
test('A successful pairing replaces account mode with the server token',async()=>{
  const h=harness();h.handler=async()=>({data:{token:'fresh'}});
  await h.api.post('/api/pair',{identifier:'i',code:'c'});assert.equal(h.signouts,1);assert.equal(h.values['mm-v11-device-token:/notre-maison/'],'fresh');
});
test('Cache is scoped by authenticated user and expires after 24 hours',async()=>{
  const h=harness(),key='mm-auth-example.supabase.co';h.values[key]=JSON.stringify({user:{id:'mom'}});
  await h.api.saveCache({userId:'mom',title:'private'});assert.equal((await h.api.readCache()).data.title,'private');
  h.values[key]=JSON.stringify({user:{id:'dad'}});assert.equal(await h.api.readCache(),null);
  h.values[key]=JSON.stringify({user:{id:'mom'}});const cache=Object.keys(h.values).find(k=>k.startsWith('nm-cache:'));
  const old=JSON.parse(h.values[cache]);old.at=Date.now()-86400001;h.values[cache]=JSON.stringify(old);
  assert.equal(await h.api.readCache(),null);assert.equal(h.values[cache],undefined);
});
test('Device cache uses a hash and cannot leak into another association',async()=>{
  const h=harness();h.values['mm-v11-device-token:/notre-maison/']='private-token';await h.api.saveCache({deviceId:'one'});
  const cache=Object.keys(h.values).find(k=>k.startsWith('nm-cache:'));assert.equal(cache.includes('private-token'),false);
  h.values['mm-v11-device-token:/notre-maison/']='other-token';assert.equal(await h.api.readCache(),null);
});
test('Offline writes are rejected before any request is sent',async()=>{
  const h=harness();h.context.navigator.onLine=false;await assert.rejects(h.api.rpc('complete',{id:'o'}),/OFFLINE/);assert.equal(h.calls.length,0);
});
test('Logout removes cached private data and clears notification identity',async()=>{
  const h=harness();h.values['mm-v11-device-token:/notre-maison/']='old';await h.api.saveCache({deviceId:'o'});
  await h.api.post('/api/logout',{});assert.equal(h.values['mm-v11-device-token:/notre-maison/'],undefined);assert.equal(Object.keys(h.values).some(k=>k.startsWith('nm-cache:')),false);assert.equal(h.messages[0].userId,'');
});
test('Secret keys are rejected rather than sent from the browser',()=>{
  assert.throws(()=>harness({publishableKey:'sb_secret_test'}),/INVALID_PUBLIC_CONFIG/);
});

test('Temporary parent mode preserves pairing, bypasses token only while unlocked and never caches admin data',async()=>{
 const h=harness();h.values['mm-v11-device-token:/notre-maison/']='paired';
 h.handler=async(name,args)=>({data:{admin:args.p_token===null,definitions:[{family_id:'family'}],occurrences:[],config:{},revision:1}});
 await h.api.unlockParent('mom@example.test','password');
 assert.equal(h.api.parentUnlocked(),true);
 assert.equal(h.values['mm-v11-device-token:/notre-maison/'],'paired');
 assert.equal(h.options[1].auth.persistSession,false);
 assert.equal(h.options[1].auth.detectSessionInUrl,false);
 await h.api.saveCache({admin:true});assert.equal(Object.keys(h.values).some(k=>k.startsWith('nm-cache:')),false);
 await h.api.rpc('config',{});assert.equal(h.calls.at(-1).args.p_token,null);
 h.api.lockParent();assert.equal(h.api.parentUnlocked(),false);
 await h.api.rpc('snapshot');assert.equal(h.calls.at(-1).args.p_token,'paired');
});
test('A child account cannot unlock settings',async()=>{
 const h=harness();h.handler=async()=>({data:{admin:false}});
 await assert.rejects(h.api.unlockParent('child@example.test','password'),/parent autorisé/);
 assert.equal(h.api.parentUnlocked(),false);
});
test('A parent from a different populated home cannot replace the paired home',async()=>{
 const h=harness();h.values['mm-v11-device-token:/notre-maison/']='paired';
 h.handler=async(n,a)=>({data:{admin:!a.p_token,definitions:[{family_id:a.p_token?'home-one':'home-two'}]}});
 await assert.rejects(h.api.unlockParent('other@example.test','password'),/autre foyer/);
 assert.equal(h.api.parentUnlocked(),false);assert.equal(h.values['mm-v11-device-token:/notre-maison/'],'paired');
});

test('Wrong password does not alter paired access',async()=>{
 const h=harness();h.values['mm-v11-device-token:/notre-maison/']='paired';
 h.auth.signInWithPassword=async()=>({error:{message:'invalid'}});
 await assert.rejects(h.api.unlockParent('mom@example.test','wrong'),/incorrect/);
 assert.equal(h.api.parentUnlocked(),false);assert.equal(h.calls.length,0);
 assert.equal(h.values['mm-v11-device-token:/notre-maison/'],'paired');
});
test('Closing during authentication cancels a late successful unlock',async()=>{
 const h=harness();let finish;
 h.auth.signInWithPassword=()=>new Promise(r=>finish=r);
 h.handler=async()=>({data:{admin:true,definitions:[],occurrences:[]}});
 const pending=h.api.unlockParent('mom@example.test','password');h.api.lockParent();finish({data:{}});
 await assert.rejects(pending,/annulé/);assert.equal(h.api.parentUnlocked(),false);
});
