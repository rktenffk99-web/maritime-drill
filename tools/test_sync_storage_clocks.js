'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const KEY='md_nav23_pass_progress_v1',STATE='md_drive_sync_state_v1';
const T0='2026-10-20T00:00:00.000Z',T1='2026-10-21T00:00:00.000Z',T2='2026-10-22T00:00:00.000Z';
const clone=value=>JSON.parse(JSON.stringify(value));
function harness(initial={},metadata={}){
  class Storage{
    constructor(){this.data=new Map()}
    getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null}
    setItem(key,value){this.data.set(String(key),String(value))}
    removeItem(key){this.data.delete(String(key))}
  }
  const storage=new Storage(),h={now:T0,failMeta:false};
  for(const [key,value] of Object.entries(initial))storage.setItem(key,JSON.stringify(value));
  storage.setItem(STATE,JSON.stringify({enabled:true,deviceId:'test',revision:1,localUpdatedAt:T0,itemMeta:metadata}));
  const load=()=>JSON.parse(storage.getItem(STATE));
  const s={window:null,console:{warn(){}},Storage,localStorage:storage,Date,JSON,Math,Object,Array,Set,Map,encodeURIComponent,
    driveSyncOnce(){},driveSyncInstallStorageHooks(){},isManagedStorageKey:key=>key.startsWith('md_')&&key!==STATE,
    driveSyncLoadState:load,driveSyncSaveState(state){if(h.failMeta)return false;storage.setItem(STATE,JSON.stringify(state));return true},
    driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,DRIVE_SYNC_STATE_KEY:STATE,
    driveSyncNowIso:()=>h.now,driveSyncRefreshPanel(){},driveSyncBusy:false,driveSyncLastError:''};
  s.window=s;vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','drive-sync-v2.js'),'utf8'),s);s.driveSyncInstallStorageHooks();
  Object.assign(h,{s,storage,load,write(value){storage.setItem(KEY,JSON.stringify(value))},
    snapshot(){return {items:Object.fromEntries([...storage.data].filter(([key])=>key!==STATE)),itemMeta:clone(load().itemMeta),updatedAt:load().localUpdatedAt}},
    merge(a,b){return clone(s.__mdDriveSyncV2.mergeSnapshots(a.items,b.items,a.itemMeta,b.itemMeta,a.updatedAt,b.updatedAt))}});
  return h;
}
let count=0;function test(name,run){run();count++;console.log('PASS '+name)}
test('metadata storage failure cannot acknowledge a changed learning record',()=>{
  const h=harness({[KEY]:{q1:{status:'mastered'}}}),before=h.snapshot();h.failMeta=true;
  assert.throws(()=>h.write({q1:{status:'weak'}}),/저장/);assert.deepEqual(h.snapshot(),before);
  h.failMeta=false;h.now=T1;h.write({q1:{status:'weak'}});assert.equal(JSON.parse(h.storage.getItem(KEY)).q1.status,'weak');
});
test('metadata storage failure preserves deletion and first-write atomicity',()=>{
  const h=harness({[KEY]:{q1:{status:'mastered'}}}),before=h.snapshot();h.failMeta=true;
  assert.throws(()=>h.storage.removeItem(KEY),/저장/);assert.deepEqual(h.snapshot(),before);
  assert.throws(()=>h.storage.setItem('md_new_key','{"q":1}'),/저장/);assert.equal(h.storage.getItem('md_new_key'),null);assert.deepEqual(h.snapshot(),before);
});
test('remote application, unchanged writes, and nonmanaged storage do not require metadata writes',()=>{
  const h=harness({[KEY]:{q1:1}});h.failMeta=true;
  assert.doesNotThrow(()=>h.write({q1:1}));assert.doesNotThrow(()=>h.storage.setItem('device-local','1'));
  h.s.driveSyncApplyingRemote=true;assert.doesNotThrow(()=>h.write({q1:2}));
});
test('an unrelated later answer cannot restore an older mastery state over a new wrong answer',()=>{
  const old={q1:{status:'mastered',lastDate:'2026-10-20'},q2:{status:'new',lastDate:'2026-10-20'}};
  const metadata={[KEY]:{updatedAt:T0,fields:{'':{updatedAt:T0,deleted:false}}}};
  const a=harness({[KEY]:old},metadata),b=harness({[KEY]:old},metadata);
  a.now=T1;a.write({...old,q1:{status:'weak',lastDate:'2026-10-21'}});
  b.now=T2;b.write({...old,q2:{status:'mastered',lastDate:'2026-10-22'}});
  const m=a.merge(a.snapshot(),b.snapshot()),values=JSON.parse(m.items[KEY]);
  assert.equal(values.q1.status,'weak');assert.equal(values.q1.lastDate,'2026-10-21');assert.equal(values.q2.status,'mastered');
  assert.deepEqual(a.merge(b.snapshot(),a.snapshot()),m);
});
test('legacy baselines retain their old clock when the first tracked answer is written',()=>{
  const old={q1:{status:'mastered',lastDate:'2026-10-20'},q2:{status:'new',lastDate:'2026-10-20'}};
  const a=harness({[KEY]:old}),b=harness({[KEY]:old});
  a.now=T1;a.write({...old,q1:{status:'weak',lastDate:'2026-10-21'}});
  b.now=T2;b.write({...old,q2:{status:'mastered',lastDate:'2026-10-22'}});
  const m=a.merge(a.snapshot(),b.snapshot());assert.equal(JSON.parse(m.items[KEY]).q1.status,'weak');assert.equal(JSON.parse(m.items[KEY]).q2.status,'mastered');
});
test('atomic checkpoints use the newest whole-key write instead of the inherited field baseline',()=>{
  const key='md_pass_plan_session_checkpoint_v2',h=harness(),a={queueKeys:['z'],answers:[3],nextIndex:0},b={queueKeys:['a'],answers:[0],nextIndex:0};
  const left={items:{[key]:JSON.stringify(a)},itemMeta:{[key]:{updatedAt:T1,fields:{'':{updatedAt:T0,deleted:false}}}},updatedAt:T1};
  const right={items:{[key]:JSON.stringify(b)},itemMeta:{[key]:{updatedAt:T2,fields:{'':{updatedAt:T0,deleted:false}}}},updatedAt:T2};
  assert.deepEqual(JSON.parse(h.merge(left,right).items[key]),b);assert.deepEqual(h.merge(left,right),h.merge(right,left));
});
test('the unchanged-field baseline survives the field metadata retention cap',()=>{
  const fields={'':{updatedAt:T0,deleted:false}};
  for(let i=0;i<30001;i++)fields['q'+i+'/status']={updatedAt:T1,deleted:false};
  const h=harness({[KEY]:{old:{status:'mastered'}}},{[KEY]:{updatedAt:T1,fields}});
  h.now=T2;h.write({old:{status:'mastered'},new:{status:'weak'}});
  const saved=h.load().itemMeta[KEY].fields;assert.equal(Object.keys(saved).length,30000);assert.equal(saved[''].updatedAt,T0);
});
console.log(`sync storage/clock regressions: PASS (${count} cases)`);
