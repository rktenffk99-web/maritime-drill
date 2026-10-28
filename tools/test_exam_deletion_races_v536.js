'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {harness}=require('./test_exam_sessions_v530');
const clone=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};

function linkedTabs(){
  const data=new Map();
  let state={enabled:false,revision:1,localUpdatedAt:'2026-10-28T00:00:00.000Z',itemMeta:{}};
  function tab(){
    const h=harness(data),s=h.s,warnings=[];
    let beforeRawSet=null;
    class Storage{
      get length(){return data.size}
      key(i){return [...data.keys()][i]||null}
      getItem(key){return data.has(String(key))?data.get(String(key)):null}
      setItem(key,value){
        if(beforeRawSet){const callback=beforeRawSet;beforeRawSet=null;callback(key,value);}
        data.set(String(key),String(value));
      }
      removeItem(key){data.delete(String(key))}
    }
    Object.assign(s,{Storage,localStorage:new Storage(),DRIVE_SYNC_STATE_KEY:'md_drive_sync_state_v1',
      driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,
      driveSyncOnce:async()=>{},driveSyncInstallStorageHooks(){},driveSyncHasToken:()=>false,
      driveSyncLoadState:()=>clone(state),driveSyncSaveState(next){state=clone(next);return true},
      driveSyncNowIso:()=>new Date().toISOString(),driveSyncRefreshPanel(){},
      isManagedStorageKey:key=>key.startsWith('md_'),confirm:()=>true,
      showStorageWarning:(label,error)=>warnings.push({label,error}),
      document:{querySelectorAll:()=>[]},
    });
    vm.runInContext(fs.readFileSync('drive-sync-v2.js','utf8'),s);
    s.driveSyncInstallStorageHooks();
    s.safeStorageSet=(key,raw)=>{
      try{s.localStorage.setItem(key,raw);return true}
      catch(error){s.showStorageWarning('시험별 답안',error);return false}
    };
    return {...h,warnings,beforeSet:callback=>{beforeRawSet=callback}};
  }
  const writer=tab();assert.equal(writer.s.savePastProgress(),true);
  const id=writer.s.pastProgressId,key=writer.s.__mdExamSessions.PREFIX+id;
  const deleter=tab();deleter.s.currentMode='home';
  return {tab,writer,deleter,data,id,key,get meta(){return state.itemMeta}};
}

async function sync(tab,remote){
  const {s,data}=tab;let uploaded=null;
  const enabled=s.driveSyncLoadState();enabled.enabled=true;s.driveSyncSaveState(enabled);
  const collect=()=>Object.fromEntries([...data].filter(([key])=>key.startsWith('md_')));
  Object.assign(s,{navigator:{onLine:true},location:{reload(){}},driveSyncBusy:false,driveSyncLastError:'',
    driveSyncHasToken:()=>true,driveSyncRequestToken:async()=>{},BACKUP_SCHEMA_VERSION:1,APP_VERSION:'test',
    collectBackupItems:collect,createAutomaticRestorePoint:()=>true,backupNotice(){},alert(){},
    applyBackupSnapshot(entries){for(const key of Object.keys(collect()))s.localStorage.removeItem(key);for(const [key,raw] of entries)s.localStorage.setItem(key,raw)},
    driveSyncFindRemoteFile:async()=>remote?{id:'remote',modifiedTime:remote.updatedAt}:null,
    driveSyncDownloadPayload:async()=>clone(remote),
    driveSyncUploadRemote:async(id,payload)=>{uploaded=clone(payload);return {modifiedTime:payload.updatedAt}},
    driveSyncCreateRemote:async payload=>{uploaded=clone(payload);return 'new-remote'},
  });
  await s.driveSyncOnce();return uploaded;
}

async function run(){
  for(const boundary of ['checkpoint','old-value']){
    const h=linkedTabs(),{writer,deleter,id,key,data}=h;
    data.set('md_past_history_v1','{"submitted":1}');
    data.set('md_past_wrongs_v1','{"kept":true}');
    const scores=data.get('md_past_history_v1'),wrongs=data.get('md_past_wrongs_v1');
    writer.s.pastAnswers[0]=1;
    const remove=()=>{
      assert.equal(deleter.s.deletePastProgress(id),true);
      assert.equal(h.meta[key].deleted,true);assert.equal(data.has(key),false);
    };
    if(boundary==='checkpoint'){
      const save=writer.s.safeStorageSet;
      writer.s.safeStorageSet=(k,raw)=>{writer.s.safeStorageSet=save;remove();return save(k,raw)};
    }else writer.beforeSet(remove);
    assert.equal(writer.s.savePastProgress(),false);
    assert.equal(h.meta[key].deleted,true);assert.equal(data.has(key),false);
    assert.equal(deleter.s.getPastProgress(id),null);
    assert.equal(writer.warnings.length,1);
    assert.equal(data.get('md_past_history_v1'),scores);assert.equal(data.get('md_past_wrongs_v1'),wrongs);
  }
  console.log('PASS concurrent deletion survives saves after checkpoint and after old-value capture; scores and wrongs remain');

  {
    const h=linkedTabs(),{writer,deleter,id,key,data}=h,raw=data.get(key);
    assert.equal(deleter.s.deletePastProgress(id),true);
    // A stale same-value write must still hit the terminal-deletion check.
    data.set(key,raw);
    assert.equal(writer.s.safeStorageSet(key,raw),false);
    assert.equal(data.has(key),false);assert.equal(h.meta[key].deleted,true);
  }
  console.log('PASS identical stale writes cannot bypass the deletion check');

  for(const perKey of [false,true]){
    const h=linkedTabs(),{writer,deleter,id,key,data}=h,s=writer.s,raw=data.get(key),save=s.driveSyncSaveState;
    s.pastAnswers[0]=2;
    const racingSave=next=>{
      if(perKey)s.__mdDriveStateCodec.saveForKey=save;else s.driveSyncSaveState=save;
      assert.equal(deleter.s.deletePastProgress(id),true);
      return save(next); // The old state intentionally erases the shared mirror.
    };
    if(perKey)s.__mdDriveStateCodec={loadForKey:s.driveSyncLoadState,saveForKey:racingSave};else s.driveSyncSaveState=racingSave;
    assert.equal(s.savePastProgress(),false);assert.equal(h.meta[key].deleted,false);
    assert.equal(s.__mdDriveSyncV2.isExamDeleted(key),true);assert.equal(data.has(key),false);
    assert.equal(s.savePastProgress(),false);assert.equal(deleter.s.getPastProgress(id),null);
    data.set(key,raw); // Even an old tab's unhooked raw write is excluded from sync.
    const uploaded=await sync(writer,null);
    assert.ok(uploaded);assert.equal(uploaded.items[key],undefined);assert.equal(uploaded.itemMeta[key].deleted,true);
    assert.equal(deleter.s.getPastProgress(id),null);
  }
  console.log('PASS deletion markers survive the whole-state and codec read/save gaps and upload terminal Drive tombstones');

  {
    const h=linkedTabs(),s=h.deleter.s;s.driveSyncSaveState=()=>false;
    assert.equal(s.deletePastProgress(h.id),true);assert.equal(h.data.has(h.key),false);
    assert.equal(s.__mdDriveSyncV2.localExamDeletions()[h.key].deleted,true);
    assert.equal(s.getPastProgress(h.id),null);
  }
  console.log('PASS a failed shared metadata mirror cannot undo a committed deletion marker');

  for(const failMarker of [false,true]){
    const h=linkedTabs(),s=h.deleter.s,before=s.driveSyncLoadState(),raw=h.data.get(h.key);
    const remote={app:'Maritime Drill',revision:2,updatedAt:'2026-10-28T01:00:00.000Z',items:{},itemMeta:{[h.key]:{deleted:true,updatedAt:'2026-10-28T01:00:00.000Z',fields:{},history:{}}}};
    if(failMarker){const set=s.driveSyncOriginalSetItem;s.driveSyncOriginalSetItem=function(key,value){if(key.startsWith('maritime-drill:deleted-exam:v3:'))throw new Error('marker full');return set.call(this,key,value)}}
    await sync(h.deleter,remote);
    if(failMarker){assert.equal(h.data.get(h.key),raw);assert.match(s.driveSyncLastError,/marker full/);}
    else{
      assert.equal(h.data.has(h.key),false);assert.equal(s.__mdDriveSyncV2.isExamDeleted(h.key),true);
      s.driveSyncSaveState(before);h.writer.s.pastAnswers[0]=3;
      assert.equal(h.writer.s.savePastProgress(),false);assert.equal(h.data.has(h.key),false);
    }
  }
  console.log('PASS accepted remote deletions gain durable markers; a failed marker write leaves the original exam intact');

  for(const stage of ['questions','analysis']){
    const h=linkedTabs(),{deleter,id,key,data}=h;
    if(stage==='analysis'){
      const record=JSON.parse(data.get(key));record.meta.returnView='navi3-frequency';data.set(key,JSON.stringify(record));
    }
    const reader=h.tab(),s=reader.s,entered=deferred(),gate=deferred();
    s.currentMode='home';
    s[stage==='questions'?'ensurePastDataForSubject':'ensureNavi3FrequencyData']=()=>{entered.resolve();return gate.promise};
    const before={queue:s.pastQueue,answers:s.pastAnswers,id:s.pastProgressId};
    const pending=s.resumePastProgress(id);await entered.promise;
    assert.equal(deleter.s.deletePastProgress(id),true);
    gate.resolve();await pending;
    assert.equal(s.currentMode,'past-resume-error');assert.match(s.app.innerHTML,/삭제되거나 변경/);
    assert.equal(s.pastQueue,before.queue);assert.equal(s.pastAnswers,before.answers);assert.equal(s.pastProgressId,before.id);
    assert.equal(data.has(key),false);assert.equal(h.meta[key].deleted,true);
  }
  console.log('PASS deletions during question loading and the final analysis await never activate a deleted exam');

  {
    const h=linkedTabs(),reader=h.tab(),s=reader.s,gate=deferred();s.currentMode='home';
    s.ensurePastDataForSubject=()=>gate.promise;
    const selected=s.getPastProgress(h.id),pending=s.resumePastProgress(h.id,selected.headId);
    const next=JSON.parse(h.data.get(h.key)),old=next.heads[selected.headId];
    next.heads={replacement:{...old,clock:{...old.clock,later:1},state:{...old.state,idx:1}}};
    h.data.set(h.key,JSON.stringify(next));gate.resolve();await pending;
    assert.equal(s.currentMode,'past-resume-error');assert.equal(s.pastProgressId,null);
  }
  console.log('PASS a superseded answer head is never silently substituted during resume');

  for(const failure of [false,true]){
    const h=linkedTabs(),reader=h.tab(),s=reader.s,gate=deferred();s.currentMode='home';
    s.ensurePastDataForSubject=()=>gate.promise;
    let gradeChanges=0;s.n3aActivateGrade=()=>{gradeChanges++};
    const before={queue:s.pastQueue,answers:s.pastAnswers},pending=s.resumePastProgress(h.id);
    s.currentMode='home';s.app.innerHTML='new selected screen';
    if(failure)gate.reject(new Error('late load failure'));else gate.resolve();
    await pending;
    assert.equal(s.currentMode,'home');assert.equal(s.app.innerHTML,'new selected screen');
    assert.equal(s.pastQueue,before.queue);assert.equal(s.pastAnswers,before.answers);assert.equal(gradeChanges,0);
  }
  console.log('PASS late resume success or failure preserves a newer screen and its state');
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1});
module.exports={run};
