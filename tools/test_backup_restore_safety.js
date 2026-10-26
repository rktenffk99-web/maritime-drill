'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'test_sync_races.js'),'utf8').split('let count=0;')[0];
const box={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(source+'\nmodule.exports=harness;',box);
const sync=box.module.exports,RESTORE='md_restore_point_v1',STATE='md_drive_sync_state_v1';
function harness(){
  const h=sync(),s=h.sandbox,alerts=[],failures={set:null,remove:null};
  const set=s.Storage.prototype.setItem,remove=s.Storage.prototype.removeItem;
  s.Storage.prototype.setItem=function(k,v){if(failures.set&&failures.set(k,v))throw new Error('QuotaExceededError');return set.call(this,k,v)};
  s.Storage.prototype.removeItem=function(k){if(failures.remove&&failures.remove(k))throw new Error('SecurityError');return remove.call(this,k)};
  Object.assign(s,{showStorageWarning(){},showConfirm(message,callback){callback()},alert:message=>alerts.push(message),APP_VERSION:'test'});
  const safe=html.indexOf('function safeStorageSet('),safeEnd=html.indexOf('// v4.85:',safe);
  const start=html.indexOf('const BACKUP_SCHEMA_VERSION ='),end=html.indexOf('async function exportAllLearningData(){',start);
  const validation=html.indexOf('function validateImportedBackupEntries('),validationEnd=html.indexOf('function importAllLearningData(){',validation);
  for(const code of [html.slice(safe,safeEnd),html.slice(start,end),html.slice(validation,validationEnd)])vm.runInContext(code,s);
  return {...h,s,alerts,failures,
    point(items){s.localStorage.setItem(RESTORE,JSON.stringify({app:'Maritime Drill',exportedAt:'2026-10-20T00:00:00Z',items}))},
    stored(){return Object.fromEntries(h.storage.data)},
  };
}
let count=0;
function test(name,run){run();count++;console.log('PASS '+name)}
test('malformed JSON cannot overwrite existing objects or any known structured key',()=>{
  const h=harness(),s=h.s;
  h.write('md_past_wrongs_v1',{q:{q:{'선택지':['a','b','c','d']},myAns:0}});
  h.write('md_custom_json',{record:'keep'});
  const before=h.stored();
  for(const key of ['md_past_wrongs_v1','md_custom_json','md_past_marks_v1','md_past_checkpoint_v2','md_evaluation_score_history_v1','md_problem_reports_v1']){
    assert.throws(()=>s.mergeImportedBackupEntries([[key,'{bad']],{exportedAt:'2099-01-01T00:00:00Z'}),/형식/);
    assert.deepEqual(h.stored(),before);
  }
});
test('known structured shapes reject null, arrays in maps, and broken report/marked question rows',()=>{
  const h=harness(),before=h.stored();
  for(const [key,value] of [
    ['md_past_marks_v1','null'],['md_past_history_v1','[]'],['md_problem_reports_v1','{}'],
    ['md_problem_reports_v1','[null]'],['md_problem_reports_v1','[{"tags":"invalid"}]'],
    ['md_past_wrongs_v1','{"q":{"q":"invalid"}}'],
  ])assert.throws(()=>h.s.mergeImportedBackupEntries([[key,value]],{exportedAt:'2099-01-01'}),/형식/);
  assert.deepEqual(h.stored(),before);
  assert.throws(()=>h.s.validBackupEntries({app:'Maritime Drill',items:{md_past_wrongs_v1:{q:1}}}),/형식/);
});
test('actual history stores retain their object maps and nested run arrays on import',()=>{
  const h=harness(),values={
    md_past_history_v1:{'navi3|2026|1':{correct:18,total:25,mode:'mock',best:.72,tries:1,at:1792454400000}},
    md_evaluation_score_history_v1:{'navi3|항해:25':[{id:'run-1',at:'2026-10-20T00:00:00Z',score:72,correct:18,total:25}]},
    md_predictive_mock_history_v2:{navi2:[],navi3:[['navi3|항해|q1']]},
    md_predictive_mock_fingerprint_history_v1:{navi2:[],navi3:[['fingerprint-1']]},
    md_weak_topic_profile_v1:{version:2,grades:{navi3:{subjects:{항해:{}},topics:{}}}},
    md_evaluation_mock_exposure_v1:{version:1,grades:{navi3:{sequence:1,seen:{q1:[1,1]},recent:[['q1']]}}},
    md_mock_exposure_v1:{version:1,grades:{navi3:{sequence:1,seen:{q1:[1,1]},recent:[['q1']]}}},
  };
  h.s.mergeImportedBackupEntries(Object.entries(values).map(([key,value])=>[key,JSON.stringify(value)]),{exportedAt:'2099-01-01'});
  for(const [key,value] of Object.entries(values))assert.deepEqual(JSON.parse(h.s.localStorage.getItem(key)),value);
});
test('ordinary scalar settings remain importable without treating them as JSON objects',()=>{
  const h=harness();
  h.s.mergeImportedBackupEntries([['md_view_mode_v1','desktop'],['md_focus_n','15'],['goc_tts','off']],{exportedAt:'2099-01-01'});
  assert.equal(h.s.localStorage.getItem('md_view_mode_v1'),'desktop');
  assert.equal(h.s.localStorage.getItem('md_focus_n'),'15');assert.equal(h.s.localStorage.getItem('goc_tts'),'off');
});
test('partial restore failure restores data, sync clocks and the previous restore point without reload',()=>{
  const h=harness();h.write('md_existing',{old:true});h.point({md_new:'"new"',md_fail:'"blocked"'});
  const before=h.stored();h.failures.set=(key,value)=>key==='md_fail'&&value==='"blocked"';
  h.s.restoreAutomaticRestorePoint();
  assert.deepEqual(h.stored(),before);assert.equal(h.calls.reload,0);assert.match(h.alerts.at(-1),/완료하지 못.*그대로 보존/);
  assert.ok(!h.alerts.some(message=>message.startsWith('이전 상태로 되돌렸습니다')));
});
test('real storage hooks and state codec preserve exact legacy history and packed clock bytes on rollback',()=>{
  const h=harness(),s=h.s;
  const stateStart=html.indexOf('function driveSyncNewDeviceId(){'),stateEnd=html.indexOf('function driveSyncTouchLocal(){',stateStart);
  vm.runInContext(html.slice(stateStart,stateEnd),s);
  vm.runInContext(fs.readFileSync(path.join(root,'drive-state-codec.js'),'utf8'),s);
  const historyKey='md_focus_history_navi3',legacy='[{"ts":1792454400000,"ids":[1,2],"dayNum":1}]';
  // A client upgrading to this version can still have unpromoted legacy data.
  s.driveSyncOriginalSetItem.call(s.localStorage,historyKey,legacy);
  const state=s.driveSyncLoadState(),fields={};
  for(let i=0;i<50;i++)fields['question-'+i+'/correct']={updatedAt:'2026-10-20T00:00:00Z',deleted:false};
  state.itemMeta.md_progress={updatedAt:'2026-10-20T00:00:00Z',fields};s.driveSyncSaveState(state);
  h.point({[historyKey]:'[{"ts":1792540800000,"ids":[1,2],"dayNum":1}]',md_fail:'"blocked"'});
  const before=h.stored(),marker=s.__mdDriveStateCodec.MARKER;
  assert.ok(JSON.parse(before[STATE]).itemMeta.md_progress.fields[marker]);
  h.failures.set=(key,value)=>key==='md_fail'&&value==='"blocked"';
  s.restoreAutomaticRestorePoint();
  assert.deepEqual(h.stored(),before);assert.equal(s.localStorage.getItem(historyKey),legacy);
  assert.equal(s.driveSyncApplyingRemote,false);assert.equal(h.calls.reload,0);
  assert.equal(JSON.stringify(s.driveSyncLoadState().itemMeta.md_progress.fields),JSON.stringify(fields));
});
test('failed removal is detected by exact readback and cannot claim a completed restore',()=>{
  const h=harness();h.point({md_new:'"new"'});const before=h.stored();
  h.failures.remove=key=>key==='md_progress';h.s.restoreAutomaticRestorePoint();
  assert.deepEqual(h.stored(),before);assert.equal(h.calls.reload,0);assert.match(h.alerts.at(-1),/완료하지 못/);
});
test('successful restore replaces the exact snapshot and retains its undo snapshot',()=>{
  const h=harness();h.point({md_restored:'{"original":true}'});const before=h.s.collectBackupItems();
  h.s.restoreAutomaticRestorePoint();
  assert.equal(h.calls.reload,1);assert.deepEqual(JSON.parse(JSON.stringify(h.s.collectBackupItems())),{md_restored:'{"original":true}'});
  assert.deepEqual(JSON.parse(h.s.localStorage.getItem(RESTORE)).items,JSON.parse(JSON.stringify(before)));
  h.s.restoreAutomaticRestorePoint();assert.equal(h.calls.reload,2);
  assert.deepEqual(JSON.parse(JSON.stringify(h.s.collectBackupItems())),JSON.parse(JSON.stringify(before)));
});
test('invalid restore targets do not replace any data or the last good recovery point',()=>{
  for(const items of [{md_past_wrongs_v1:'{bad'},{md_past_marks_v1:'[]'},{md_past_wrongs_v1:{unexpected:true}}]){
    const h=harness();h.point(items);const before=h.stored();h.s.restoreAutomaticRestorePoint();
    assert.deepEqual(h.stored(),before);assert.equal(h.calls.reload,0);assert.match(h.alerts.at(-1),/확인하지 못/);
  }
});
test('a valid recovery snapshot can repair the corrupted container shape of current records',()=>{
  const h=harness(),saved={q:{q:{'선택지':['a','b','c','d']},myAns:0}};
  h.write('md_past_wrongs_v1',[]);h.point({md_past_wrongs_v1:JSON.stringify(saved)});
  h.s.restoreAutomaticRestorePoint();assert.equal(h.calls.reload,1);
  assert.deepEqual(JSON.parse(h.s.localStorage.getItem('md_past_wrongs_v1')),saved);
  assert.equal(JSON.parse(h.s.localStorage.getItem(RESTORE)).items.md_past_wrongs_v1,'[]');
});
test('shrinking replacements free capacity before growing values are restored',()=>{
  const h=harness(),a='"'+'a'.repeat(98)+'"',b='"'+'b'.repeat(8)+'"';
  h.write('md_a',JSON.parse(a));h.write('md_b',JSON.parse(b));h.point({md_a:b,md_b:a});
  h.failures.set=(key,value)=>{
    if(!['md_a','md_b'].includes(key))return false;
    const other=key==='md_a'?'md_b':'md_a';return value.length+(h.s.localStorage.getItem(other)||'').length>110;
  };
  h.s.restoreAutomaticRestorePoint();assert.equal(h.calls.reload,1);
  assert.equal(h.s.localStorage.getItem('md_a'),b);assert.equal(h.s.localStorage.getItem('md_b'),a);
});
test('legacy focus records restore with their canonical identity instead of failing verification',()=>{
  const h=harness(),row={ts:1792454400000,ids:[1,2],dayNum:1};
  h.point({md_focus_history_navi3:JSON.stringify([row])});h.s.restoreAutomaticRestorePoint();
  assert.equal(h.calls.reload,1);const saved=JSON.parse(h.s.localStorage.getItem('md_focus_history_navi3'))[0];
  assert.deepEqual({...saved,sessionId:undefined},{...row,sessionId:undefined});assert.equal(typeof saved.sessionId,'string');
});
test('storage denial of rollback is explicitly reported and never followed by a reload',()=>{
  const h=harness();h.write('md_existing',{old:true});h.point({md_new:'"new"',md_fail:'"blocked"'});
  h.failures.set=(key,value)=>key==='md_fail'||(key==='md_existing'&&value.includes('old'));
  h.s.restoreAutomaticRestorePoint();assert.equal(h.calls.reload,0);assert.match(h.alerts.at(-1),/되돌리기에도 실패/);
});
console.log(`backup restore safety: PASS (${count} cases)`);
