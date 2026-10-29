/* Local tablet policy. Fully remains the only screen actuator in kiosk mode. */
(function(root){
'use strict';
const defaults={mode:'fully',enabled:false,idleMinutes:5,dayStart:'06:00',nightStart:'22:00',brightness:180,dimBrightness:20,browserAwake:false};
function phase(config,date,lastActivity){
 const minute=date.getHours()*60+date.getMinutes(),toMin=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
 const start=toMin(config.dayStart),end=toMin(config.nightStart);
 const day=start<end?minute>=start&&minute<end:minute>=start||minute<end;
 return date.getTime()-lastActivity<config.idleMinutes*60000?'awake':day?'dim':'off';
}
function validate(input){
 const c={...defaults,...input};
 if(!['fully','browser'].includes(c.mode)||!Number.isInteger(c.idleMinutes)||c.idleMinutes<1||c.idleMinutes>120||
 !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.dayStart)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.nightStart)||c.dayStart===c.nightStart||
 !Number.isInteger(c.brightness)||c.brightness<1||c.brightness>255||!Number.isInteger(c.dimBrightness)||c.dimBrightness<1||c.dimBrightness>=c.brightness)
 throw Error('Réglages écran invalides.');
 return c;
}
if(typeof module==='object'){module.exports={defaults,phase,validate};return;}
const key='nm-screen-policy:'+location.pathname.replace(/index\.html$/,'');
let config={...defaults},lastActivity=Date.now(),current='',wake=null,wakePending=false,error='';
try{config=validate(JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
const bridge=()=>root.fully&&['turnScreenOn','turnScreenOff','setScreenBrightness','bind'].every(k=>typeof root.fully[k]==='function');
const emit=()=>root.dispatchEvent(new Event('nm-screen-change'));
async function releaseWake(){const old=wake;wake=null;if(old)await old.release().catch(()=>{});}
async function tick(){
 try{
  if(config.mode==='fully'){
   await releaseWake();
   if(!config.enabled)return;
   if(!bridge())throw Error('Interface JavaScript Fully absente. Active-la dans Fully avant le pilotage.');
   const next=phase(config,new Date(),lastActivity);
   if(next===current)return;
   if(next==='off')root.fully.turnScreenOff(true);
   else {root.fully.turnScreenOn();root.fully.setScreenBrightness(next==='dim'?config.dimBrightness:config.brightness);}
   current=next;error='';emit();
  }else if(config.browserAwake&&!document.hidden&&navigator.wakeLock){
   if(!wake&&!wakePending){
    wakePending=true;
    try{
      const sentinel=await navigator.wakeLock.request('screen');
      if(config.mode!=='browser'||!config.browserAwake||document.hidden){await sentinel.release();return;}
      wake=sentinel;sentinel.addEventListener('release',()=>{if(wake===sentinel)wake=null;emit();});emit();
    }finally{wakePending=false;}
   }
  }else await releaseWake();
 }catch(e){error=e.message||String(e);emit();}
}
function activity(){lastActivity=Date.now();if(config.mode==='fully'&&config.enabled)tick();}
root.NotreMaisonMotion=activity;
function bind(){if(bridge())root.fully.bind('onMotion','window.NotreMaisonMotion();');}
function save(input){
 const next=validate(input);
 // Never hold a browser wake lock alongside Fully's screen control.
 if(next.mode==='fully')next.browserAwake=false;
 if(next.mode==='fully'&&next.enabled&&!bridge())throw Error('Active d’abord Enable JavaScript Interface dans Fully.');
 if(config.mode==='fully'&&config.enabled&&(!next.enabled||next.mode!=='fully')&&bridge()){
  root.fully.turnScreenOn();root.fully.setScreenBrightness(-1);
 }
 config=next;localStorage.setItem(key,JSON.stringify(config));lastActivity=Date.now();current='';bind();tick();emit();return {...config};
}
root.NotreMaisonScreen={read:()=>({...config}),save,available:bridge,status:()=>({phase:current,error,awake:!!wake})};
for(const event of ['pointerdown','keydown','touchstart','wheel'])root.addEventListener(event,activity,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseWake();else tick();});
bind();setInterval(tick,1000);tick();
})(typeof globalThis==='object'?globalThis:this);
