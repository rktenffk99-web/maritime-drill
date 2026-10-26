'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
function source(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,start);return html.slice(a,b)}
function harness(){
  const row=short=>({meta:{gradeShort:short,year:2026,session:1,gradeLabel:short},questions:[{'과목':'항해','문제':short,'선택지':['a','b','c','d'],'정답':0,'번호':1}]});
  const s={window:null,console,Date,Math,Map,Set,currentMode:'past-menu',app:{innerHTML:''},
    pastBaseShort:'navi3',pastSubjectId:'navi3',pastYearPickVariant:'상선',pastVariant:'어선',
    pastYear:2026,pastSession:1,pastReturnView:null,pastAllYears:false,pastQueue:[],pastAnswers:[],pastIdx:0,
    MD_PAST:{a:row('navi3'),b:row('navi3e'),c:row('engi5'),d:row('engi5d')},
    PAST_GRADE_MAP:{navi3:['navi3','navi3e'],engi5:['engi5','engi5d']},
    SUBJECTS:[{id:'navi3',name:'3급 항해사'},{id:'engi5',name:'5급 기관사'}],SUBJECT_GROUPS:[],BASE_GRADE_LABEL:{},
    PAST_MOCK_PER_SUBJECT:25,APP_VERSION:'test',icon:()=>'',escapeHtml:String,
    baseFromShort:short=>short.replace(/(?:de|e|d)$/,''),
    document:{querySelectorAll:selector=>selector==='.past-year-check:checked'?[{value:'2026'}]:[{checked:true,value:'항해'}]},
    confirmPastProgressReplacement:async()=>true,renderPastLoading(){},ensurePastExplainForYears:async()=>{},
    shuffle:rows=>rows.slice(),mdQuestionUsable:()=>true,mdSourceQuestionUsable:()=>true,orderNavigatorMockQuestions:rows=>rows,
    renderPastCard(){},showToast(){},renderPastHome(){throw new Error('unexpected fallback')},renderPastSessionPick(){throw new Error('unexpected fallback')}};
  s.window=s;vm.createContext(s);
  vm.runInContext(source('function variantLabel(short){','// ── v5.00:'),s);
  vm.runInContext(source('function renderPastYearPick(subjectId, baseShort){','// v4.44: 년도 선택 화면의 상선/어선 필터 변경'),s);
  vm.runInContext(source('async function startPastYearPickSession(mode){','// v4.38: renderPastSubjectAggregate'),s);
  vm.runInContext(source('function getPastExamsForSession(baseShort, year, session, variant){','// Step 4:'),s);
  vm.runInContext(source('function renderPastRunner(subjectId, baseShort, year, session){','// v4.35: runner 화면의 상선/어선 필터 변경'),s);
  return s;
}
(async()=>{
  for(const mode of ['study','mock'])for(const [chosen,stale,expected] of [['상선','어선','navi3'],['어선','상선','navi3e']]){
    const s=harness();s.pastYearPickVariant=chosen;s.pastVariant=stale;
    await s.startPastYearPickSession(mode);
    assert.equal(s.pastQueue.length,1);assert.equal(s.pastQueue[0]._short,expected);
    assert.equal(s.pastVariant,chosen,'session metadata must describe the chosen filter');
  }
  console.log('PASS selected-year study and mock use the visible merchant/fishing filter rather than stale runner state');
  for(const [grade,stale,valid] of [['navi3','국내한정','상선'],['engi5','어선','국내한정']]){
    const s=harness();s.pastYearPickVariant=stale;s.renderPastYearPick(grade,grade);
    assert.equal(s.pastYearPickVariant,'all');assert.match(s.app.innerHTML,/2문제 통합 풀/);
    s.pastYearPickVariant=valid;s.renderPastYearPick(grade,grade);assert.equal(s.pastYearPickVariant,valid);
    s.pastVariant=stale;s.renderPastRunner(grade,grade,2026,1);
    assert.equal(s.pastVariant,'all');assert.match(s.app.innerHTML,/2문제 · 1과목/);
    s.pastVariant=valid;s.renderPastRunner(grade,grade,2026,1);assert.equal(s.pastVariant,valid);
  }
  console.log('PASS changing licence families clears invalid filters and preserves valid selections');
  {
    const s=harness();s.pastYearPickVariant='상선';s.pastVariant='어선';
    await s.startPastAllYearsSession('mock');assert.equal(s.pastVariant,'상선');assert.equal(s.pastQueue[0]._short,'navi3');
    console.log('PASS all-year sessions save the same filter that selected their questions');
  }
})().catch(error=>{console.error(error);process.exitCode=1});
