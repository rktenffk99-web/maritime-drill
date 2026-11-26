'use strict';
// v5.42: mock pass judgement, part table, trend, wrong-question review, weak-part blend.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');process.chdir(root);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n)};
const data=new Map();
const s={console,Date,Math,JSON,Map,Set,localStorage:{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v))},
  safeStorageSet:(k,v)=>{data.set(k,String(v));return true},pastQueue:[],pastAnswers:[],pastResultId:'run-2',
  __mdWeakTopicClassifier:{classify:(subject,text)=>/레이더/.test(text)?'레이더':/해도/.test(text)?'해도':'기타'},
  MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},document:{documentElement:{},getElementById:()=>null,addEventListener(){}},
  pastChoiceText:v=>String(v==null?'':v),renderExplainBlock:q=>'<div class="ex">해설 '+q['번호']+'</div>'};
s.window=s;s.global=s;vm.createContext(s);
vm.runInContext(fs.readFileSync('predictive-analytics.js','utf8'),s);
vm.runInContext(fs.readFileSync('balanced-mock.js','utf8'),s);
const A=s.__mdWeakTopicAnalytics;
const row=(label,correct,total=25)=>({label,correct,total,score:Math.round(correct/total*100)});
test('pass: every subject ≥40 (navigator law ≥60) and average ≥60',()=>{
  const j=A.passJudgement([row('항해',18),row('운용',16),row('법규',15),row('영어',14),row('상선전문',17)],'navi3');
  assert.equal(j.pass,true);assert.equal(j.extra,0);
});
test('navigator law below 60 fails even with a high average, and counts the questions needed',()=>{
  const j=A.passJudgement([row('항해',24),row('운용',24),row('법규',14),row('영어',24),row('상선전문',24)],'navi2');
  assert.equal(j.pass,false);assert.equal(j.failing.length,1);assert.equal(j.failing[0].label,'법규');assert.equal(j.failing[0].need,1);assert.equal(j.extra,1);
});
test('engineer-style 40-point cutoff applies to law for non-navigator grades',()=>{
  const j=A.passJudgement([row('법규',10),row('기관1',25),row('기관2',25)],'engi3');assert.equal(j.pass,true);
});
test('low average reports the smallest number of extra correct answers',()=>{
  const j=A.passJudgement([row('항해',12),row('운용',12),row('법규',15),row('영어',12),row('상선전문',12)],'navi3');
  // average 50.4 → needs total 75 correct out of 125; now 63 → 12 more
  assert.equal(j.pass,false);assert.equal(j.failing.length,0);assert.equal(j.extra,12);
});
test('part table and wrong list group by subject/topic and include the explanation',()=>{
  const mk=(n,subject,text,answer)=>({'번호':n,'과목':subject,'문제':text,'선택지':['a','b','c','d'],'정답':answer,_predictiveMock:true,_planGrade:'navi3',_planKey:'navi3|'+n});
  const queue=[mk(1,'항해','레이더 거짓상',0),mk(2,'항해','레이더 방위',1),mk(3,'항해','해도 도식',2),mk(4,'법규','기타 조항',3)];
  const answers=[1,1,2,null];
  const st=A.stats(queue,answers);
  const table=A.topicTable(st.topics);assert.match(table,/파트별 정답률/);assert.match(table,/레이더/);assert.match(table,/1\/2/);
  const list=A.wrongList(queue,answers);assert.match(list,/틀린 문제 모아보기 · 1문제/);assert.match(list,/해설 1/);assert.doesNotMatch(list,/해설 4/);
});
test('score history keeps per-subject scores and the trend marks this run and changes',()=>{
  const mk=(n,subject,answer)=>({'번호':n,'과목':subject,'문제':'q'+n,'선택지':['a','b','c','d'],'정답':answer,_predictiveMock:true,_unifiedMock:true,_planGrade:'navi3',_planKey:'navi3|'+n});
  const queue=[mk(1,'항해',0),mk(2,'항해',0),mk(3,'법규',0),mk(4,'법규',0)];
  s.pastResultId='run-1';A.unifiedSummary(queue,[0,1,0,1]);
  s.pastResultId='run-2';const u=A.unifiedSummary(queue,[0,0,0,1]);
  const saved=A.loadEvaluationScores()[u.historyKey];assert.equal(saved.length,2);assert.equal(saved[0].subjects['항해'].score,100);
  const t=A.trendTable(u.historyKey,'run-2');assert.match(t,/지난 모의와 비교/);assert.match(t,/\(이번\)/);assert.match(t,/▲50/);
});
test('mock selection weight takes a bounded personal boost and ignores bad values',()=>{
  const items=Array.from({length:40},(_,i)=>({key:'k'+i,subject:'항해',question:'문제 '+i,choices:['a'+i,'b','c','d'],hits:[{year:2024}]}));
  let r=0;const random=()=>{r=(r*9301+49297)%233280;return r/233280};
  const weak=new Set(items.slice(0,10).map(x=>x.key));
  const counts={weak:0,other:0};
  for(let t=0;t<200;t++){const d=s.__mdBalancedMock.select(items,{gradeId:'navi3',data:{},state:{},count:5,random,boost:it=>weak.has(it.key)?9:'x'});for(const it of d.items)counts[weak.has(it.key)?'weak':'other']++}
  // 10 of 40 items carry the (capped 1.5×) boost: expected share ≈ 15/45 = 33% vs 25% unboosted.
  const share=counts.weak/(counts.weak+counts.other);assert.ok(share>0.28&&share<0.40,String(share));
  assert.equal(s.__mdBalancedMock.select(items,{gradeId:'navi3',data:{},state:{},count:5,random,boost:()=>{throw new Error('x')}}).items.length,5);
});
test('the regular mock passes the dampened weak-part boost; evaluation papers do not',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/engine\.select\(candidates,\{[^}]*boost:item=>1\+0\.6\*\(ppWeakTopicBoost\(item\)-1\)\}\); \/\/ mock-weak-blend-v542/);
  assert.doesNotMatch(html,/evaluationSelect\([^)]*boost/);
});
console.log(`${passed} mock-analysis checks passed`);
