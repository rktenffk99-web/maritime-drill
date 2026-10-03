'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..');let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(profile={}){
  const storage=new Map([['md_weak_topic_profile_v1',JSON.stringify(profile)]]);
  let render,host;
  const app={textContent:'실전예측 모의 결과',querySelector(){return null},appendChild(value){host=value}};
  const s={window:null,console,Date,JSON,Math,Object,Array,Map,Set,pastQueue:[{_predictiveMock:true,_planGrade:'navi2',_planKey:'navi2|영어|1',subject:'영어',question:'preposition','정답':0}],pastAnswers:[1],pastResultId:'current',pastStartedAt:1,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},
    document:{documentElement:{},getElementById:id=>id==='app'?app:null,createElement:()=>({style:{}}),addEventListener:(event,fn)=>{render=fn}},
    MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){}};
  s.window=s;vm.createContext(s);
  for(const file of ['weak-topic-classifier.js','predictive-analytics.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),s,{filename:file});
  return {s,storage,render(){render();return host.innerHTML}};
}
test('saved topic and subject labels remain text when the actual result renderer formats them',()=>{
  const label='<span data-study-note="sample">문법 & 어휘</span>',subject='법규 < 확인';
  const row={key:'saved-topic',label,subject,total:'3',attempts:'3',correct:'0',wrong:'3',unanswered:'0'};
  const h=harness({grades:{navi2:{subjects:{saved:{old:{id:'old',at:'2026-01-01',rows:[row]}}}}}});
  const html=h.render();
  assert.ok(html.includes('&lt;span data-study-note=&quot;sample&quot;&gt;문법 &amp; 어휘&lt;/span&gt;'));
  assert.ok(html.includes('법규 &lt; 확인'));assert.ok(!html.includes('<span data-study-note='));
  assert.ok(html.includes('3문제 응답 · 오답 3'));
});
test('malformed imported profile containers and rows do not stop the result screen',()=>{
  for(const profile of [[],{grades:{navi2:'ordinary text'}},{grades:{navi2:{subjects:{bad:{a:null,b:{rows:'ordinary text'},c:{rows:[null,7,{key:'x',label:'확인',subject:'법규',attempts:'ordinary text',wrong:Infinity}]}}}}}}]){
    const h=harness(profile);assert.ok(h.render().includes('취약 파트 분석'));
  }
});
test('invalid evaluation history rows do not replace a valid completed score',()=>{
  const h=harness();h.storage.set('md_evaluation_score_history_v1',JSON.stringify({navi2:[null,{score:'ordinary text'},{score:50,id:'valid'}],navi3:'ordinary text'}));
  const scores=h.s.__mdWeakTopicAnalytics.loadEvaluationScores();
  assert.equal(scores.navi2.length,1);assert.equal(scores.navi2[0].score,50);assert.equal(scores.navi3,undefined);
  const summary=h.s.__mdWeakTopicAnalytics.evaluationSummary(h.s.pastQueue,[null]);assert.equal(summary.recentAverage,50);
});
console.log(`predictive render safety regressions: PASS (${passed} cases)`);
