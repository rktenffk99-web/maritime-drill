'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const copy=v=>JSON.parse(JSON.stringify(v));let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(id='device-a'){
  const data=new Map(),timers=[];
  const app={textContent:'실전예측 모의 결과',querySelector:()=>null,appendChild(){}};
  const s={window:null,console,Date,Math,Set,Map,JSON,crypto:{randomUUID:()=>id},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},
    safeStorageSet:(k,v)=>{data.set(k,String(v));return true},currentMode:'pass-plan-session',
    setTimeout:fn=>timers.push(fn),requestAnimationFrame(){},MutationObserver:class{observe(){}},
    document:{documentElement:{},addEventListener(){},getElementById:k=>k==='app'?app:null,createElement:()=>({style:{}})},
    removePastWrong(){},addPastWrong(){},pqid:()=>'',showConfirm:(m,f)=>f(),showToast(){},getPastProgress:()=>null,clearPastProgress(){},mdQuestionUsable:()=>true};
  s.window=s;vm.createContext(s);
  for(const name of ['learning-integrity.js','weak-topic-classifier.js','predictive-analytics.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s,{filename:name});
  const start=html.indexOf('// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제'),end=html.indexOf('</script>',start);
  let src=html.slice(start,end),pos=src.lastIndexOf('})();');
  src=src.slice(0,pos)+`window.__test={setup(q,prior){planSessionQueue=[q,{...q,_planKey:'navi3|other'}];planSessionIdx=0;planSessionStartedAt=12345;planSessionAnswers=[null,null];planSessionConfidence=[null,null];planSessionCommitted=new Set();planSessionKind='today';if(prior)ppSaveProgress({[q._planKey]:prior});},snapshot(){return {progress:ppLoadProgress(),checkpoint:ppLoadPassSessionCheckpoint(),confidence:planSessionConfidence.slice(),idx:planSessionIdx}},find:ppFindQuestion,profile:ppLoadWeakTopicProfile,boost:ppWeakTopicBoost,order:ppChoiceOrder};`+src.slice(pos);
  vm.runInContext(src,s);s.renderNavigatorPassPlanCard=()=>{};s.renderNavigatorPassPlan=()=>{};
  return {s,data,render:timers[0],api:s.__mdLearningIntegrity};
}
const q={_planKey:'navi3|test',_planGrade:'navi3','정답':0,'선택지':['a','b','c','d']};
test('correct answer waits for confidence and stays on the saved question',()=>{
  const {s}=harness();s.__test.setup(q);s.chooseNavigatorPassPlanAnswer(0);s.nextNavigatorPassPlanQuestion();
  const x=s.__test.snapshot();assert.equal(x.idx,0);assert.equal(x.checkpoint.nextIndex,0);assert.equal(x.confidence[0],null);assert.equal(Object.keys(x.progress).length,0);
});
test('unsure answer is counted once and cannot become mastery',()=>{
  const {s}=harness();s.__test.setup(q,{attempts:2,correct:2,wrong:0,unsure:0,sameDayConfirmedDate:'2020-01-01'});
  s.chooseNavigatorPassPlanAnswer(0);s.setNavigatorPassPlanConfidence('unsure');s.nextNavigatorPassPlanQuestion();
  let r=s.__test.snapshot().progress[q._planKey];assert.equal(r.lastOutcome,'unsure');assert.equal(r.unsure,1);assert.equal(r.mastered,false);assert.equal(r.attempts,3);
  s.prevNavigatorPassPlanQuestion();s.setNavigatorPassPlanConfidence('sure');s.nextNavigatorPassPlanQuestion();
  r=s.__test.snapshot().progress[q._planKey];assert.equal(r.attempts,3);assert.equal(r.unsure,1);
});
test('reset clears checkpoint and in-memory queue as well as progress',()=>{
  const {s,data}=harness();s.__test.setup(q);s.chooseNavigatorPassPlanAnswer(1);s.nextNavigatorPassPlanQuestion();s.resetNavigatorPassPlanProgress();
  const x=s.__test.snapshot();assert.equal(Object.keys(x.progress).length,0);assert.equal(x.checkpoint,null);assert.equal(x.confidence.length,0);assert.equal(data.has('md_pass_plan_session_checkpoint_v2'),false);
});
test('two devices count independent correct/wrong and repeated merges exactly once',()=>{
  const a=harness('a').api,b=harness('b').api,base={attempts:10,correct:5,wrong:5,unsure:0,masteryReviews:0};
  const left=copy(base),right=copy(base);a.appendOutcome(left,'sure',false);b.appendOutcome(right,'wrong',false);
  const merged=a.mergeCounters(left,right,{});assert.equal(merged.attempts,12);assert.equal(merged.correct,6);assert.equal(merged.wrong,6);
  const again=a.mergeCounters(merged,left,{});assert.deepEqual(again,merged);
  a.appendOutcome(merged,'sure',false);const after=b.mergeCounters(right,merged,{});assert.equal(after.attempts,13);assert.equal(after.correct,7);
});
test('two devices both answering correctly preserve both attempts',()=>{
  const a=harness('a').api,b=harness('b').api,left={attempts:0,correct:0,wrong:0},right=copy(left);
  a.appendOutcome(left,'sure',false);b.appendOutcome(right,'sure',false);const merged=a.mergeCounters(left,right,{});assert.equal(merged.attempts,2);assert.equal(merged.correct,2);
});
test('legacy inconsistent counters retain history and normalize the denominator',()=>{
  const {api}=harness();const r=api.mergeCounters({attempts:11,correct:6,wrong:5},{attempts:11,correct:5,wrong:6},{attempts:11,correct:6,wrong:6});assert.equal(r.attempts,12);
});
test('counter metadata stays bounded as attempts increase on one device',()=>{
  const {api}=harness();const r={};for(let i=0;i<2000;i++)api.appendOutcome(r,i%2?'wrong':'sure',false);assert.equal(r.attempts,2000);assert.equal(Object.keys(r._counterComponents).length,1);assert.ok(JSON.stringify(r).length<600);
});
test('mock practice counts both outcomes without granting mastery or homework completion',()=>{
  const {s}=harness();s.commitNavigatorPredictiveMockResult([{...q,_predictiveMock:true},{...q,_planKey:'navi3|unanswered',_predictiveMock:true}],[0,null]);
  const p=s.__test.snapshot().progress;assert.equal(p[q._planKey].correct,1);assert.equal(p[q._planKey].attempts,1);assert.equal(p[q._planKey].mastered,false);assert.equal(p[q._planKey].firstPassDate,null);
  assert.equal(p['navi3|unanswered'].wrong,1);assert.equal(p['navi3|unanswered'].lastPracticeMode,'predictive-mock');
  assert.ok(html.includes("rec.lastPracticeMode!=='predictive-mock'&&rec.lastDate===today"));
});
test('different subject and grade results retain earlier weak evidence',()=>{
  const {s,data,render}=harness();s.pastQueue=[{...q,_predictiveMock:true,subject:'영어',_predictiveConcept:'영어|sar',question:'SAR rescue'}];s.pastAnswers=[1];s.pastStartedAt=1;render();
  s.pastQueue=[{...q,_planGrade:'navi2',_predictiveMock:true,subject:'항해',_predictiveConcept:'항해|radar',question:'Radar'}];s.pastAnswers=[0];s.pastStartedAt=2;render();
  let p=JSON.parse(data.get('md_weak_topic_profile_v1'));assert.ok(p.grades.navi3.topics['영어|SAR·통신 영어']);assert.equal(Object.keys(p.grades.navi2.topics).length,0);
  assert.ok(s.__test.boost({gradeId:'navi3',subject:'영어',_predictiveConcept:'영어|sar',question:'SAR rescue'})>1);assert.equal(s.__test.boost({gradeId:'navi2',subject:'영어',_predictiveConcept:'영어|sar',question:'SAR rescue'}),1);
  s.pastQueue=[{...q,_predictiveMock:true,subject:'항해',_predictiveConcept:'항해|radar',question:'Radar'}];s.pastStartedAt=3;render();p=JSON.parse(data.get('md_weak_topic_profile_v1'));assert.ok(p.grades.navi3.topics['영어|SAR·통신 영어']);
});
test('same result rendering does not duplicate history; retries do not erase analysis',()=>{
  const {s,data,render}=harness();s.pastQueue=[{...q,_predictiveMock:true,subject:'영어',_predictiveConcept:'영어|sar',question:'SAR rescue'}];s.pastAnswers=[1];s.pastStartedAt=1;render();render();
  let p=JSON.parse(data.get('md_weak_topic_profile_v1'));assert.equal(p.grades.navi3.topics['영어|SAR·통신 영어'].total,1);
  const before=data.get('md_weak_topic_profile_v1');s.pastQueue[0]._predictiveReview=true;s.pastAnswers=[0];s.pastStartedAt=2;render();assert.equal(data.get('md_weak_topic_profile_v1'),before);
});
test('profile rolling window retains at most ten runs per subject',()=>{
  const {s,data,render}=harness();s.pastQueue=[{...q,_predictiveMock:true,subject:'영어',_predictiveConcept:'영어|sar',question:'SAR rescue'}];s.pastAnswers=[1];for(let i=1;i<=15;i++){s.pastStartedAt=i;render()}
  const p=JSON.parse(data.get('md_weak_topic_profile_v1'));assert.equal(Object.keys(p.grades.navi3.subjects['영어']).length,10);assert.equal(p.grades.navi3.topics['영어|SAR·통신 영어'].total,10);
});
test('known missing diagram and underline are excluded; textual figures stay usable',()=>{
  const {api}=harness();assert.ok(api.contentIssue({'문제':'다음 그림의 항로표지가 설치된 지점의 가항수역은?'}));assert.ok(api.contentIssue({'문제':'Choose the underlined part.'}));assert.equal(api.contentIssue({'문제':'다음 그림의 선박은? [그림: 홍색·백색·홍색 전주등]'}),'');assert.equal(api.contentIssue({'문제':'수선면의 반쪽 형상을 그린 그림은?'}),'');
});
test('presentation shuffle preserves canonical answers and matches explanation labels',()=>{
  const {s,api}=harness();s.__test.setup(q);const base=s.__test.order(q),repeat=s.__test.order({...q,_sameDayRecheck:true});assert.deepEqual([...base].sort(),[0,1,2,3]);assert.notDeepEqual([...base],[...repeat]);assert.equal(q['정답'],0);assert.equal(api.remapExplanation('정답 ㉮',base),'정답 '+'㉮㉯㉰㉱'[base.indexOf(0)]);
});
test('frequency records with stale spacing still resolve to the verified source',()=>{
  const {s,api}=harness();
  const actual={'과목':'항해','번호':12,'문제':'방위각 오차에 대한 설명으로 옳지 않은 것은?'};
  s.getPastExam=()=>({questions:[actual]});s.n3aNormalizeQuestion=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');s.mdQuestionUsable=q=>!api.contentIssue(q);
  const item={key:'navi2|q-1aakhul',subject:'항해',normalized:'방위각오차에대한설명으로옳지 않은것은',hits:[{year:2024,session:2,number:12}]};
  assert.equal(s.__test.find('navi2',item)['문제'],actual['문제']);
  actual['문제']='다음 그림의 선박은?';item.normalized=s.n3aNormalizeQuestion(actual['문제']);assert.equal(s.__test.find('navi2',item),null);
});
test('predictive resume serializes identity and ordinary references',()=>{
  assert.ok(html.includes('predictive:q._predictiveMock===true'));assert.ok(html.includes('_predictiveMock:r.predictive===true'));assert.ok(html.includes('_planKey:r.planKey'));assert.ok(!html.includes("if(pastReturnView!=='pass-plan-predictive-mock')savePastProgress()"));
});
console.log(`learning integrity regressions: PASS (${passed} cases)`);
