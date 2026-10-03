'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..'),STATE='md_drive_sync_state_v1',PROGRESS='md_nav23_pass_progress_v1',HISTORY='md_focus_history_navi3';
const T0='2026-10-03T00:00:00.000Z',copy=value=>JSON.parse(JSON.stringify(value));
function harness(initial={}){
  let now=Date.parse(T0);
  const failures={key:null,metadata:false},warnings=[],calls={apply:0,reload:0};
  class Storage{
    constructor(){this.data=new Map()}
    get length(){return this.data.size}
    key(i){return [...this.data.keys()][i]||null}
    getItem(k){return this.data.has(k)?this.data.get(k):null}
    setItem(k,v){if(failures.key===k)throw new Error('storage write failed');this.data.set(String(k),String(v))}
    removeItem(k){this.data.delete(String(k))}
  }
  const storage=new Storage();
  for(const [key,value] of Object.entries(initial))storage.setItem(key,JSON.stringify(value));
  storage.setItem(STATE,JSON.stringify({enabled:true,deviceId:'sync-test',revision:1,localUpdatedAt:T0,lastSyncedAt:T0,itemMeta:{}}));
  const load=()=>JSON.parse(storage.getItem(STATE)),collect=()=>Object.fromEntries([...storage.data].filter(([key])=>key!==STATE&&key.startsWith('md_')));
  const h={storage,failures,warnings,calls,load,collect,read:key=>JSON.parse(storage.getItem(key)),
    write(key,value){now+=1000;storage.setItem(key,JSON.stringify(value))},
    snapshot(){return {items:copy(collect()),itemMeta:copy(load().itemMeta),updatedAt:load().localUpdatedAt}},
    tick(ms=1000){now+=ms},remote:null};
  const s={window:null,console,Date,JSON,Math,Object,Array,Set,Map,encodeURIComponent,Storage,localStorage:storage,
    crypto:{randomUUID:()=> 'counter-device-a'},navigator:{onLine:true},currentMode:'home',location:{reload(){calls.reload++}},
    driveSyncOnce(){},driveSyncInstallStorageHooks(){},isManagedStorageKey:key=>key.startsWith('md_')&&key!==STATE,
    driveSyncLoadState:load,driveSyncSaveState(state){if(failures.metadata)return false;storage.setItem(STATE,JSON.stringify(state));return true},
    driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,driveSyncBusy:false,driveSyncLastError:'',
    DRIVE_SYNC_STATE_KEY:STATE,driveSyncNowIso:()=>new Date(++now).toISOString(),driveSyncRefreshPanel(){},
    showStorageWarning:(label,error)=>warnings.push(error.message),backupNotice(){},alert:m=>warnings.push(m),
    driveSyncHasToken:()=>true,driveSyncRequestToken:async()=>{},collectBackupItems:collect,
    BACKUP_SCHEMA_VERSION:1,APP_VERSION:'test',
    driveSyncFindRemoteFile:async()=>({id:'test',modifiedTime:h.remote.updatedAt}),
    driveSyncDownloadPayload:async()=>copy(h.remote),
    driveSyncUploadRemote:async(id,payload)=>{h.remote=copy(payload);return {modifiedTime:payload.updatedAt}},
    createAutomaticRestorePoint(){h.restorePoint=copy(collect());return true},
    applyBackupSnapshot(entries){calls.apply++;for(const key of Object.keys(collect()))storage.removeItem(key);for(const [key,value] of entries)storage.setItem(key,value)}
  };
  s.window=s;vm.createContext(s);
  for(const file of ['daily-storage.js','learning-integrity.js','drive-sync-v2.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),s,{filename:file});
  s.driveSyncInstallStorageHooks();h.s=s;h.api=s.__mdDriveSyncV2;
  h.merge=(a,b)=>copy(h.api.mergeSnapshots(a.items,b.items,a.itemMeta,b.itemMeta,a.updatedAt,b.updatedAt));
  return h;
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
  await test('reset rejects stale progress even after the old device answers another question',()=>{
    const old={q1:{attempts:10,correct:10,wrong:0,lastDate:'2026-10-02'}};
    const a=harness({[PROGRESS]:old}),b=harness({[PROGRESS]:old});
    assert.equal(a.api.resetKey(PROGRESS,'{}','진도 초기화'),true);
    b.tick(10000);b.write(PROGRESS,{...old,q2:{attempts:1,correct:1,wrong:0,lastDate:'2026-10-03'}});
    const left=a.snapshot(),right=b.snapshot(),merged=a.merge(left,right);
    assert.deepEqual(JSON.parse(merged.items[PROGRESS]),{});
    assert.deepEqual(a.merge(right,left),merged,'merge direction does not change reset outcome');
  });
  await test('a reset followed by one new answer does not revive the previous ten attempts',()=>{
    const old={q1:{attempts:0,correct:0,wrong:0}};
    const a=harness(),r=old.q1;for(let i=0;i<10;i++)a.s.__mdLearningIntegrity.appendOutcome(r,'sure',false);
    a.write(PROGRESS,old);const stale=a.snapshot();
    assert.equal(a.api.resetKey(PROGRESS,'{}'),true);
    const rec={};a.s.__mdLearningIntegrity.appendOutcome(rec,'sure',false);a.write(PROGRESS,{q1:rec});
    const generation=copy(a.load().itemMeta[PROGRESS].generation);
    const merged=a.merge(a.snapshot(),stale),progress=JSON.parse(merged.items[PROGRESS]);
    assert.equal(progress.q1.attempts,1);assert.equal(progress.q1.correct,1);
    assert.deepEqual(merged.itemMeta[PROGRESS].generation,generation);
    const again=a.merge({items:merged.items,itemMeta:merged.itemMeta,updatedAt:a.load().localUpdatedAt},stale);
    assert.deepEqual(again,merged,'repeated old snapshots remain harmless');
  });
  await test('newer explicit resets win over newer ordinary writes from an older generation',()=>{
    const a=harness({[PROGRESS]:{q1:{correct:3}}});a.api.resetKey(PROGRESS,'{}');
    const first=a.snapshot();a.tick(10000);a.api.resetKey(PROGRESS,'{}');const second=a.snapshot();
    const edited=copy(first);edited.items[PROGRESS]=JSON.stringify({old:{correct:100}});
    edited.itemMeta[PROGRESS].updatedAt='2026-10-04T00:00:00.000Z';edited.updatedAt=edited.itemMeta[PROGRESS].updatedAt;
    assert.deepEqual(JSON.parse(a.merge(second,edited).items[PROGRESS]),{});
  });
  await test('reset advances a previously observed generation when the device clock moves backward',()=>{
    const h=harness({[PROGRESS]:{q1:{correct:3}}});h.api.resetKey(PROGRESS,'{}');const old=h.snapshot();
    h.tick(-86400000);h.api.resetKey(PROGRESS,'{}');const next=h.snapshot();
    assert.ok(Date.parse(next.itemMeta[PROGRESS].generation.updatedAt)>Date.parse(old.itemMeta[PROGRESS].generation.updatedAt));
    const stale=copy(old);stale.items[PROGRESS]=JSON.stringify({q1:{correct:3}});
    assert.deepEqual(JSON.parse(h.merge(next,stale).items[PROGRESS]),{});
  });
  await test('metadata storage failure leaves reset values and metadata intact',()=>{
    const h=harness({[PROGRESS]:{q1:{correct:3}}}),before=h.snapshot();h.failures.metadata=true;
    assert.equal(h.api.resetKey(PROGRESS,'{}'),false);assert.deepEqual(h.snapshot(),before);assert.equal(h.warnings.length,1);
  });
  await test('failed value write rolls the reset generation back',()=>{
    const h=harness({[PROGRESS]:{q1:{correct:3}}}),before=h.snapshot();h.failures.key=PROGRESS;
    assert.equal(h.api.resetKey(PROGRESS,'{}'),false);assert.deepEqual(h.snapshot(),before);assert.equal(h.warnings.length,1);
  });
  await test('deleting one branch is not cancelled by a later unrelated question edit',()=>{
    const old={q1:{correct:3},q2:{correct:1}},a=harness({[PROGRESS]:old}),b=harness({[PROGRESS]:old});
    a.write(PROGRESS,{q2:old.q2});b.tick(10000);b.write(PROGRESS,{q1:old.q1,q2:{correct:2}});
    const m=a.merge(a.snapshot(),b.snapshot());assert.equal(JSON.parse(m.items[PROGRESS]).q1,undefined);assert.equal(JSON.parse(m.items[PROGRESS]).q2.correct,2);
  });
  await test('a genuinely newer update to a deleted branch is retained',()=>{
    const old={q1:{correct:3}},a=harness({[PROGRESS]:old}),b=harness({[PROGRESS]:old});
    a.write(PROGRESS,{});b.tick(10000);b.write(PROGRESS,{q1:{correct:4}});
    assert.equal(JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[PROGRESS]).q1.correct,4);
  });
  await test('recreating a deleted question does not inherit fields or counters from before deletion',()=>{
    const h=harness(),oldRec={};for(let i=0;i<10;i++)h.s.__mdLearningIntegrity.appendOutcome(oldRec,'sure',false);
    oldRec.obsoleteFlag=true;h.write(PROGRESS,{q1:oldRec});const before=h.snapshot();
    h.write(PROGRESS,{});const newRec={};h.s.__mdLearningIntegrity.appendOutcome(newRec,'sure',false);h.write(PROGRESS,{q1:newRec});
    const result=JSON.parse(h.merge(h.snapshot(),before).items[PROGRESS]);assert.equal(result.q1.attempts,1);assert.equal(result.q1.obsoleteFlag,undefined);
  });
  await test('same-millisecond recreation timestamps still merge in either direction identically',()=>{
    const h=harness(),meta={[PROGRESS]:{updatedAt:T0,fields:{q1:{updatedAt:T0,deleted:true},'q1/note':{updatedAt:T0,deleted:false}}}};
    const a={items:{[PROGRESS]:JSON.stringify({q1:{note:'a'}})},itemMeta:copy(meta),updatedAt:T0};
    const b={items:{[PROGRESS]:JSON.stringify({q1:{note:'b'}})},itemMeta:copy(meta),updatedAt:T0};
    assert.deepEqual(h.merge(a,b),h.merge(b,a));
  });
  await test('independent legacy focus sets survive an idle application sync',async()=>{
    const base={ts:1,ids:[1],dayNum:1},aSet={ts:2,ids:[2],dayNum:2},bSet={ts:3,ids:[3],dayNum:2};
    const a=harness({[HISTORY]:[base]}),b=harness({[HISTORY]:[base]});a.write(HISTORY,[aSet,base]);b.tick(10000);b.write(HISTORY,[bSet,base]);
    a.remote={app:'Maritime Drill',revision:1,...b.snapshot()};await a.s.driveSyncOnce();
    assert.deepEqual(a.read(HISTORY).map(entry=>entry.ts),[3,2,1]);
    assert.deepEqual(JSON.parse(a.remote.items[HISTORY]).map(entry=>entry.ts),[3,2,1]);assert.equal(a.calls.apply,1);
  });
  await test('a replay with an immutable session ID updates instead of duplicating its history entry',()=>{
    const entry={sessionId:'session-a',ts:1,ids:[1],dayNum:1,replayCount:0};
    const a=harness({[HISTORY]:[entry]}),b=harness({[HISTORY]:[entry]});b.write(HISTORY,[{...entry,ts:2,replayCount:1}]);
    const history=JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[HISTORY]);assert.equal(history.length,1);assert.equal(history[0].replayCount,1);
  });
  await test('replaying an old history entry promotes its existing identity before its timestamp changes',()=>{
    const entry={ts:1,ids:[1],dayNum:1,replayCount:0};
    const a=harness({[HISTORY]:[entry]}),b=harness({[HISTORY]:[entry]});
    b.write(HISTORY,[{...entry,ts:2,replayCount:1}]);
    assert.equal(b.read(HISTORY)[0].sessionId,b.api.historySessionId(entry));
    const history=JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[HISTORY]);assert.equal(history.length,1);assert.equal(history[0].replayCount,1);
  });
  await test('legacy sets with equal Day and question IDs keep distinct timestamp identities',()=>{
    const first={ts:2,ids:[7,8],dayNum:2,replayCount:0},second={ts:1,ids:[7,8],dayNum:2,replayCount:0};
    const third={sessionId:'new-modern',ts:3,ids:[9],dayNum:3,replayCount:0};
    const h=harness({[HISTORY]:[first,second]}),before=h.snapshot();h.write(HISTORY,[first,second,third]);
    const local=h.read(HISTORY);assert.notEqual(local[0].sessionId,local[1].sessionId);
    const history=JSON.parse(h.merge(h.snapshot(),before).items[HISTORY]);assert.equal(history.length,3);assert.deepEqual(history.map(entry=>entry.ts),[3,2,1]);
  });
  await test('deleting a history entry survives a newer unrelated history addition',()=>{
    const one={sessionId:'one',ts:1,ids:[1]},two={sessionId:'two',ts:2,ids:[2]},three={sessionId:'three',ts:3,ids:[3]};
    const a=harness({[HISTORY]:[two,one]}),b=harness({[HISTORY]:[two,one]});a.write(HISTORY,[two]);b.tick(10000);b.write(HISTORY,[three,two,one]);
    assert.deepEqual(JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[HISTORY]).map(entry=>entry.sessionId),['three','two']);
  });
  await test('explicit focus clear removes remote-only sets even when local history is already empty',()=>{
    const a=harness({[HISTORY]:[]}),b=harness({[HISTORY]:[{sessionId:'remote-only',ts:1,ids:[1]}]});
    assert.equal(a.api.resetKey(HISTORY,'[]'),true);b.tick(10000);b.write(HISTORY,[{sessionId:'remote-only',ts:1,ids:[1]},{sessionId:'old-generation-new',ts:2,ids:[2]}]);
    assert.deepEqual(JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[HISTORY]),[]);
  });
  await test('deleting the last local focus set preserves an unseen set from another device',()=>{
    const local={sessionId:'local',ts:1,ids:[1]},remote={sessionId:'remote',ts:2,ids:[2]};
    const a=harness({[HISTORY]:[local]}),b=harness({[HISTORY]:[remote]});a.write(HISTORY,[]);
    assert.equal(a.load().itemMeta[HISTORY].generation,undefined);
    assert.deepEqual(JSON.parse(a.merge(a.snapshot(),b.snapshot()).items[HISTORY]),[remote]);
    assert.deepEqual(JSON.parse(a.merge(b.snapshot(),a.snapshot()).items[HISTORY]),[remote]);
  });
  await test('merged history keeps the latest 100 sessions deterministically',()=>{
    const entries=Array.from({length:160},(_,i)=>({sessionId:'s'+i,ts:i+1,ids:[i]}));
    const a=harness({[HISTORY]:entries.slice(0,80)}),b=harness({[HISTORY]:entries.slice(80)});
    const m=a.merge(a.snapshot(),b.snapshot()),history=JSON.parse(m.items[HISTORY]);assert.equal(history.length,100);assert.equal(history[0].ts,160);assert.equal(history[99].ts,61);
    assert.deepEqual(a.merge(b.snapshot(),a.snapshot()),m);
  });
  await test('the commit identity helper retains the same device ID across calls',()=>{
    const h=harness();assert.equal(h.s.__mdLearningIntegrity.getDeviceId(),'counter-device-a');assert.equal(h.s.__mdLearningIntegrity.getDeviceId(),'counter-device-a');
  });
  await test('independent homework commit identities survive merging and keep the latest 64',()=>{
    const h=harness(),aIds=Array.from({length:50},(_,i)=>'device-a|'+(i+1)+'|q|0'),bIds=Array.from({length:50},(_,i)=>'device-b|'+(i+51)+'|q|0');
    const left={q1:{homeworkCommitIds:aIds}},right={q1:{homeworkCommitIds:bIds}};
    const a={items:{[PROGRESS]:JSON.stringify(left)},itemMeta:{},updatedAt:T0},b={items:{[PROGRESS]:JSON.stringify(right)},itemMeta:{},updatedAt:T0};
    const m=h.merge(a,b),ids=JSON.parse(m.items[PROGRESS]).q1.homeworkCommitIds;
    assert.equal(ids.length,64);assert.equal(ids[0],'device-a|37|q|0');assert.equal(ids[63],'device-b|100|q|0');
    assert.deepEqual(h.merge(b,a),m);
  });
  await test('numeric string and malformed remote counters cannot replace a valid local count',()=>{
    const h=harness(),a={items:{[PROGRESS]:JSON.stringify({q1:{correct:7,attempts:9}})},itemMeta:{},updatedAt:T0};
    for(const value of ['3','ordinary text',null,{value:3},-5]){
      const b={items:{[PROGRESS]:JSON.stringify({q1:{correct:value,attempts:value}})},itemMeta:{},updatedAt:'2026-10-04T00:00:00.000Z'};
      const merged=h.merge(a,b),row=JSON.parse(merged.items[PROGRESS]).q1;
      assert.equal(row.correct,7);assert.equal(row.attempts,9);assert.deepEqual(h.merge(b,a),merged);
    }
  });
  console.log('sync audit regression tests: PASS ('+passed+' cases)');
})().catch(error=>{console.error(error);process.exitCode=1});
