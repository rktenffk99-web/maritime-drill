'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.join(__dirname,'..');let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(){
 const storage=new Map();const s={window:null,console,Date,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},document:{documentElement:{},addEventListener(){},getElementById(){return null}}};s.window=s;vm.createContext(s);
 for(const name of ['weak-topic-classifier.js','predictive-analytics.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s);
 return {s,a:s.__mdWeakTopicAnalytics,storage};
}
const paper=(subjects)=>subjects.flatMap(subject=>Array.from({length:25},(_,i)=>({_predictiveMock:true,_evaluationMock:true,_planGrade:'navi2',_planKey:`navi2|${subject}${i}`,_predictiveConcept:`${subject}|x`,subject,question:'q'+i,'정답':0})));
test('evaluation averages require the same grade, subjects and per-subject counts',()=>{
 const {s,a}=harness();const full=paper(['항해','운용','법규','영어','상선전문']);s.pastResultId='full';a.evaluationSummary(full,full.map(()=>1));
 const english=paper(['영어']);for(let i=0;i<2;i++){s.pastResultId='english'+i;const summary=a.evaluationSummary(english,english.map(()=>0));assert.equal(summary.recentAverage,100);assert.equal(summary.recentCount,i+1)}
 s.pastResultId='full2';const summary=a.evaluationSummary(full,full.map(()=>0));assert.equal(summary.recentAverage,50);assert.equal(summary.recentCount,2);
});
test('legacy evaluation arrays and malformed raw entries survive a new comparable result',()=>{
 const {s,a,storage}=harness(),legacy={navi2:[{id:'old',score:50,total:125},null,{score:'legacy text'}],other:'kept'};
 storage.set('md_evaluation_score_history_v1',JSON.stringify(legacy));s.pastResultId='new';const rows=paper(['영어']);const summary=a.evaluationSummary(rows,rows.map(()=>0));assert.equal(summary.recentAverage,100);
 const saved=JSON.parse(storage.get('md_evaluation_score_history_v1'));assert.deepEqual(saved.navi2,legacy.navi2);assert.equal(saved.other,'kept');
});
test('evaluation explanation-viewed results do not enter comparable average',()=>{
 const {s,a}=harness(),rows=paper(['영어']);rows[0]._evaluationExplanationViewed=true;s.pastResultId='viewed';const summary=a.evaluationSummary(rows,rows.map(()=>0));assert.equal(summary.complete,true);assert.equal(summary.recentCount,0);
});
test('one wrong response is low-confidence and old evidence decays',()=>{
 const {a}=harness(),row={key:'영어|해사영어 일반',label:'해사영어 일반',subject:'영어',total:1,attempts:1,wrong:1,correct:0,unanswered:0};
 const recent=a.aggregateProfile({subjects:{영어:{r:{at:new Date().toISOString(),rows:[row]}}}})[row.key];assert.ok(recent.boostMultiplier<=1.05);
 const old=a.aggregateProfile({subjects:{영어:{r:{at:'2020-01-01',rows:[row]}}}});assert.ok(!old[row.key]||old[row.key].boostMultiplier<recent.boostMultiplier);
});
test('recent homework successes reduce a mock-derived weak-topic multiplier',()=>{
 const {s,a,storage}=harness(),key='영어|SAR·통신 영어';const row={key,label:'SAR·통신 영어',subject:'영어',total:5,attempts:5,wrong:5,correct:0,unanswered:0};
 storage.set('md_weak_topic_profile_v1',JSON.stringify({version:2,grades:{navi2:{subjects:{영어:{r:{at:new Date().toISOString(),rows:[row]}}}}}}));
 const before=a.getProfileForGrade('navi2')[key].boostMultiplier;
 s.__mdPassPlanLearningAPI={getRecentTopicEvidence:()=>[{subject:'영어',question:'SAR rescue',recentOutcomes:Array.from({length:20},()=>({date:new Date().toISOString(),outcome:'sure',mode:'homework'}))}]};
 const after=a.getProfileForGrade('navi2')[key].boostMultiplier;assert.ok(after<before,{before,after});assert.equal(a.getProfileForGrade('navi2')[key].attempts,25);
});
test('mock-mode homework API events cannot be counted twice',()=>{
 const {s,a}=harness();s.__mdPassPlanLearningAPI={getRecentTopicEvidence:()=>[{subject:'영어',question:'SAR rescue',recentOutcomes:[{date:new Date().toISOString(),outcome:'wrong',mode:'predictive-mock'}]}]};assert.equal(a.recentHomeworkEvidence('navi2').length,0);
});
test('profile weighting reuses one evidence scan and refreshes after revision changes',()=>{
 const {s,a}=harness();let revision=1,scans=0;
 s.__mdPassPlanLearningAPI={getEvidenceRevision:()=>revision,getRecentTopicEvidence:()=>{scans++;return []}};
 for(let i=0;i<100;i++)a.getProfileForGrade('navi2');assert.equal(scans,1);revision++;a.getProfileForGrade('navi2');assert.equal(scans,2);
});
test('operation, merchant and generic English stems have specific topic evidence',()=>{
 const {s}=harness(),c=s.__mdWeakTopicClassifier.classify;
 assert.equal(c('운용','GM과 자유표면이 복원성에 미치는 영향'),'복원성·선체강도');assert.equal(c('운용','태풍의 기압과 풍속'),'기상·해양');assert.equal(c('운용','디젤 기관의 냉각'),'기관·설비');
 assert.equal(c('상선전문','공동해손의 보험 보상'),'해상보험·손해');assert.equal(c('상선전문','화물 적재와 고박'),'화물적재·양하');assert.equal(c('상선전문','IMDG 위험물'),'위험물·액체화물');
 assert.equal(c('영어','Select one which has wrong expression.',['MARPOL pollution','garbage','fire extinguishers','abandon ship']),'안전·환경 영어');
});
test('homework result formatter reads the explicit learning API without lexical session globals',()=>{
 const {s}=harness(),source=fs.readFileSync(path.join(root,'convenience-controls.js'),'utf8');const a=source.indexOf('  function mdTodayResultStats(){'),b=source.indexOf('  function enhanceTodayResult(){',a);vm.runInContext(source.slice(a,b),s);
 assert.equal(s.mdTodayResultStats(),null);s.__mdPassPlanLearningAPI={getResultStats:()=>({kind:'today',baseTotal:70,baseCorrect:60,cleared:45,pendingNextDay:15,unresolved:10,subjects:[{subject:'영어',total:14,firstCorrect:12,cleared:9,pendingNextDay:3,unresolved:2}]})};
 const result=s.mdTodayResultStats();assert.equal(result.total,70);assert.equal(result.firstCorrect,60);assert.equal(result.pendingNextDay,15);assert.equal(result.subjects[0].unresolved,2);
});
test('actual patched homework renderer separates base/recheck scores and next-day pending',()=>{
 const os=require('os'),child=require('child_process'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'md-metrics-'));
 try{
  fs.copyFileSync(path.join(root,'index.html'),path.join(dir,'index.html'));
  for(let i=0;i<2;i++){const run=child.spawnSync('python',[path.join(root,'tools/patch_metrics_v522.py')],{cwd:dir,encoding:'utf8'});assert.equal(run.status,0,run.stderr)}
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),start=html.indexOf('  window.renderNavigatorPassPlanResult=function(){'),end=html.indexOf('  window.retryNavigatorPassPlanUnresolved=',start);
  const s={window:null,app:{innerHTML:''},console,Date,Math,planSessionStartedAt:Date.now()-1000,planSessionKind:'today',planSessionQueue:[],planSessionAnswers:[],planSessionConfidence:[],ppDateKey:()=> '2026-10-22',ppLoadProgress:()=>({}),planEntrySubject:'navi2'};s.window=s;
  s.__mdPassPlanLearningAPI={getResultStats:()=>({baseCorrect:60,baseTotal:70,recheckCorrect:45,recheckTotal:55,pendingNextDay:15,unresolved:0})};
  vm.createContext(s);vm.runInContext(html.slice(start,end),s);s.renderNavigatorPassPlanResult();
  assert.ok(s.app.innerHTML.includes('60 / 70'));assert.ok(s.app.innerHTML.includes('당일 재확인 정답 45 / 55'));assert.ok(s.app.innerHTML.includes('15문제는 간격을 두고 다음 날 확인'));assert.ok(!s.app.innerHTML.includes('오늘 숙제 확인 완료'));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
console.log(`metrics v5.22 behavioral tests: PASS (${passed} cases)`);
