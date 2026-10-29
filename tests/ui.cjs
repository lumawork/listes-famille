const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const dom=new JSDOM(html,{url:'https://lumawork.github.io/listes-famille/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;const errors=[];w.addEventListener('error',e=>errors.push(e.error));
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
Object.defineProperty(w,'crypto',{value:require('node:crypto').webcrypto});w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.AbortController=AbortController;
const native=[];w.fully={bind:()=>{},turnScreenOn:()=>native.push('on'),turnScreenOff:()=>native.push('off'),setScreenBrightness:n=>native.push(n)};
w.localStorage.setItem('mm-v11-device-token:/listes-famille/','paired-token');
const mission={id:'room',person:'annabelle',title:'Ma chambre',version:1,status:'open',due:new Date().toISOString(),original_due:new Date().toISOString(),ends:new Date(Date.now()+3600000).toISOString(),original_end:new Date(Date.now()+3600000).toISOString(),visible:new Date(Date.now()-3600000).toISOString(),spec:{mode:'fixed',every:1,unit:'days',steps:[{id:'bed',title:'Lit'},{id:'desk',title:'Bureau'}]}};
const config={people:['annabelle','papa','maman'].map((id,i)=>({id,name:id,avatar:i})),rules:['Je range mes affaires'],rituals:[],shortcuts:[],idleSeconds:120,cameraUrl:'',tone:'fun'};
w.supabase={createClient:(u,k,opts)=>{
 let signed=false;
 return {
  auth:{onAuthStateChange(){},signInWithPassword:async()=>{signed=true;return {data:{}}},signOut:async()=>{signed=false;return {}}},
  rpc:async(name,args)=>{
   if(args.p_action==='step'){
    mission.spec.stepDone={...(mission.spec.stepDone||{}),[args.p_data.stepId]:args.p_data.done};mission.version++;
    const completed=mission.spec.steps.every(s=>mission.spec.stepDone[s.id]);if(completed)mission.status='done';return {data:{completed}};
   }
   return {data:{apiVersion:12,admin:signed,deviceId:signed?null:'tablet',userId:signed?'mom':null,config,revision:1,serverNow:new Date().toISOString(),definitions:[],occurrences:[mission],profiles:[],grants:[]}};
  }
 };
}};
const run=f=>vm.runInContext(fs.readFileSync(f,'utf8'),dom.getInternalVMContext());const turn=()=>new Promise(r=>setTimeout(r,40));
(async()=>{try{
run('config.js');run('dynamic-core.js');run('mission-wizard.js');run('screen-policy.js');
const bundle=fs.readFileSync('assets/app.js','utf8').replaceAll('import.meta.url',JSON.stringify('https://lumawork.github.io/listes-famille/assets/app.js'));
vm.runInContext(bundle,dom.getInternalVMContext());await turn();await turn();
w.document.querySelector('[aria-label="Valider Ma chambre"]').click();await turn();
assert(w.document.querySelector('dialog').textContent.includes('Lit'));const guided=[...w.document.querySelectorAll('dialog button')].find(b=>b.textContent==='Une étape à la fois');guided.click();await turn();assert.equal(w.document.querySelectorAll('dialog .step-check').length,1);w.document.querySelector('dialog .step-check input').click();await turn();w.document.querySelector('dialog .step-check input').click();await turn();assert.equal(mission.status,'done');
w.document.querySelector('[aria-label="Paramètres"]').click();await turn();
let form=[...w.document.querySelectorAll('dialog form')].find(f=>f.textContent.includes('Déverrouiller les paramètres'));assert(form);
form.querySelector('[name=email]').value='mom@example.test';form.querySelector('[name=password]').value='password';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await turn();await turn();
assert(w.document.querySelector('.screen-settings'),'Réglages locaux absents');
assert(![...w.document.querySelectorAll('button')].some(b=>b.textContent==='Maintenir l’écran'));
const c=w.document.querySelector('.screen-settings input[type=checkbox]');c.click();await turn();
const apply=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Appliquer les réglages écran');apply.click();await turn();assert.equal(w.NotreMaisonScreen.read().enabled,true);assert(native.includes('on'));
w.document.querySelector('dialog [aria-label="Fermer"]').click();await turn();assert.equal(w.localStorage.getItem('mm-v11-device-token:/listes-famille/'),'paired-token');
w.document.querySelector('[aria-label="Paramètres"]').click();await turn();assert(w.document.querySelector('[name=password]'));assert.equal(errors.length,0,errors.map(String).join('\n'));
let again=[...w.document.querySelectorAll('dialog form')].find(f=>f.textContent.includes('Déverrouiller les paramètres'));
again.querySelector('[name=email]').value='mom@example.test';again.querySelector('[name=password]').value='password';again.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await turn();await turn();
[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Gérer les missions sur cette tablette').click();await turn();assert([...w.document.querySelectorAll('button')].some(b=>b.textContent==='Terminer la gestion'));
const addMission=[...w.document.querySelectorAll('button.text-button')].find(b=>b.textContent.trim()==='Ajouter');assert(addMission&&!addMission.disabled);addMission.click();await turn();assert(w.document.querySelector('.mission-wizard'));
w.document.querySelector('dialog [aria-label="Fermer"]').click();await turn();[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Terminer la gestion').click();await turn();
w.document.querySelector('[aria-label="Paramètres"]').click();await turn();assert(w.document.querySelector('[name=password]'));
console.log('OK interface DOM : étapes guidées, association, déverrouillage parent, réglages Fully, gestion et formulaire sur tablette, reverrouillage.');
}finally{w.close()}})().catch(e=>{console.error(e);process.exitCode=1});
