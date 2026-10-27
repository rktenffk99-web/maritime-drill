'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),guard=fs.readFileSync('exam-start-guard.js','utf8');
const sync=fs.readFileSync('drive-sync-v2.js','utf8');
function between(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
function harness(){
  const data=deferred(),explain=deferred(),calls=[];
  const row={'과목':'항해','번호':1,'문제':'2026 first paper','선택지':['a','b','c','d'],'정답':0};
  const s={console:{warn(){}},Date,Set,Map,app:{innerHTML:''},escapeHtml:value=>String(value).replaceAll('<','&lt;'),currentMode:'past-menu',pastSubjectId:'navi3',pastBaseShort:'navi3',
    pastYear:2026,pastSession:1,pastVariant:'상선',pastQueue:[],pastAnswers:[],pastIdx:0,
    NAVI_ANALYSIS_GRADES:['navi3'],PAST_MOCK_PER_SUBJECT:25,
    confirmPastProgressReplacement:async()=>{calls.push(['checkpoint',s.currentMode]);return true},
    getPastExamsForSession:(grade,year,session)=>[{meta:{gradeShort:grade,year,session},questions:[row]}],
    ensureNavi3FrequencyData:()=>data.promise,ensurePastExplainForYears:()=>explain.promise,
    renderPastLoading:()=>calls.push(['loading']),renderPastCard:()=>calls.push(['render']),
    shuffle:rows=>rows.slice(),mdQuestionUsable:()=>true,orderNavigatorMockQuestions:rows=>rows,
    showToast:message=>calls.push(['toast',message]),
    renderSubjectSelect:()=>{s.currentMode='select';calls.push(['home'])},
    pickPrepType:grade=>{s.currentMode='prep';s.pastSubjectId=grade;s.pastBaseShort=grade;calls.push(['grade',grade])},
    resumePastProgress:async()=>{calls.push(['resume']);s.currentMode='past'},
    mdSyncStable:JSON.stringify,mdSyncApplyMerged:()=>calls.push(['apply']),
    driveSyncNowIso:()=>new Date().toISOString(),driveSyncSaveState:()=>true,
    location:{reload:()=>calls.push(['reload'])}};
  s.window=s;vm.createContext(s);
  vm.runInContext(between(html,'async function startPastSession(mode, subjFilter){','function mdQuestionContentIssue(q){'),s);
  vm.runInContext(between(sync,'  function mdSyncStudyActive(){','  function mdSyncBuildV2Payload('),s);
  vm.runInContext(guard,s);
  return {s,calls,data,explain,finishSync(){
    const local={signature:'unchanged',state:{enabled:true,revision:1},items:{}};
    s.mdSyncReadLocal=()=>local;
    s.mdSyncFinish(local,{items:{md_remote:'new remote record'},itemMeta:{}},'file',new Date().toISOString(),2,false,'synced',0);
  }};
}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
(async()=>{
  await test('a real past-paper loader is active to Drive throughout both asynchronous stages',async()=>{
    const h=harness(),task=h.s.startPastSession('mock','all');
    assert.equal(h.s.currentMode,'past-loading');assert.equal(h.s.mdSyncStudyActive(),true);
    h.finishSync();assert.equal(h.calls.some(x=>['apply','reload'].includes(x[0])),false);
    assert.deepEqual(h.calls[0],['checkpoint','past-menu']);
    await Promise.resolve();h.data.resolve();await Promise.resolve();await Promise.resolve();
    assert.equal(h.s.currentMode,'past-loading');assert.equal(h.s.mdSyncStudyActive(),true);
    h.finishSync();assert.equal(h.calls.some(x=>['apply','reload'].includes(x[0])),false);
    h.explain.resolve();await task;
    assert.equal(h.s.currentMode,'past');assert.equal(h.s.__mdExamStartGuard.isPending(),false);
    assert.equal(h.s.pastQueue.length,1);assert.equal(h.s.pastQueue[0]._year,2026);
    h.s.renderSubjectSelect();h.finishSync();
    assert.equal(h.calls.filter(x=>x[0]==='apply').length,1);assert.equal(h.calls.filter(x=>x[0]==='reload').length,1);
  });
  await test('duplicate starts, resume, home and licence changes cannot replace a pending paper',async()=>{
    const h=harness(),task=h.s.startPastSession('mock','all');await Promise.resolve();
    await h.s.startPastSession('study','all');await h.s.resumePastProgress('another-paper');
    h.s.renderSubjectSelect();h.s.pickPrepType('engi5');
    assert.equal(h.s.currentMode,'past-loading');assert.equal(h.s.pastSubjectId,'navi3');
    assert.equal(h.calls.filter(x=>x[0]==='checkpoint').length,1);
    assert.equal(h.calls.some(x=>['home','grade','resume'].includes(x[0])),false);
    h.data.resolve();h.explain.resolve();await task;
    assert.equal(h.calls.filter(x=>x[0]==='render').length,1);
    h.s.pickPrepType('engi5');assert.equal(h.s.currentMode,'prep');assert.equal(h.s.pastSubjectId,'engi5');
  });
  await test('a rejected legacy loader unlocks retry and exposes a usable error view',async()=>{
    const h=harness(),task=h.s.startPastSession('mock','all');await Promise.resolve();
    h.data.resolve();h.explain.reject(new Error('explanation download failed'));
    assert.equal(await task,false);
    assert.equal(h.s.__mdExamStartGuard.isPending(),false);assert.equal(h.s.currentMode,'past-start-error');
    assert.match(h.s.app.innerHTML,/explanation download failed/);assert.match(h.s.app.innerHTML,/시험 목록으로/);
    h.s.renderSubjectSelect();assert.equal(h.s.currentMode,'select');
  });
  await test('an explicit restore-error mode and failed leave checkpoint retain their own state',async()=>{
    for(const [initial,result] of [['past','past'],['past-menu','past-resume-error']]){
      const s={currentMode:initial,window:null};s.window=s;
      s.startPastSession=async()=>{if(result!==initial)s.currentMode=result};
      vm.createContext(s);vm.runInContext(guard,s);await s.startPastSession();
      assert.equal(s.currentMode,result);assert.equal(s.__mdExamStartGuard.isPending(),false);
    }
  });
  await test('every production paper entry, including unified/targeted delegates, shares one lock',async()=>{
    for(const name of ['startPastYearPickSession','startPastAllYearsSession','startPastSession',
      'startPastSpecialSession','startNavi3FrequencyPractice','openNavi3FrequencyQuestion',
      'startNavigatorPredictiveMock','startNavigatorEvaluationMock','startNavigatorPassPlanMock','resumePastProgress']){
      let calls=0;const d=deferred(),s={currentMode:'pass-plan',window:null};s.window=s;s[name]=()=>{calls++;return d.promise};
      vm.createContext(s);vm.runInContext(guard,s);const first=s[name]();await s[name]();
      assert.equal(s.currentMode,'past-loading',name);assert.equal(s.__mdExamStartGuard.isPending(),true);
      assert.equal(calls,1,name+' must start only once');
      d.resolve();await first;assert.equal(s.currentMode,'pass-plan');assert.equal(s.__mdExamStartGuard.isPending(),false);
    }
  });
  console.log(`exam start guard v5.35: PASS (${passed} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
