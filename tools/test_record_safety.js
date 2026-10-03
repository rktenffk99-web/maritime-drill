'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function exportedHarness(file,delimiter,name){
  let source=fs.readFileSync(path.join(__dirname,file),'utf8').split(delimiter)[0];
  if(file==='test_learning_integrity.js')source=source.replace('order:ppChoiceOrder};','order:ppChoiceOrder,setIdx(idx){planSessionIdx=idx},setCommitIds(ids){planSessionCommitIds=ids}};');
  const box={require,__dirname,console,process,module:{exports:null}};
  vm.runInNewContext(source+'\nmodule.exports='+name+';',box);return box.module.exports;
}
const homework=exportedHarness('test_learning_integrity.js','const q={','harness');
const q={_planKey:'navi3|audit',_planGrade:'navi3','정답':0,'선택지':['a','b','c','d']};
test('failed homework progress write keeps the current answer available for one successful retry',()=>{
  const {s,data}=homework();s.__test.setup(q);
  let fail=true,wrongWrites=0;
  s.safeStorageSet=(k,v)=>{if(k==='md_nav23_pass_progress_v1'&&fail)return false;data.set(k,v);return true};
  s.addPastWrong=()=>wrongWrites++;
  s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();
  let snap=s.__test.snapshot();assert.equal(snap.idx,0);assert.equal(snap.progress[q._planKey],undefined);assert.equal(wrongWrites,0);
  const checkpoint=JSON.parse(data.get('md_pass_plan_session_checkpoint_v2'));assert.deepEqual(plain(checkpoint.committed),[]);
  fail=false;s.nextNavigatorPassPlanQuestion();snap=s.__test.snapshot();assert.equal(snap.idx,1);assert.equal(snap.progress[q._planKey].attempts,1);assert.equal(wrongWrites,1);
});
test('saved outcome is not counted twice if its checkpoint was not saved',()=>{
  const {s,data}=homework();s.__test.setup(q);s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();
  assert.equal(s.__test.snapshot().progress[q._planKey].attempts,1);
  // Model restoring the last pre-commit checkpoint with the same session identity.
  const progress=data.get('md_nav23_pass_progress_v1');s.__test.setup(q);data.set('md_nav23_pass_progress_v1',progress);
  s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();assert.equal(s.__test.snapshot().progress[q._planKey].attempts,1);
});
test('checkpoint occurrence ID prevents double counting after stale preceding keys are removed',()=>{
  const {s,data}=homework();const duplicate={...q,_planKey:'navi3|other'};
  s.__test.setup(duplicate);s.__test.setIdx(1);s.chooseNavigatorPassPlanAnswer(1);
  const id=JSON.parse(data.get('md_pass_plan_session_checkpoint_v2')).commitIds[1];
  s.nextNavigatorPassPlanQuestion();assert.equal(s.__test.snapshot().progress[duplicate._planKey].attempts,1);
  s.__test.setup(duplicate);s.__test.setCommitIds([id,null]);s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();
  assert.equal(s.__test.snapshot().progress[duplicate._planKey].attempts,1);
});
test('replaying an older occurrence after a later recall does not count it again',()=>{
  const {s,data}=homework();const duplicate={...q,_planKey:'navi3|other'};
  s.__test.setup(duplicate);s.chooseNavigatorPassPlanAnswer(1);
  const first=JSON.parse(data.get('md_pass_plan_session_checkpoint_v2')).commitIds[0];s.nextNavigatorPassPlanQuestion();
  s.__test.setup(duplicate);s.__test.setCommitIds([null,null]);s.__test.setIdx(1);s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();
  assert.equal(s.__test.snapshot().progress[duplicate._planKey].attempts,2);
  s.__test.setup(duplicate);s.__test.setCommitIds([first,null]);s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();
  assert.equal(s.__test.snapshot().progress[duplicate._planKey].attempts,2);
});
const sync=exportedHarness('test_sync_races.js','let count=0;','harness');
function importing(){
  const h=sync(),s=h.sandbox;
  s.safeStorageSet=(k,v)=>{try{s.localStorage.setItem(k,v);return true}catch(e){return false}};
  s.safeStorageRemove=(k)=>{try{s.localStorage.removeItem(k);return true}catch(e){return false}};
  const a=html.indexOf('function applyBackupEntries('),b=html.indexOf('function restoreAutomaticRestorePoint(',a);
  vm.runInContext(html.slice(a,b),s);
  const start=html.indexOf('function validateImportedBackupEntries('),end=html.indexOf('function importAllLearningData(){',start);
  assert.ok(start>=0);vm.runInContext(html.slice(start,end),s);return h;
}
test('old imports retain newer questions and counters, add missing data, and repeat without changing totals',()=>{
  const h=importing(),s=h.sandbox;
  h.write('md_progress',{q1:{attempts:3,correct:3,wrong:0},q2:{attempts:2,correct:1,wrong:1}});
  const entries=[['md_progress',JSON.stringify({q1:{attempts:1,correct:1,wrong:0},q3:{attempts:1,correct:0,wrong:1}})]];
  const backup={exportedAt:'2020-01-01T00:00:00.000Z'};s.mergeImportedBackupEntries(entries,backup);
  let value=h.progress();assert.equal(value.q1.correct,3);assert.ok(value.q2);assert.ok(value.q3);
  const once=JSON.stringify(value);s.mergeImportedBackupEntries(entries,backup);assert.equal(JSON.stringify(h.progress()),once);
});
test('partly failed import restores both values and change metadata',()=>{
  const h=importing(),s=h.sandbox;
  const before=plain(h.collect()),state=s.localStorage.getItem('md_drive_sync_state_v1');
  const original=s.safeStorageSet;
  s.safeStorageSet=(k,v)=>k==='md_second'?false:original(k,v);
  const entries=[['md_first','{"a":1}'],['md_second','{"b":2}']];
  assert.throws(()=>s.mergeImportedBackupEntries(entries,{exportedAt:'2020-01-01'}),/실패/);
  assert.deepEqual(plain(h.collect()),before);assert.equal(s.localStorage.getItem('md_drive_sync_state_v1'),state);
});
test('wrong-shaped imported learning records are rejected without replacing valid progress',()=>{
  const h=importing(),s=h.sandbox;h.write('md_state_navi3',{boxes:{q1:{box:2,correct:7}}});
  const before=plain(h.collect());
  for(const entries of [
    [['md_state_navi3','{"boxes":"ordinary imported text"}']],
    [['md_nav23_pass_progress_v1','{"q1":"ordinary imported text"}']],
    [['md_focus_history_navi3','{"unexpected":"ordinary imported text"}']],
  ])assert.throws(()=>s.mergeImportedBackupEntries(entries,{exportedAt:'2027-01-01'}),/형식|확인/);
  assert.deepEqual(plain(h.collect()),before);
});
test('malformed imported numeric scalars reject the complete import and preserve counters',()=>{
  const h=importing(),s=h.sandbox;
  h.write('md_state_navi3',{boxes:{q1:{box:2,correct:7,wrong:1,lastStudied:'2026-09-21T00:00:00Z'}}});
  const before=plain(h.collect()),state=s.localStorage.getItem('md_drive_sync_state_v1');
  const bad='3 < 5 & 8 > 6'; // Benign text cannot be a numeric learning value.
  for(const entries of [
    [['md_state_navi3',JSON.stringify({boxes:{q1:{correct:bad,lastStudied:'2026-10-03T00:00:00Z'}}})]],
    [['md_state_navi3',JSON.stringify({boxes:{q1:{typedStats:{attempts:2,bestScore:bad}}}})]],
    [['md_state_navi3',JSON.stringify({boxes:{q1:{typedAttempts:[{score:101}]}}})]],
    [['md_nav23_pass_progress_v1',JSON.stringify({q1:{correct:bad}})]],
    [['md_nav23_pass_progress_v1',JSON.stringify({q1:{_counterBase:{correct:bad}}})]],
    [['md_focus_history_navi3',JSON.stringify([{ts:bad,ids:[1],dayNum:1}])]],
    [['md_focus_history_navi3',JSON.stringify([{ts:1790985600000,ids:[1],dayNum:bad,replayCount:1}])]],
  ])assert.throws(()=>s.mergeImportedBackupEntries([['md_missing','{"text":"keep as data"}'],...entries],{exportedAt:'2027-01-01'}),/숫자/);
  assert.deepEqual(plain(h.collect()),before);assert.equal(s.localStorage.getItem('md_drive_sync_state_v1'),state);
});
test('numeric string imports normalize before merging and retain larger existing counters',()=>{
  const h=importing(),s=h.sandbox;
  h.write('md_state_navi3',{boxes:{q1:{box:2,correct:7,wrong:1,lastStudied:'2026-09-21T00:00:00Z'}}});
  h.write('md_nav23_pass_progress_v1',{q1:{attempts:8,correct:7,wrong:1}});
  const text='답안 3 < 5 & 8 > 6';
  s.mergeImportedBackupEntries([
    ['md_state_navi3',JSON.stringify({boxes:{q1:{correct:'2',wrong:'0',lastStudied:'2026-10-03T00:00:00Z'},
      q2:{box:'1',correct:'1',wrong:'0',typedStats:{attempts:'1',avgScore:'80',avgScoreVerified:'0',bestScore:'80',trend:'-3'},
      typedAttempts:[{date:'2026-10-03T00:00:00Z',score:'80',durationSec:'30',rubricVersion:'1',userAnswer:text}]}}})],
    ['md_nav23_pass_progress_v1',JSON.stringify({q1:{attempts:'2',correct:'2',wrong:'0'}})],
    ['md_focus_history_navi3',JSON.stringify([{ts:'1790985600000',ids:[1],dayNum:'3',replayCount:'2',label:text}])],
  ],{exportedAt:'2027-01-01'});
  const b=JSON.parse(s.localStorage.getItem('md_state_navi3')).boxes,p=JSON.parse(s.localStorage.getItem('md_nav23_pass_progress_v1')).q1,f=JSON.parse(s.localStorage.getItem('md_focus_history_navi3'))[0];
  assert.equal(b.q1.correct,7);assert.equal(b.q1.wrong,1);assert.equal(p.attempts,8);assert.equal(p.correct,7);assert.equal(p.wrong,1);
  assert.equal(b.q2.typedStats.avgScore,80);assert.equal(b.q2.typedStats.avgScoreVerified,0);assert.equal(b.q2.typedAttempts[0].score,80);assert.equal(b.q2.typedAttempts[0].userAnswer,text);assert.equal(b.q2.typedAttempts[0].date,'2026-10-03T00:00:00Z');
  assert.equal(f.ts,1790985600000);assert.equal(f.dayNum,3);assert.equal(f.replayCount,2);assert.equal(f.label,text);
});
test('legacy focus backups receive canonical IDs without import verification failures',()=>{
  const h=importing(),s=h.sandbox,key='md_focus_history_navi3';
  const local={ts:1789948800000,subjectId:'navi3',ids:[1],dayNum:1,replayCount:0};
  const remote={ts:1790985600000,subjectId:'navi3',ids:[2],dayNum:2,replayCount:0};
  // A pre-upgrade storage record did not yet pass through the new write hook.
  s.driveSyncOriginalSetItem.call(s.localStorage,key,JSON.stringify([local]));
  const entries=[[key,JSON.stringify([remote])]];
  s.mergeImportedBackupEntries(entries,{exportedAt:'2027-01-01'});
  const once=JSON.parse(s.localStorage.getItem(key));
  assert.equal(once.length,2);assert.ok(once.every(row=>typeof row.sessionId==='string'&&row.sessionId));
  assert.ok(once.some(row=>row.ts===local.ts));assert.ok(once.some(row=>row.ts===remote.ts));
  s.mergeImportedBackupEntries(entries,{exportedAt:'2027-01-01'});
  assert.deepEqual(JSON.parse(s.localStorage.getItem(key)),once);
});
test('incomplete rollback is reported and does not mislabel remaining values with old metadata',()=>{
  const h=importing(),s=h.sandbox;h.write('md_first',{value:'before'});
  const state=s.localStorage.getItem('md_drive_sync_state_v1'),original=s.safeStorageSet;
  s.safeStorageSet=(k,v)=>k==='md_second'||(k==='md_first'&&v.includes('before'))?false:original(k,v);
  assert.throws(()=>s.mergeImportedBackupEntries([['md_first','{"value":"after"}'],['md_second','{}']],{exportedAt:'2027-01-01'}),/일부 기록을 복구하지 못/);
  assert.equal(JSON.parse(s.localStorage.getItem('md_first')).value,'after');assert.notEqual(s.localStorage.getItem('md_drive_sync_state_v1'),state);
});
console.log(`record-safety regressions: PASS (${passed} cases)`);
