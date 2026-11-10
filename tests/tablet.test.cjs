const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {transformSync}=require('esbuild');
const ctx={exports:{},module:{exports:{}},Intl,Date};
vm.runInNewContext(transformSync(fs.readFileSync('src/tablet.ts','utf8'),{loader:'ts',format:'cjs'}).code,ctx);
const T=ctx.module.exports;
const occ=(id,o)=>({id,person:'annabelle',title:id,status:'open',spec:{},...o});

test('A task done today (Paris) stays visible, a task done yesterday disappears',()=>{
  // 10 Nov 2026 23:30 in Paris = 22:30 UTC
  const now='2026-11-10T22:30:00Z';
  const rows=[
    occ('today',{status:'done',completed:'2026-11-10T06:00:00Z',original_due:'2026-11-10T06:00:00Z',due:'2026-11-10T06:00:00Z'}),
    occ('yesterday',{status:'done',completed:'2026-11-09T21:00:00Z',original_due:'2026-11-09T20:00:00Z',due:'2026-11-09T20:00:00Z'}),
    occ('late-night',{status:'done',completed:'2026-11-09T23:30:00Z',original_due:'2026-11-09T20:00:00Z',due:'2026-11-09T20:00:00Z'}),
  ];
  const b=T.boardRows(rows,'annabelle',now);
  // 2026-11-09T23:30Z is 00:30 on 10 Nov in Paris: still today.
  assert.deepEqual(b.done.map(o=>o.id),['today','late-night']);
  // Next day in Paris (00:05 on 11 Nov = 23:05Z on 10 Nov): everything done on the 10th is gone.
  assert.deepEqual(T.boardRows(rows,'annabelle','2026-11-10T23:05:00Z').done.map(o=>o.id),[]);
});

test('Late tasks come first, oldest first; done tasks never mix with open ones',()=>{
  const now='2026-11-10T12:00:00Z';
  const rows=[
    occ('upcoming',{visible:'2026-11-10T10:00:00Z',due:'2026-11-10T18:00:00Z',ends:'2026-11-10T20:00:00Z'}),
    occ('late2',{visible:'2026-11-09T10:00:00Z',due:'2026-11-09T18:00:00Z',ends:'2026-11-09T20:00:00Z'}),
    occ('late1',{visible:'2026-11-08T10:00:00Z',due:'2026-11-08T18:00:00Z',ends:'2026-11-08T20:00:00Z'}),
    occ('now',{visible:'2026-11-10T08:00:00Z',due:'2026-11-10T11:00:00Z',ends:'2026-11-10T14:00:00Z'}),
    occ('done',{status:'done',completed:'2026-11-10T09:00:00Z'}),
    occ('other',{person:'papa',visible:'2026-11-08T10:00:00Z',due:'2026-11-08T18:00:00Z',ends:'2026-11-08T20:00:00Z'}),
  ];
  const b=T.boardRows(rows,'annabelle',now);
  assert.deepEqual(b.overdue.map(o=>o.id),['late1','late2']);
  assert.deepEqual(b.now.map(o=>o.id),['now']);
  assert.deepEqual(b.upcoming.map(o=>o.id),['upcoming']);
  assert.deepEqual(b.done.map(o=>o.id),['done']);
  assert.deepEqual({...T.gauge(rows,'annabelle',now)},{done:1,total:5,pct:20});
});

test('Person stats count only this person, for today: done, postponed, skipped, cancelled',()=>{
  const now='2026-11-10T12:00:00Z';
  const rows=[
    occ('d1',{status:'done',completed:'2026-11-10T08:00:00Z',original_due:'2026-11-10T07:00:00Z',due:'2026-11-10T07:00:00Z'}),
    occ('d-old',{status:'done',completed:'2026-11-09T08:00:00Z',original_due:'2026-11-09T07:00:00Z',due:'2026-11-09T07:00:00Z'}),
    occ('moved',{original_due:'2026-11-10T07:00:00Z',due:'2026-11-11T07:00:00Z'}),
    occ('skip',{status:'skipped',original_due:'2026-11-10T07:00:00Z',due:'2026-11-10T07:00:00Z'}),
    occ('cancel',{status:'cancelled',original_due:'2026-11-10T07:00:00Z',due:'2026-11-10T07:00:00Z'}),
    occ('papa',{person:'papa',status:'skipped',original_due:'2026-11-10T07:00:00Z',due:'2026-11-10T07:00:00Z'}),
  ];
  assert.deepEqual({...T.personStats(rows,'annabelle',now)},{done:1,postponed:1,skipped:1,cancelled:1});
  assert.deepEqual({...T.personStats(rows,'papa',now)},{done:0,postponed:0,skipped:1,cancelled:0});
});

test('Rules banner is closed by default and its state is remembered locally',()=>{
  const v={};const storage={getItem:k=>v[k]??null,setItem:(k,x)=>{v[k]=String(x)}};
  assert.equal(T.readRulesOpen(storage),false);
  T.writeRulesOpen(storage,true);assert.equal(T.readRulesOpen(storage),true);
  T.writeRulesOpen(storage,false);assert.equal(T.readRulesOpen(storage),false);
  assert.equal(T.readRulesOpen({getItem(){throw Error('blocked')}}),false);
});

test('The tools menu lists agenda, shopping, location, shutters and camera only',()=>{
  assert.deepEqual([...T.TOOLS],['agenda','courses','localisation','volets','camera']);
});
