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
})().catch(error=>{console.error(error);process.exitCode=1});
