'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {harness}=require('./test_exam_sessions_v530');
const clone=value=>JSON.parse(JSON.stringify(value));

function withStorageHooks(h){
  const {s,data}=h;
  let state={enabled:true,revision:1,localUpdatedAt:'2026-10-28T00:00:00.000Z',itemMeta:{}};
  let failMetadata=false,failMarker=false,syncs=0,confirmText='',allowDelete=false;
  const removed=[],warnings=[],notices=[];
  class Storage{
    get length(){return data.size}
    key(i){return [...data.keys()][i]||null}
    getItem(key){return data.has(String(key))?data.get(String(key)):null}
    setItem(key,value){if(failMarker&&String(key).startsWith('maritime-drill:deleted-exam:v3:'))throw new Error('marker storage full');data.set(String(key),String(value))}
    removeItem(key){data.delete(String(key))}
  }
  const storage=new Storage();
  Object.assign(s,{Storage,localStorage:storage,DRIVE_SYNC_STATE_KEY:'md_drive_sync_state_v1',
    driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,
    driveSyncOnce:async()=>{syncs++},driveSyncInstallStorageHooks(){},driveSyncHasToken:()=>true,
    driveSyncLoadState:()=>clone(state),driveSyncSaveState(next){if(failMetadata)return false;state=clone(next);return true},
    driveSyncNowIso:()=>new Date().toISOString(),driveSyncRefreshPanel(){},
    isManagedStorageKey:key=>key.startsWith(s.__mdExamSessions.PREFIX),
    confirm(text){confirmText=text;return allowDelete},
    showToast:text=>notices.push(text),showStorageWarning:(label,error)=>warnings.push({label,error}),
    document:{querySelectorAll(selector){assert.equal(selector,'[data-past-resume]');return cards}},
  });
  const cards=[];
  s.window=s;
  vm.runInContext(fs.readFileSync('drive-sync-v2.js','utf8'),s);
  s.driveSyncInstallStorageHooks();
  s.driveSyncOnce=async()=>{syncs++};
  return {storage,cards,removed,warnings,notices,
    get meta(){return state.itemMeta},get syncs(){return syncs},get confirmText(){return confirmText},
    allow:()=>{allowDelete=true},deny:()=>{allowDelete=false},fail:()=>{failMarker=true},failMetadata:()=>{failMetadata=true},recover:()=>{failMetadata=false;failMarker=false},
    addCard:id=>cards.push({'getAttribute':name=>name==='data-past-resume'?id:null,remove(){removed.push(id)}})};
}

(async()=>{
  const h=harness(),s=h.s;
  s.savePastProgress();
  const first=s.pastProgressId,firstKey=s.__mdExamSessions.PREFIX+first,firstRaw=h.data.get(firstKey);
  await s.confirmPastProgressReplacement();
  s.pastQueue=s.pastQueue.slice().reverse();s.pastAnswers=Array(125).fill(null);s.pastIdx=0;
  s.savePastProgress();
  const second=s.pastProgressId,secondKey=s.__mdExamSessions.PREFIX+second,secondRaw=h.data.get(secondKey);
  const linked=withStorageHooks(h);
  assert.match(s.renderPastResumeCard(),/class="md-exam-delete"/);
  assert.ok(s.renderPastResumeCard().includes(`deletePastProgress('${first}')`));
  console.log('PASS every saved-exam card has a labeled X delete button');

  linked.addCard(first);linked.addCard(second);
  assert.equal(s.deletePastProgress(first),false);
  assert.equal(h.data.get(firstKey),firstRaw);assert.equal(linked.meta[firstKey],undefined);
  console.log('PASS cancel leaves both saved exams and Drive metadata untouched');

  linked.allow();assert.equal(s.deletePastProgress(first),true);
  assert.equal(h.data.has(firstKey),false);assert.equal(h.data.get(secondKey),secondRaw);
  assert.equal(linked.meta[firstKey].deleted,true);assert.equal(s.getPastProgress(first),null);
  assert.deepEqual(linked.removed,[first]);
  const merge=s.__mdDriveSyncV2.mergeSnapshots({[secondKey]:secondRaw},{[firstKey]:firstRaw,[secondKey]:secondRaw},linked.meta,{},'2026-10-28','2026-10-27');
  assert.equal(merge.items[firstKey],undefined);assert.equal(merge.itemMeta[firstKey].deleted,true);
  await Promise.resolve();assert.equal(linked.syncs,1);
  console.log('PASS one exam disappears with a terminal Drive tombstone; another exam remains resumable');

  s.currentMode='past';assert.equal(s.deletePastProgress(second),false);
  assert.equal(h.data.get(secondKey),secondRaw);
  s.currentMode='home';linked.fail();assert.equal(s.deletePastProgress(second),false);
  assert.equal(h.data.get(secondKey),secondRaw);assert.equal(linked.meta[secondKey],undefined);
  assert.equal(linked.removed.includes(second),false);assert.equal(linked.warnings.length,1);
  console.log('PASS active exam protection and original-record preservation when the deletion marker cannot be stored');

  linked.recover();
  const other=clone(JSON.parse(secondRaw)),head=Object.values(other.heads)[0];
  other.heads.other={...head,clock:{other:1}};
  h.data.set(secondKey,JSON.stringify(other));
  assert.equal(s.__mdExamSessions.list().filter(x=>x.meta.id===second).length,2);
  linked.addCard(second);
  assert.equal(s.deletePastProgress(second),true);
  assert.match(linked.confirmText,/다른 기기에서 저장한 같은 시험/);
  assert.deepEqual(linked.removed,[first,second,second]);
  assert.equal(s.__mdExamSessions.list().length,0);
  console.log('PASS conflicting branches are deleted together and the confirmation explains it');
  await require('./test_exam_deletion_races_v536').run();
})().catch(error=>{console.error(error);process.exitCode=1});
