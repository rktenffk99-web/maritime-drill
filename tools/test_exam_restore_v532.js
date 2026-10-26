'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {harness:examHarness}=require('./test_exam_sessions_v530');
const box={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'test_backup_restore_safety.js'),'utf8').split('\nlet count=0;')[0]+'\nmodule.exports=harness;',box);
const backupHarness=box.module.exports,clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const exam=examHarness(),h=backupHarness();exam.s.pastIdx=50;exam.s.pastAnswers=Array.from({length:125},(_,i)=>i<50?i%4:null);exam.s.pastQueue[12]._mockHintViewed=true;exam.s.savePastProgress();
 const api=exam.s.__mdExamSessions,key=api.PREFIX+exam.s.pastProgressId,raw=exam.data.get(key);
 h.s.__mdExamSessions=api;return {h,api,key,raw,record:JSON.parse(raw)};
}
function liveBackupFixture({legacy=false}={}){
 const h=backupHarness(),exam=examHarness(),s=h.s,events={};
 for(const [key,value]of Object.entries(exam.s))if(!(key in s)&&!['window','__mdExamSessions'].includes(key))s[key]=value;
 s.currentMode='past';s.crypto=exam.s.crypto;
 s.addEventListener=(name,callback)=>events[name]=callback;
 s.document={visibilityState:'hidden',addEventListener:(name,callback)=>events[name]=callback};
 s.capturePastProgressState=()=>({id:s.pastProgressId,idx:s.pastIdx,answers:s.pastAnswers,mode:s.pastMode,startedAt:s.pastStartedAt,savedAt:Date.now(),hintedIndices:s.pastQueue.flatMap((q,i)=>q._mockHintViewed?[i]:[])});
 s.renderPastCard=()=>s.savePastProgress();
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','exam-sessions.js'),'utf8'),s);
 s.pastIdx=50;s.pastAnswers=Array.from({length:125},(_,i)=>i<50?i%4:null);assert.equal(s.savePastProgress(),true);
 const key=s.__mdExamSessions.PREFIX+s.pastProgressId,raw=s.localStorage.getItem(key);
 const app=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const importStart=app.indexOf('function importAllLearningData(){'),importEnd=app.indexOf('// ── v5.08:',importStart);
 let importCode=app.slice(importStart,importEnd);if(legacy)importCode=importCode.replace("currentMode='backup-reloading'; // backup-reload-autosave-guard-v533",'// legacy active mode retained');
 vm.runInContext(importCode,s);
 const nav=fs.readFileSync(path.join(__dirname,'..','app-navigation.js'),'utf8');
 const start=nav.indexOf('  // Homework checkpoints follow'),end=nav.indexOf('  mountToolbar();',start);assert.ok(start>=0&&end>start);vm.runInContext(nav.slice(start,end),s);
 let savedAfterApply,saveResults=[];
 s.location.reload=()=>{
  h.calls.reload++;savedAfterApply=h.stored();
  events.pagehide();events.visibilitychange();events.offline();
  saveResults.push(s.savePastProgress());
 };
 function importItems(items){
  const payload=JSON.stringify({app:'Maritime Drill',appVersion:'5.32',exportedAt:'2026-10-20T00:00:00Z',items});
  const input={files:[{size:payload.length}],click(){this.onchange()}};
  s.document.createElement=()=>input;
  s.FileReader=class{readAsText(){this.result=payload;this.onload()}};
  s.importAllLearningData();
 }
 return {...h,key,raw,events,importItems,get savedAfterApply(){return savedAfterApply},get saveResults(){return saveResults}};
}
(async()=>{
 const {h,api,key,raw,record}=fixture();h.write(key,JSON.parse(raw));h.point({md_other:'1'});h.s.restoreAutomaticRestorePoint();
 const deletion=clone(h.s.driveSyncLoadState().itemMeta[key]);assert.equal(deletion.deleted,true);
 h.s.restoreAutomaticRestorePoint();const items=h.s.collectBackupItems(),freshKey=Object.keys(items).find(k=>k.startsWith(api.PREFIX));
 assert.ok(freshKey);assert.notEqual(freshKey,key);assert.equal(items[key],undefined);
 const output=h.s.__mdDriveSyncV2.mergeSnapshots(items,{},h.s.driveSyncLoadState().itemMeta,{[key]:deletion},'2099-01-01','2000-01-01');
 assert.equal(output.items[freshKey],items[freshKey]);assert.equal(output.items[key],undefined);
 assert.match(h.alerts.at(-1),/새 시험 번호/);
 const fresh=JSON.parse(items[freshKey]),oldHead=Object.values(record.heads)[0],newHead=Object.values(fresh.heads)[0];
 assert.deepEqual(fresh.meta.refs,record.meta.refs);assert.deepEqual(newHead.state,{...oldHead.state,id:fresh.meta.id});assert.equal(fresh.meta.restoredFrom,record.meta.id);
 const runtime=examHarness(new Map(Object.entries(output.items)));runtime.s.currentMode='home';await runtime.s.resumePastProgress(fresh.meta.id);
 assert.equal(runtime.s.currentMode,'past');assert.equal(runtime.s.pastIdx,50);assert.deepEqual(clone(runtime.s.pastAnswers),oldHead.state.answers);assert.equal(runtime.s.pastQueue[12]._mockHintViewed,true);
 console.log('PASS undo -> sync deletion -> undo restore survives next sync with all 50 answers, question order, cursor and hint');
 const offline=fixture();offline.h.s.mergeImportedBackupEntries([[offline.key,offline.raw]],{exportedAt:'2000-01-01'});
 const imported=offline.h.s.collectBackupItems(),importKey=Object.keys(imported).find(k=>k.startsWith(api.PREFIX));
 const recovered=offline.h.s.__mdDriveSyncV2.mergeSnapshots(imported,{},offline.h.s.driveSyncLoadState().itemMeta,{[offline.key]:deletion},'2000-01-01','2099-01-01');
 assert.notEqual(importKey,offline.key);assert.ok(recovered.items[importKey]);assert.equal(recovered.items[offline.key],undefined);
 console.log('PASS explicit file import survives a remote deletion this offline device had not seen');
 const conflict=clone(record),head=Object.values(conflict.heads)[0];conflict.heads.other={...clone(head),clock:{other:1}};conflict.heads.other.state.answers[0]=3;
 const restored=Object.values(api.restoreItems({[key]:JSON.stringify(conflict)})).map(JSON.parse)[0];
 assert.equal(Object.keys(restored.heads).length,2);assert.deepEqual(Object.values(restored.heads).map(h=>h.state.answers[0]).sort(),[0,3]);
 assert.ok(Object.values(restored.heads).every(h=>Object.keys(h.clock).length===1&&h.state.id===restored.meta.id));
 console.log('PASS restore retains concurrent answer branches without mixing or causal dominance');
 const completed=clone(record);Object.values(completed.heads)[0].status='completed';const done=api.restoreItems({[key]:JSON.stringify(completed)});
 assert.equal(Object.keys(done)[0],key);assert.equal(JSON.parse(done[key]).meta.refs,undefined);
 console.log('PASS completed backups remain compact completed markers, never resume cards');
 const rollback=fixture();rollback.h.write('md_existing',{keep:true});rollback.h.point({[key]:raw});const before=rollback.h.stored();
 rollback.h.failures.set=k=>k.startsWith(api.PREFIX)&&k!==key;rollback.h.s.restoreAutomaticRestorePoint();
 assert.deepEqual(rollback.h.stored(),before);assert.equal(rollback.h.calls.reload,0);assert.match(rollback.h.alerts.at(-1),/그대로 보존/);
 console.log('PASS failed fresh-ID write rolls back data, deletion metadata and recovery point exactly');
 for(const value of ['{bad',JSON.stringify({...record,meta:{...record.meta,id:'wrong'}}),JSON.stringify({...record,heads:{}})]){
  const broken=fixture();broken.h.point({[key]:value});const prior=broken.h.stored();broken.h.s.restoreAutomaticRestorePoint();assert.deepEqual(broken.h.stored(),prior);assert.equal(broken.h.calls.reload,0);
  assert.throws(()=>broken.h.s.mergeImportedBackupEntries([[key,value]],{exportedAt:'2099-01-01'}));assert.deepEqual(broken.h.stored(),prior);
 }
 console.log('PASS malformed or mismatched exam backups cannot alter data through restore or import');
 const legacy=liveBackupFixture({legacy:true});legacy.s.pastAnswers[50]=2;
 legacy.importItems({md_external:'"restored"'});
 assert.equal(legacy.calls.reload,1);assert.notEqual(legacy.stored()[legacy.key],legacy.savedAfterApply[legacy.key]);
 console.log('PASS pre-fix reproduction: import reload lifecycle rewrites the verified snapshot with stale live answers');
 const live=liveBackupFixture();live.s.pastAnswers[50]=2;live.importItems({[live.key]:live.raw,md_external:'"restored"'});
 assert.equal(live.calls.reload,1);assert.equal(live.s.currentMode,'backup-reloading');assert.deepEqual(live.stored(),live.savedAfterApply);assert.deepEqual(live.saveResults,[false]);
 live.s.__mdHomeworkPersistence={checkpoint:()=>false};let unloadBlocked=false;live.events.beforeunload({preventDefault(){unloadBlocked=true}});assert.equal(unloadBlocked,false);
 const restoredKeys=Object.keys(live.savedAfterApply).filter(k=>k.startsWith(live.s.__mdExamSessions.PREFIX));assert.equal(restoredKeys.length,2);
 assert.ok(restoredKeys.every(k=>Object.values(JSON.parse(live.savedAfterApply[k]).heads).every(head=>head.status==='active')));
 assert.equal(live.s.driveSyncLoadState().itemMeta[live.key].deleted,false);
 console.log('PASS successful import suspends pagehide/visibility/offline/direct autosaves without completing either exam or changing sync metadata');
 const undoLive=liveBackupFixture();undoLive.point({[undoLive.key]:undoLive.raw});undoLive.s.pastAnswers[50]=2;undoLive.s.restoreAutomaticRestorePoint();
 assert.equal(undoLive.calls.reload,1);assert.equal(undoLive.s.currentMode,'backup-reloading');assert.deepEqual(undoLive.stored(),undoLive.savedAfterApply);assert.deepEqual(undoLive.saveResults,[false]);
 assert.equal(undoLive.stored()[undoLive.key],undefined);assert.equal(undoLive.s.driveSyncLoadState().itemMeta[undoLive.key].deleted,true);
 const restoredUndo=Object.keys(undoLive.stored()).find(k=>k.startsWith(undoLive.s.__mdExamSessions.PREFIX));assert.ok(restoredUndo);assert.notEqual(restoredUndo,undoLive.key);assert.ok(Object.values(JSON.parse(undoLive.stored()[restoredUndo]).heads).every(head=>head.status==='active'));
 console.log('PASS successful automatic restore keeps the new active exam and old tombstone intact during reload');
 for(const operation of ['restore','import']){
  const failed=liveBackupFixture();failed.s.pastAnswers[50]=2;failed.failures.set=k=>k==='md_fail';
  if(operation==='restore'){failed.point({md_fail:'1'});failed.s.restoreAutomaticRestorePoint();}else failed.importItems({md_fail:'1'});
  assert.equal(failed.calls.reload,0);assert.equal(failed.s.currentMode,'past');assert.equal(failed.s.pastAnswers[50],2);failed.failures.set=null;assert.equal(failed.s.savePastProgress(),true);
  assert.equal(Object.values(JSON.parse(failed.stored()[failed.key]).heads)[0].state.answers[50],2);
 }
 console.log('PASS failed restore/import keeps the original active mode and permits saving retained live answers');
 const reloadFailure=liveBackupFixture();reloadFailure.point({md_external:'"restored"'});const beforeReloadFailure=reloadFailure.stored();reloadFailure.s.location.reload=()=>{throw Error('reload blocked')};reloadFailure.s.restoreAutomaticRestorePoint();
 assert.equal(reloadFailure.s.currentMode,'past');assert.deepEqual(reloadFailure.stored(),beforeReloadFailure);assert.equal(reloadFailure.s.savePastProgress(),true);
 console.log('PASS reload exception restores the previous active mode and rolls back the restore transaction');
})().catch(error=>{console.error(error);process.exitCode=1});
