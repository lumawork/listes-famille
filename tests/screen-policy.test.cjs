const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const pure={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('screen-policy.js','utf8'),pure);const P=pure.module.exports;
test('5 minutes inclusive, day/night boundaries, wake on movement and wraparound',()=>{
 const c={...P.defaults};const d=s=>new Date('2026-10-29T'+s);const old=d('05:50:00').getTime();
 assert.equal(P.phase(c,d('05:59:00'),old),'off');assert.equal(P.phase(c,d('06:00:00'),old),'dim');
 assert.equal(P.phase(c,d('21:59:00'),old),'dim');assert.equal(P.phase(c,d('22:00:00'),old),'off');
 const active=d('22:00:00').getTime();assert.equal(P.phase(c,d('22:04:59'),active),'awake');assert.equal(P.phase(c,d('22:05:00'),active),'off');
 assert.throws(()=>P.validate({...c,dayStart:'22:00'}));assert.throws(()=>P.validate({...c,idleMinutes:0}));
});
test('Fully policy issues native commands, never requests browser wake lock, and motion restores light',async()=>{
 const calls=[],events={},documentEvents={},values={};let timer,clock=Date.parse('2026-10-29T12:00:00'),wakeCount=0;
 class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 const context={Date:Clock,console,Event,location:{pathname:'/listes-famille/'},localStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v},
 navigator:{wakeLock:{request:async()=>{wakeCount++;return {release:async()=>{},addEventListener(){}}}}},document:{hidden:false,addEventListener:(k,v)=>documentEvents[k]=v},
 addEventListener:(k,v)=>events[k]=v,dispatchEvent(){},setInterval:f=>timer=f,
 fully:{bind:(...x)=>calls.push(['bind',...x]),turnScreenOn:()=>calls.push(['on']),turnScreenOff:x=>calls.push(['off',x]),setScreenBrightness:x=>calls.push(['brightness',x])}};
 vm.runInNewContext(fs.readFileSync('screen-policy.js','utf8'),context);
 context.NotreMaisonScreen.save({...P.defaults,enabled:true});await timer();
 clock+=300000;await timer();assert(calls.some(c=>c[0]==='brightness'&&c[1]===20));
 clock=Date.parse('2026-10-29T22:00:00');await timer();assert(calls.some(c=>c[0]==='off'&&c[1]===true));
 context.NotreMaisonMotion();await Promise.resolve();assert.deepEqual(calls.slice(-2),[['on'],['brightness',180]]);assert.equal(wakeCount,0);
});
