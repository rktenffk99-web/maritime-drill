'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),SCORE_KEY='md_evaluation_score_history_v1',PROFILE_KEY='md_weak_topic_profile_v1';
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(){
  const storage=new Map();let render,host;
  const app={textContent:'모의시험 결과',querySelector(){return null},appendChild(value){host=value}};
  const s={window:null,console,Date,pastQueue:[],pastAnswers:[],pastResultId:'run-1',pastStartedAt:1,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    document:{documentElement:{},getElementById:id=>id==='app'?app:null,createElement:()=>({style:{}}),addEventListener:(event,fn)=>{render=fn}},
    MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){}};
  s.window=s;vm.createContext(s);
  for(const file of ['weak-topic-classifier.js','predictive-analytics.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),s,{filename:file});
  return {s,a:s.__mdWeakTopicAnalytics,storage,app,render(){render();return host&&host.innerHTML}};
}
function paper(subjects=['영어'],grade='navi2',count=25){
  return subjects.flatMap(subject=>Array.from({length:count},(_,i)=>({_unifiedMock:true,_balancedMock:true,_predictiveMock:true,
    _planGrade:grade,_planKey:`${grade}|${subject}|${i}`,subject,question:subject==='영어'?'SAR rescue operation':'레이더 항해','정답':0})));
}
function result(h,rows,answers,id){h.s.pastResultId=id;return h.a.unifiedSummary(rows,answers)}

test('new score scope preserves legacy and unrelated raw history without averaging it',()=>{
  const h=harness(),rows=paper(),legacy={navi2:[{id:'legacy',score:10},null,{score:'old'}],'navi2|영어:25':[{id:'evaluation',score:20}],unrelated:{kept:true}};
  h.storage.set(SCORE_KEY,JSON.stringify(legacy));
  const summary=result(h,rows,rows.map(()=>0),'unified');assert.equal(summary.historyKey,'unified-v1|navi2|영어:25');assert.equal(summary.recentAverage,100);assert.equal(summary.recentCount,1);
  const stored=JSON.parse(h.storage.get(SCORE_KEY));for(const [key,value] of Object.entries(legacy))assert.deepEqual(stored[key],value);
});
test('grade, selected subjects and per-subject counts each have independent trends',()=>{
  const h=harness(),full=paper(['영어','항해']);result(h,full,full.map(()=>1),'full-1');
  for(const [rows,id] of [[paper(['영어']),'one-subject'],[paper(['영어','항해'],'navi3'),'other-grade'],[paper(['영어','항해'],'navi2',10),'other-count']]){
    const summary=result(h,rows,rows.map(()=>0),id);assert.equal(summary.recentAverage,100);assert.equal(summary.recentCount,1);
  }
  const summary=result(h,full,full.map(()=>0),'full-2');assert.equal(summary.recentCount,2);assert.equal(summary.recentAverage,50);
});
test('recent average uses the last three completed unified papers and deduplicates result rendering',()=>{
  const h=harness(),rows=paper(['영어'],'navi2',4);
  result(h,rows,[1,1,1,1],'run-0');result(h,rows,[0,0,0,0],'run-1');result(h,rows,[0,0,1,1],'run-2');
  let summary=result(h,rows,[0,0,0,1],'run-3');assert.equal(summary.recentCount,3);assert.equal(summary.recentAverage,75);
  const before=h.storage.get(SCORE_KEY);summary=result(h,rows,[0,0,0,1],'run-3');assert.equal(h.storage.get(SCORE_KEY),before);assert.equal(summary.recentAverage,75);
});
test('unanswered responses affect current score but incomplete or empty papers do not enter the trend',()=>{
  const h=harness(),rows=paper();result(h,rows,rows.map(()=>0),'complete');const before=h.storage.get(SCORE_KEY);
  let summary=result(h,rows,[0,...Array(24).fill(null)],'incomplete');assert.equal(summary.score,4);assert.equal(summary.complete,false);assert.equal(summary.recentAverage,100);assert.equal(h.storage.get(SCORE_KEY),before);
  summary=result(h,[],[],'empty');assert.equal(summary.complete,false);assert.equal(summary.recentCount,0);assert.equal(h.storage.get(SCORE_KEY),before);
});
test('explanation assistance, review attempts and legacy papers cannot pollute unified averages',()=>{
  for(const changes of [{_unifiedExplanationViewed:true},{_evaluationExplanationViewed:true},{_mockHintViewed:true},{_predictiveReview:true},{_evaluationMock:true},{_unifiedMock:false}]){
    const h=harness(),rows=paper();Object.assign(rows[0],changes);const summary=result(h,rows,rows.map(()=>0),'ineligible');assert.equal(summary.recentCount,0);assert.equal(h.storage.has(SCORE_KEY),false);
  }
});
test('unified result renders both score trend and weakness feedback and still trains the learning profile',()=>{
  const h=harness();h.s.pastQueue=paper();h.s.pastAnswers=h.s.pastQueue.map(()=>1);
  h.a.persistResult(h.s.pastQueue,h.s.pastAnswers);
  const html=h.render();assert.ok(html.includes('모의시험 성적 추이'));assert.ok(html.includes('이번 점수 0점'));assert.ok(html.includes('취약 파트 분석'));assert.ok(html.includes('점수 추이는 참고용'));
  const profile=JSON.parse(h.storage.get(PROFILE_KEY));assert.equal(profile.grades.navi2.topics['영어|SAR·통신 영어'].wrong,25);
  const stored=h.storage.get(SCORE_KEY);h.render();assert.equal(h.storage.get(SCORE_KEY),stored);assert.equal(Object.keys(JSON.parse(h.storage.get(PROFILE_KEY)).grades.navi2.subjects['영어']).length,1);
});
test('legacy evaluation remains isolated from training and keeps its original history scope',()=>{
  const h=harness();h.app.textContent='평가용 모의고사 결과';h.s.pastQueue=paper().map(q=>({...q,_unifiedMock:false,_evaluationMock:true}));h.s.pastAnswers=h.s.pastQueue.map(()=>1);
  h.a.persistResult(h.s.pastQueue,h.s.pastAnswers);
  const html=h.render();assert.ok(html.includes('평가용 모의고사 분석'));assert.ok(!html.includes('모의시험 성적 추이'));assert.equal(h.storage.has(PROFILE_KEY),false);
  const stored=JSON.parse(h.storage.get(SCORE_KEY));assert.deepEqual(Object.keys(stored),['navi2|영어:25']);
});
test('generic year/session mocks and mixed papers cannot create analysis or mutate saved histories',()=>{
  for(const mixed of [false,true]){
    const h=harness(),beforeProfile=JSON.stringify({existing:{kept:true}}),beforeScores=JSON.stringify({navi2:[{id:'old',score:60}]});
    h.storage.set(PROFILE_KEY,beforeProfile);h.storage.set(SCORE_KEY,beforeScores);
    h.s.pastQueue=paper().map(q=>{const plain={...q};delete plain._unifiedMock;delete plain._balancedMock;delete plain._predictiveMock;return plain});
    if(mixed)h.s.pastQueue[0]=paper()[0];h.s.pastAnswers=h.s.pastQueue.map(()=>1);
    assert.equal(h.render(),undefined);assert.equal(h.storage.get(PROFILE_KEY),beforeProfile);assert.equal(h.storage.get(SCORE_KEY),beforeScores);
  }
});
test('renamed targeted practice renders learning feedback without entering mock score trends',()=>{
  const h=harness();h.app.textContent='빈출·취약 연습 결과';h.s.pastQueue=paper().map(q=>({...q,_unifiedMock:false,_balancedMock:false}));h.s.pastAnswers=h.s.pastQueue.map(()=>1);
  h.a.persistResult(h.s.pastQueue,h.s.pastAnswers);
  const html=h.render();assert.ok(html.includes('취약 파트 분석'));assert.ok(!html.includes('모의시험 성적 추이'));assert.equal(h.storage.has(SCORE_KEY),false);assert.equal(h.storage.has(PROFILE_KEY),true);
});
test('rendering a result cannot create a score or profile outside the submission transaction',()=>{
  const h=harness();h.s.pastQueue=paper();h.s.pastAnswers=h.s.pastQueue.map(()=>1);
  h.render();h.render();assert.equal(h.storage.size,0);
});
console.log(`unified mock analytics: PASS (${passed} cases)`);
