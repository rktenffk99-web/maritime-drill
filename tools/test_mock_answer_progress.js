'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),indexPath=path.join(root,'index.html');
const raw=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
const bundledPython=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.MD_PYTHON||(process.platform==='win32'&&fs.existsSync(bundledPython)?bundledPython:'python');
function generate(input){
  const args=['tools/patch_mock_answer_access.py','--stdout'];if(input!==undefined)args.push('--stdin');
  const run=spawnSync(python,args,{cwd:root,input,encoding:'utf8',maxBuffer:50*1024*1024,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  if(run.error)throw run.error;assert.equal(run.status,0,run.stderr);return run.stdout.replace(/\r\n/g,'\n');
}
const html=generate();
if(process.argv.includes('--final'))assert.equal(raw,html,'apply patch_mock_answer_access.py before final-artifact checks');
const STATE='md_past_progress_v1',META='md_past_progress_meta_v1',ATOMIC='md_past_checkpoint_v2',TRAINING='md_nav23_pass_progress_v1';
const plain=value=>JSON.parse(JSON.stringify(value));
const sourceRows=[
  {'과목':'법규','번호':1,'문제':'첫 문항','선택지':['가','나','다','라'],'정답':0},
  {'과목':'법규','번호':2,'문제':'둘째 문항','선택지':['마','바','사','아'],'정답':1},
];
function harness(data=new Map(),rows=sourceRows){
  const writes=[],exam={questions:plain(rows)};
  const s={window:null,console,Date,Math,Map,Set,JSON,app:{innerHTML:''},currentMode:'past',
    pastQueue:rows.map((q,i)=>({...plain(q),_year:2026,_short:'navi2',_session:2,'회차':2,_predictiveMock:true,_evaluationMock:true,_planKey:'navi2|q'+i,_planGrade:'navi2'})),
    pastAnswers:rows.map((q,i)=>i===0?1:null),pastIdx:1,pastMode:'mock',pastStartedAt:Date.now()-10000,
    pastSubjectId:'navi2',pastBaseShort:'navi2',pastYear:null,pastSession:null,pastVariant:'상선',pastAllYears:false,pastReturnView:'pass-plan-predictive-mock',
    naviAnalysisSubjectId:'navi2',navi3AnalysisDetail:null,navi3PracticeReturn:null,navi3PracticeLabel:null,
    safeStorageSet(key,value){data.set(key,String(value));writes.push(key);return true},
    safeStorageRemove(key){data.delete(key);return true},
    safeStorageGetJSON(key,fallback){try{return JSON.parse(data.get(key))??fallback}catch{return fallback}},
    localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,String(value));writes.push(key)}},
    pqid:q=>`${q._year}|${q._short}|${q['회차']}|${q['과목']}|${q['번호']}`,
    baseFromShort:short=>short.replace(/e$/,''),getPastExam:()=>exam,
    ensurePastDataForSubject:async()=>{},ensurePastExplainForYears:async()=>{},ensureNavi3FrequencyData:async()=>{},
    n3aActivateGrade(grade){s.naviAnalysisSubjectId=grade},renderPastLoading(){},showToast(){},escapeHtml:value=>String(value),
    document:{documentElement:{},addEventListener(){},getElementById:()=>null},MutationObserver:class{observe(){}},setTimeout(){},requestAnimationFrame(){}};
  s.window=s;vm.createContext(s);
  const start=html.indexOf("const PAST_PROGRESS_KEY='"),end=html.indexOf('function renderPastResumeCard(',start);
  assert.ok(start>=0&&end>start);vm.runInContext(html.slice(start,end),s);
  const resume=html.indexOf('async function resumePastProgress(){'),resumeEnd=html.indexOf('function retryPastSessionWrongs(){',resume);
  vm.runInContext(html.slice(resume,resumeEnd),s);
  s.renderPastCard=()=>s.savePastProgress();
  return {s,data,writes};
}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}
(async()=>{
  await test('release patch is idempotent, keeps embedded sources and versions every root script URL',()=>{
    assert.equal(generate(html),html);assert.equal(fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n'),raw);
    assert.match(html,/const APP_VERSION = '5\.28';/);assert.match(html,/<title>Maritime Drill v5\.28 · Android<\/title>/);
    const scripts=[...html.matchAll(/<script\b[^>]*\ssrc=["']([^"']+)["']/g)];assert.ok(scripts.length>=7);
    for(const [,src] of scripts)assert.equal(new URL(src,'https://local.test/').searchParams.get('v'),'5.28',src);
    const embedded=value=>[...value.matchAll(/<script\b[^>]*data-bundled-src=["'][^"']+["'][^>]*>/g)].map(m=>m[0]);
    assert.deepEqual(embedded(html),embedded(raw));
  });
  await test('viewing after initial save updates state despite cached metadata and preserves answers, location and session ID',()=>{
    const {s,data,writes}=harness();data.set(TRAINING,'{"existing":{"attempts":7}}');s.savePastProgress();
    const meta=data.get(META),before=plain(s.getPastProgress());assert.equal(before.state.evaluationExplanationViewed,false);
    s.pastQueue[0]._evaluationExplanationViewed=true;s.savePastProgress();
    const saved=s.getPastProgress();assert.equal(saved.state.evaluationExplanationViewed,true);
    assert.equal(data.get(META),meta);assert.equal(writes.filter(key=>key===META).length,1);
    assert.equal(saved.state.id,before.state.id);assert.deepEqual(plain(saved.state.answers),[1,null]);assert.equal(saved.state.idx,1);
    assert.equal(data.get(TRAINING),'{"existing":{"attempts":7}}');assert.ok(writes.every(key=>[STATE,META,ATOMIC].includes(key)));
  });
  await test('refresh and resume preserve assisted status, exact responses and cursor; assisted results never enter evaluation average',async()=>{
    const first=harness();first.s.savePastProgress();first.s.pastQueue[1]._evaluationExplanationViewed=true;first.s.savePastProgress();
    const previous=plain(first.s.getPastProgress()),fresh=harness(first.data);fresh.s.currentMode='home';fresh.s.pastQueue=[];fresh.s.pastAnswers=[];fresh.s.pastIdx=0;
    await fresh.s.resumePastProgress();assert.equal(fresh.s.currentMode,'past');assert.equal(fresh.s.pastMode,'mock');
    assert.equal(fresh.s.pastIdx,previous.state.idx);assert.deepEqual(plain(fresh.s.pastAnswers),previous.state.answers);
    assert.deepEqual(fresh.s.pastQueue.map(fresh.s.pqid),previous.meta.refs.map(row=>row.id));
    assert.ok(fresh.s.pastQueue.every(q=>q._evaluationMock&&q._evaluationExplanationViewed));
    assert.equal(fresh.s.getPastProgress().state.evaluationExplanationViewed,true);assert.equal(fresh.s.getPastProgress().state.id,previous.state.id);
    vm.runInContext(fs.readFileSync(path.join(root,'predictive-analytics.js'),'utf8'),fresh.s);
    fresh.s.pastResultId='assisted-after-reload';const summary=fresh.s.__mdWeakTopicAnalytics.evaluationSummary(fresh.s.pastQueue,fresh.s.pastQueue.map(q=>q['정답']));
    assert.equal(summary.complete,true);assert.equal(summary.score,100);assert.equal(summary.explanationViewed,true);assert.equal(summary.recentCount,0);
    assert.equal(first.data.has('md_evaluation_score_history_v1'),false);
  });
  await test('older states and explicit false remain unassisted and resumable',async()=>{
    for(const legacy of [true,false]){
      const first=harness();first.s.savePastProgress();const saved=JSON.parse(first.data.get(STATE));
      if(legacy)delete saved.evaluationExplanationViewed;else saved.evaluationExplanationViewed=false;
      first.data.set(STATE,JSON.stringify(saved));first.data.delete(ATOMIC);const fresh=harness(first.data);fresh.s.pastQueue=[];fresh.s.pastAnswers=[];
      await fresh.s.resumePastProgress();assert.deepEqual(plain(fresh.s.pastAnswers),[1,null]);assert.equal(fresh.s.pastIdx,1);
      assert.ok(fresh.s.pastQueue.every(q=>q._evaluationMock&&!q._evaluationExplanationViewed));
      assert.equal(fresh.s.getPastProgress().state.evaluationExplanationViewed,false);
    }
  });
  await test('50 answers in a 125-question mock survive a fresh runtime with exact paper and cursor',async()=>{
    const rows=Array.from({length:125},(_,i)=>({...plain(sourceRows[i%2]),'번호':i+1,'문제':'문항 '+(i+1)}));
    const first=harness(new Map(),rows);first.s.pastAnswers.fill(null);
    for(let i=0;i<50;i++){first.s.pastIdx=i;first.s.pastAnswers[i]=i%4;assert.equal(first.s.savePastProgress(),true)}
    first.s.pastIdx=50;first.s.savePastProgress();
    const answers=plain(first.s.pastAnswers),saved=plain(first.s.getPastProgress());
    const fresh=harness(first.data,rows);fresh.s.pastQueue=[];fresh.s.pastAnswers=[];fresh.s.currentMode='select';
    await fresh.s.resumePastProgress();assert.equal(fresh.s.pastQueue.length,125);assert.equal(fresh.s.pastIdx,50);
    assert.deepEqual(plain(fresh.s.pastAnswers),answers);assert.deepEqual(fresh.s.pastQueue.map(fresh.s.pqid),saved.meta.refs.map(q=>q.id));
    assert.equal(first.data.has(TRAINING),false);assert.equal(first.data.has('md_evaluation_score_history_v1'),false);
  });
  await test('unified and targeted flags survive restart without migrating legacy evaluations',async()=>{
    for(const kind of ['_unifiedMock','_targetedPractice']){
      const first=harness();first.s.pastQueue.forEach(q=>{delete q._evaluationMock;q[kind]=true;if(kind==='_unifiedMock')q._balancedMock=true});
      first.s.savePastProgress();const fresh=harness(first.data);fresh.s.pastQueue=[];await fresh.s.resumePastProgress();
      assert.ok(fresh.s.pastQueue.every(q=>q[kind]&&!q._evaluationMock));assert.deepEqual(plain(fresh.s.pastAnswers),[1,null]);
    }
  });
  await test('mock hint use survives restart per question and cannot enter unaided score averages',async()=>{
    const first=harness();first.s.pastQueue.forEach(q=>{delete q._evaluationMock;q._unifiedMock=true});
    first.s.pastQueue[1]._mockHintViewed=true;first.s.savePastProgress();
    assert.deepEqual(plain(first.s.getPastProgress().state.hintedIndices),[1]);
    const fresh=harness(first.data);fresh.s.pastQueue=[];await fresh.s.resumePastProgress();
    assert.equal(fresh.s.pastQueue[0]._mockHintViewed,undefined);assert.equal(fresh.s.pastQueue[1]._mockHintViewed,true);
    assert.deepEqual(plain(fresh.s.pastAnswers),[1,null]);assert.equal(fresh.s.pastIdx,1);
    vm.runInContext(fs.readFileSync(path.join(root,'predictive-analytics.js'),'utf8'),fresh.s);
    const answers=fresh.s.pastQueue.map(q=>q['정답']);
    for(const summarize of [fresh.s.__mdWeakTopicAnalytics.unifiedSummary,fresh.s.__mdWeakTopicAnalytics.evaluationSummary]){
      const summary=summarize(fresh.s.pastQueue,answers);assert.equal(summary.score,100);assert.equal(summary.explanationViewed,true);assert.equal(summary.recentCount,0);
    }
    assert.equal(first.data.has('md_evaluation_score_history_v1'),false);
  });
  await test('an undisclosed hint leaves both resume formats unchanged when its atomic save fails',()=>{
    const h=harness();h.s.savePastProgress();const before=new Map(h.data),write=h.s.safeStorageSet;
    h.s.safeStorageSet=(key,value)=>key===ATOMIC?false:write(key,value);
    h.s.pastQueue[0]._mockHintViewed=true;
    assert.equal(h.s.savePastProgress({requireCheckpoint:true}),false);delete h.s.pastQueue[0]._mockHintViewed;
    assert.equal(h.data.get(STATE),before.get(STATE));assert.equal(h.data.get(ATOMIC),before.get(ATOMIC));
    assert.deepEqual(plain(h.s.getPastProgress().state.hintedIndices),[]);
  });
  await test('an atomic paper survives mismatched metadata from a separate session',async()=>{
    const first=harness();first.s.savePastProgress();const saved=plain(first.s.getPastProgress());
    first.data.set(META,JSON.stringify({...saved.meta,id:'another-device-session'}));
    const fresh=harness(first.data);await fresh.s.resumePastProgress();
    assert.deepEqual(plain(fresh.s.pastAnswers),[1,null]);assert.equal(fresh.s.getPastProgress().state.id,saved.state.id);
  });
  await test('failed storage reports failure and preserves the previously saved checkpoint',()=>{
    const h=harness();h.s.savePastProgress();const prior=h.data.get(ATOMIC);
    h.s.safeStorageSet=()=>false;h.s.pastAnswers[1]=3;
    assert.equal(h.s.savePastProgress(),false);assert.equal(h.data.get(ATOMIC),prior);
  });
  await test('starting a replacement requires explicit choice and cancellation keeps the old answers',async()=>{
    const h=harness();h.s.savePastProgress();const prior=h.data.get(ATOMIC);
    h.s.openModal=opts=>{h.modal=opts};h.s.closeModal=()=>{};
    const cancelled=h.s.confirmPastProgressReplacement();assert.equal(h.modal.closable,false);
    h.s.mdPastKeepSaved();assert.equal(await cancelled,false);assert.equal(h.data.get(ATOMIC),prior);
    const replace=h.s.confirmPastProgressReplacement();h.s.mdPastReplaceSaved();assert.equal(await replace,true);
    assert.equal(h.data.get(ATOMIC),prior); // deletion waits until the new paper exists
    const resume=h.s.confirmPastProgressReplacement();h.s.mdPastResumeSaved();assert.equal(await resume,false);
    await Promise.resolve();assert.deepEqual(plain(h.s.pastAnswers),[1,null]);
  });
  await test('leaving a predictive mock preserves rather than clears the checkpoint',()=>{
    const h=harness();h.s.renderNavigatorPassPlan=()=>{};
    const start=html.indexOf('function goBackFromPastSession(){'),end=html.indexOf('// 체크박스 전체 선택/해제',start);
    vm.runInContext(html.slice(start,end),h.s);h.s.goBackFromPastSession();
    assert.equal(h.s.currentMode,'pass-plan');assert.ok(h.s.getPastProgress());
    assert.deepEqual(plain(h.s.getPastProgress().state.answers),[1,null]);
    h.s.clearPastProgress();assert.equal(h.s.getPastProgress(),null);assert.equal(h.data.has(ATOMIC),false);
  });
  await test('a failed save blocks leaving the question screen',()=>{
    const h=harness();h.s.renderNavigatorPassPlan=()=>{};
    const start=html.indexOf('function goBackFromPastSession(){'),end=html.indexOf('// 체크박스 전체 선택/해제',start);
    vm.runInContext(html.slice(start,end),h.s);h.s.safeStorageSet=()=>false;h.s.goBackFromPastSession();
    assert.equal(h.s.currentMode,'past');assert.deepEqual(plain(h.s.pastAnswers),[1,null]);
  });
  await test('manual backup includes live answers even when the first storage write fails',async()=>{
    const h=harness();h.s.safeStorageSet=()=>false;h.s.pastAnswers=[2,3];let file;
    Object.assign(h.s,{collectBackupItems:()=>({}),BACKUP_SCHEMA_VERSION:1,APP_VERSION:'5.28',File,
      navigator:{canShare:()=>true,share:async opts=>{file=opts.files[0]}},backupNotice(){},alert:message=>{throw new Error(message)}});
    const start=html.indexOf('async function exportAllLearningData(){'),end=html.indexOf('function validateImportedBackupEntries(',start);
    vm.runInContext(html.slice(start,end),h.s);await h.s.exportAllLearningData();
    const payload=JSON.parse(await file.text()),checkpoint=JSON.parse(payload.items[ATOMIC]);
    assert.equal(payload.app,'Maritime Drill');assert.deepEqual(checkpoint.state.answers,[2,3]);
    assert.equal(checkpoint.meta.id,checkpoint.state.id);assert.equal(checkpoint.meta.refs.length,2);
    assert.equal(h.data.size,0);
  });
  console.log(`mock answer access progress: PASS (${passed} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
