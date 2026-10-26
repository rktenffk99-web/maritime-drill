'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const harnessSource=fs.readFileSync(path.join(__dirname,'test_mock_answer_progress.js'),'utf8').split('let passed=0;')[0];
const exported={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(harnessSource+'\nmodule.exports=harness;',exported);
const harness=exported.module.exports;
const atomic='md_past_checkpoint_v2';
const start=html.indexOf('// mock-submission-transaction-v526:'),end=html.indexOf('\nfunction escapeHtml(',start);
assert.ok(start>=0&&end>start);
const resultSource=html.slice(start,end);
function setup(){
  const h=harness(),s=h.s;
  let commits=0;
  Object.assign(s,{pastResultId:null,SUBJECTS:[],SUBJECT_GROUPS:[],
    n3aData:()=>null,addPastWrong(){},removePastWrong(){},recordPastSession(){},
    commitNavigatorPredictiveMockResult(){commits++},showPastResultReview(){}});
  vm.runInContext(resultSource,s);
  s.savePastProgress();
  return {...h,commits:()=>commits};
}
{
  const h=setup(),s=h.s,prior=h.data.get(atomic),original=s.safeStorageSet;
  s.pastAnswers[1]=3;
  s.safeStorageSet=()=>false;
  s.renderPastResult();
  assert.equal(s.currentMode,'past','failed save must keep the live question screen');
  assert.equal(h.data.get(atomic),prior,'failed submission must retain the last durable paper');
  assert.deepEqual(Array.from(s.pastAnswers),[1,3],'the newest live answer remains available for backup/retry');
  assert.equal(h.commits(),0,'a failed submission must not grade or update learning history');
  s.safeStorageSet=original;
  let submitted;
  const clear=s.clearPastProgress;
  s.clearPastProgress=()=>{submitted=JSON.parse(h.data.get(atomic));clear()};
  s.renderPastResult();
  assert.equal(s.currentMode,'past-result');
  assert.deepEqual(submitted.state.answers,[1,3],'retry saves the current answers before completing');
  assert.equal(h.commits(),1);
  assert.equal(h.data.has(atomic),false);
  s.renderPastResult();assert.equal(h.commits(),1,'repeated result activation cannot double-submit');
  console.log('PASS quota failure preserves answers and blocks submission; successful retry submits exactly once');
}
{
  const h=setup();
  h.s.currentMode='past-menu';h.s.renderPastResult();
  assert.ok(h.data.has(atomic));assert.equal(h.commits(),0);
  console.log('PASS inactive result handlers cannot clear an unfinished paper');
}

// Use the real progress, wrong-note, daily-assignment and analytics writers together.
const auditSource=fs.readFileSync(path.join(__dirname,'test_learning_audit.js'),'utf8').split('const question=')[0];
const auditExport={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(auditSource+'\nmodule.exports=harness;',auditExport);
function fullSetup(ordinary=false){
  const h=auditExport.module.exports(),s=h.s;
  s.console={...console,warn(){}};
  Object.assign(s,{pastQueue:[0,1].map(i=>({_unifiedMock:!ordinary,_predictiveMock:!ordinary,
    _planKey:'navi3|submission-'+i,_planGrade:'navi3',_short:'navi3',_year:2026,'회차':1,
    '선택지':['a','b','c','d'],'정답':0,'문제':'radar navigation '+i,'과목':'항해','번호':i+1})),
    pastAnswers:[1,0],pastIdx:1,pastVariant:'상선',pastYear:ordinary?2026:null,pastSession:ordinary?1:null,
    pastReturnView:ordinary?null:'pass-plan-predictive-mock',navi3AnalysisDetail:null,navi3PracticeReturn:null,navi3PracticeLabel:null,
    PAST_WRONGS_KEY:'md_past_wrongs_v1',PAST_WRONGS_MAX:1000,PAST_HIST_KEY:'md_past_history_v1',pqSnapshot:q=>({...q}),
    safeStorageGetJSON(k,fallback){try{return JSON.parse(h.data.get(k))??fallback}catch{return fallback}},
    driveSyncApplyingRemote:false});
  s.localStorage.setItem=(k,v)=>{
    h.data.set(k,String(v));
    if(k!=='md_drive_sync_state_v1'&&!s.driveSyncApplyingRemote)h.data.set('md_drive_sync_state_v1',JSON.stringify({changed:k}));
  };
  s.localStorage.removeItem=k=>{
    h.data.delete(k);
    if(k!=='md_drive_sync_state_v1'&&!s.driveSyncApplyingRemote)h.data.set('md_drive_sync_state_v1',JSON.stringify({changed:k}));
  };
  s.safeStorageSet=(k,v)=>{s.localStorage.setItem(k,v);return true};
  s.safeStorageRemove=k=>{s.localStorage.removeItem(k);return true};
  let a=html.indexOf("const PAST_PROGRESS_KEY='"),b=html.indexOf('function renderPastResumeCard(',a);
  vm.runInContext(html.slice(a,b),s);
  a=html.indexOf('function normalizePastSavedMap(');b=html.indexOf('// 오답 노트 / 북마크 리스트 화면',a);
  assert.ok(a>=0&&b>a);vm.runInContext(html.slice(a,b),s);
  s.__mdLearningIntegrity.getDeviceId();
  s.renderPastCard=()=>s.savePastProgress();s.savePastProgress();
  return h;
}
const resultSnapshot=data=>Object.fromEntries([...data].filter(([k])=>!['md_past_checkpoint_v2','md_past_progress_v1','md_past_progress_meta_v1'].includes(k)));
for(const key of ['md_past_wrongs_v1','md_predictive_mock_history_v2','md_predictive_mock_fingerprint_history_v1',
  'md_nav23_pass_progress_v1','md_nav23_pass_daily_v1','md_weak_topic_profile_v1','md_evaluation_score_history_v1','md_past_history_v1']){
  const ordinary=key==='md_past_history_v1',h=fullSetup(ordinary),s=h.s;
  const before=resultSnapshot(h.data),original=s.safeStorageSet;
  s.safeStorageSet=(k,v,label)=>k===key?false:original(k,v,label);
  s.renderPastResult();
  assert.equal(s.currentMode,'past',key+' failure must block completion');
  assert.deepEqual(resultSnapshot(h.data),before,key+' failure must roll back all preceding result writes and sync metadata');
  assert.deepEqual(Array.from(s.getPastProgress().state.answers),[1,0]);
  s.safeStorageSet=original;s.renderPastResult();
  assert.equal(s.currentMode,'past-result',key+' retry must complete');assert.equal(h.data.has(atomic),false);
  if(ordinary){
    assert.equal(JSON.parse(h.data.get('md_past_history_v1'))['navi3|2026|1'].tries,1);
    s.recordPastSession('navi3',2026,1,1,2,'mock');
    assert.equal(JSON.parse(h.data.get('md_past_history_v1'))['navi3|2026|1'].tries,1);
  }else{
    const progress=JSON.parse(h.data.get('md_nav23_pass_progress_v1'));
    assert.equal(progress['navi3|submission-0'].wrong,1);assert.equal(progress['navi3|submission-1'].correct,1);
    s.commitNavigatorPredictiveMockResult(s.pastQueue,s.pastAnswers);
    const replay=JSON.parse(h.data.get('md_nav23_pass_progress_v1'));
    assert.equal(replay['navi3|submission-0'].wrong,1);assert.equal(replay['navi3|submission-1'].correct,1);
    const scores=JSON.parse(h.data.get('md_evaluation_score_history_v1'));
    assert.equal(scores['unified-v1|navi3|항해:2'].length,1);
  }
  console.log('PASS '+key+' failure rolls back all result writes; retry and replay count once');
}
{
  const h=fullSetup(),s=h.s,before=resultSnapshot(h.data),remove=s.safeStorageRemove;
  s.safeStorageRemove=(key,label)=>key==='md_past_progress_meta_v1'?false:remove(key,label);
  s.renderPastResult();assert.equal(s.currentMode,'past');assert.deepEqual(resultSnapshot(h.data),before);
  assert.deepEqual(Array.from(s.getPastProgress().state.answers),[1,0]);
  s.safeStorageRemove=remove;s.renderPastResult();assert.equal(s.currentMode,'past-result');assert.equal(h.data.has(atomic),false);
  assert.equal(JSON.parse(h.data.get('md_nav23_pass_progress_v1'))['navi3|submission-0'].wrong,1);
  console.log('PASS final checkpoint-deletion failure restores both the paper and every result before retry');
}
{
  for(const [initial,snapshot] of [
    [[['A','a'.repeat(10)],['B','b'.repeat(100)]],{values:new Map([['A','a'.repeat(100)],['B','b'.repeat(10)]]),sync:null}],
    [[['A','a'.repeat(10)],['B','b'.repeat(10)],['md_drive_sync_state_v1','s'.repeat(90)]],{values:new Map([['A','a'.repeat(90)],['B','b'.repeat(10)]]),sync:'s'.repeat(10)}],
  ]){
    const data=new Map(initial),quota=110,s={console,Map,localStorage:{getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k),setItem(k,v){
      const next=new Map(data);next.set(k,v);
      if([...next.values()].reduce((sum,value)=>sum+value.length,0)>quota)throw new Error('QuotaExceededError');
      data.set(k,v);
    }}};
    vm.createContext(s);vm.runInContext(resultSource.slice(0,resultSource.indexOf('function renderPastResult(){')),s);
    assert.equal(s.mdRestorePastSubmission(snapshot),true);
    for(const [key,value] of snapshot.values)assert.equal(data.get(key),value);
    assert.equal(data.get('md_drive_sync_state_v1')??null,snapshot.sync);
  }
  console.log('PASS byte-quota rollback shrinks data and sync metadata before growing restored values');
}
{
  const h=fullSetup(),s=h.s,originalSet=s.safeStorageSet,rawSet=s.localStorage.setItem;
  s.safeStorageSet=(key,value,label)=>key==='md_nav23_pass_daily_v1'?false:originalSet(key,value,label);
  s.localStorage.setItem=(key,value)=>{if(s.driveSyncApplyingRemote)throw new Error('storage blocked during rollback');rawSet(key,value)};
  s.renderPastResult();assert.equal(s.currentMode,'past');
  s.localStorage.setItem=rawSet;s.safeStorageSet=originalSet;
  h.data.set('md_nav23_pass_progress_v1','{"newerWork":{"attempts":8}}');
  const before=JSON.stringify([...h.data]);let invoked=false;
  assert.equal(s.mdCommitPastSubmission(()=>{invoked=true}),false);
  assert.equal(invoked,false);assert.equal(JSON.stringify([...h.data]),before);
  console.log('PASS an unrecoverable submission cannot later restore stale values over newer work');
}
