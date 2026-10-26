'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(process.env.MD_TEST_HTML||path.join(root,'index.html'),'utf8');
const generated=spawnSync(process.env.MD_PYTHON||'python',['tools/patch_mastery_sessions_v522.py','--stdin','--stdout'],{cwd:root,input:raw,encoding:'utf8',maxBuffer:60*1024*1024});
assert.equal(generated.status,0,generated.stderr);const html=generated.stdout;
if(process.argv.includes('--final'))assert.equal(raw,html,'apply v5.22 mastery/session patch before final verification');
const NativeDate=Date;let day='2026-10-22';
class AuditDate extends NativeDate{constructor(...args){super(...(args.length?args:[day+'T12:00:00Z']))}static now(){return +new NativeDate(day+'T12:00:00Z')}}
const P='md_nav23_pass_progress_v1',D='md_nav23_pass_daily_v1',C='md_pass_plan_session_checkpoint_v2';let n=0,passed=0;
function date(v){day=v}
function harness(){
  const data=new Map();const s={window:null,console,Date:AuditDate,Math,Set,Map,JSON,crypto:{randomUUID:()=> 'test-device'},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},safeStorageSet:(k,v)=>{data.set(k,String(v));return true},
    currentMode:'pass-plan-session',app:{innerHTML:''},escapeHtml:v=>String(v),shuffle:a=>[...a],document:{documentElement:{},addEventListener(){},getElementById(){return null}},MutationObserver:class{observe(){}},
    setTimeout(){},requestAnimationFrame(){},removePastWrong(){},addPastWrong(){},pqid:q=>q._planKey,renderPastLoading(){},mdQuestionUsable:()=>true,mdSourceQuestionUsable:()=>true,
    showToast(){},getPastProgress:()=>null,clearPastProgress(){},showConfirm:(m,f)=>f(),ensurePastExplainForYears:async()=>{},pastDataSubjectsLoaded:new Set(['navi2','navi3']),ensurePastDataForSubject:async()=>{},n3aNormalizeQuestion:v=>String(v||'').replace(/\s+/g,'')};
  s.window=s;s.__mdDriveSyncV2={resetKey:(k,v)=>s.safeStorageSet(k,v)};vm.createContext(s);
  for(const name of ['daily-storage.js','learning-integrity.js','data-identity.js','scheduler-v522.js','balanced-mock.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s);
  const start=html.indexOf('// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제'),end=html.indexOf('</script>',start);let body=html.slice(start,end),close=body.lastIndexOf('})();');
  body=body.slice(0,close)+`window.__test={
    setup(qs,kind='today',prior={}){currentMode='pass-plan-session';planSessionQueue=qs;planSessionKind=kind;planSessionIdx=0;planSessionStartedAt=++window.testSequence;planSessionAnswers=qs.map(()=>null);planSessionConfidence=qs.map(()=>null);planSessionCommitIds=qs.map(()=>null);planSessionCommitted=new Set();planSessionFirstAnswers={};ppSaveProgress(prior);planPools={navi2:qs.filter(q=>q._planGrade==='navi2').map((q,i)=>({key:q._planKey,gradeId:'navi2',subject:q['과목'],question:q['문제'],canonicalQuestion:{...q},count:1,latest:2026,hits:[{year:2026,session:1,number:i+1}]})),navi3:[]};},
    commit(q,answer){planSessionIdx=0;planSessionStartedAt=++window.testSequence;planSessionCommitIds=[];return ppCommitOutcome(q,answer,answer===q['정답']?'sure':'wrong')},
    flush:ppFlushTodayAnswer,repeatCommit(q,answer){return ppCommitOutcome(q,answer,answer===q['정답']?'sure':'wrong')},save:ppSavePassSessionCheckpoint,load:ppLoadPassSessionCheckpoint,schedule:ppScheduleSameDayRecheck,cleared:ppTodayCleared,pending:ppNextDayPending,due:ppReviewDueDate,
    useHydration(qs){const byKey=new Map(qs.map(q=>[q._planKey,q]));ppBuildPools=async()=>planPools;ppHydrateKeys=async keys=>keys.map(k=>byKey.get(k)).filter(Boolean)},
    daily:ppGetDailyAssignment,setFirst(v){planSessionFirstAnswers=v},getQueue(){return planSessionQueue},setIndex(i){planSessionIdx=i},setKind(k){planSessionKind=k},
    progress:ppLoadProgress,plan(v){ppSavePlan(v)},retry:()=>retryNavigatorPassPlanUnresolved(),setPools(v){planPools=v}
  };`+body.slice(close);
  s.testSequence=0;vm.runInContext(body,s);s.renderNavigatorPassPlanCard=()=>{};s.renderNavigatorPassPlan=()=>{};
  const all=['항해','운용','법규','영어','상선전문'];s.__test.plan({dailyCap:70,finalDays:4,priorityMode:'auto',grades:{navi2:{enabled:true,examDate:'2027-06-01',subjects:all},navi3:{enabled:false,examDate:'',subjects:all}}});
  return {s,data};
}
const q=(key='navi2|q',{subject='항해',repeat=false}={})=>({_planKey:key,_planGrade:'navi2','문제':'문제 '+key,'과목':subject,'정답':0,'선택지':['a','b','c','d'],...(repeat?{_sameDayRecheck:true}:{})});
function rec(s,key='navi2|q'){return s.__test.progress()[key]}
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
 await test('lapse resets spacing stage while retaining cumulative study history',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{attempts:100,correct:100,wrong:0,masteryReviews:5,mastered:true,status:'mastered',firstPassDate:'2026-01-01',sameDayConfirmedDate:'2026-10-01'}});
  s.__test.commit(question,1);assert.equal(rec(s).reviewStage,0);assert.equal(rec(s).masteryReviews,5);assert.equal(rec(s).correct,100);assert.equal(rec(s).wrong,1);
  s.__test.commit(question,0);s.__test.commit(question,0);date('2026-10-24');s.__test.commit(question,0);assert.equal(rec(s).reviewStage,1);assert.equal(rec(s).dueDate,'2026-10-29');assert.equal(rec(s).masteryReviews,6);
 });
 await test('an older app client cannot retain a stale modern spacing stage after a lapse',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{attempts:101,correct:100,wrong:1,masteryReviews:5,mastered:false,status:'weak',firstPassDate:'2026-01-01',sameDayConfirmedDate:null,lastWrongDate:day,lastOutcome:'wrong',reviewScheduleVersion:1,reviewStage:4,reviewSuccessDate:'2026-10-01',reviewLapseDate:null}});s.__test.commit(question,0);s.__test.commit(question,0);date('2026-10-24');s.__test.commit(question,0);assert.equal(rec(s).reviewStage,1);assert.equal(rec(s).dueDate,'2026-10-29');assert.equal(rec(s).masteryReviews,6);
 });
 await test('recent independent successes advance despite historic wrong answers',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{attempts:100,correct:0,wrong:100,masteryReviews:0,mastered:false,status:'weak',sameDayConfirmedDate:null}});
  s.__test.commit(question,0);s.__test.commit(question,0);for(const d of ['2026-10-24','2026-10-29','2026-11-05','2026-11-19','2026-12-10']){date(d);s.__test.commit(question,0)}
  assert.equal(rec(s).reviewStage,5);assert.equal(rec(s).dueDate,'2027-01-09');assert.equal(rec(s).wrong,100);assert.equal(rec(s).correct,7);
 });
 await test('same-day repeat cannot demote mastery or advance the spacing stage twice',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{mastered:true,status:'mastered',masteryReviews:3,sameDayConfirmedDate:'2026-10-21',attempts:5,correct:5,wrong:0}});
  s.__test.commit(question,0);const before=rec(s);s.__test.commit(question,0);const after=rec(s);assert.equal(after.mastered,true);assert.equal(after.reviewStage,before.reviewStage);assert.equal(after.dueDate,before.dueDate);assert.equal(after.masteryReviews,before.masteryReviews);
 });
 await test('tail success is explicitly pending tomorrow and can mature on the next day',()=>{
  date('2026-10-22');const {s}=harness(),question=q(),queue=[question,...Array.from({length:14},(_,i)=>q('navi2|tail'+i))];s.__test.setup(queue);s.__test.commit(question,0);s.__test.schedule(question);
  const r=rec(s);assert.equal(r.sameDayConfirmedDate,null);assert.equal(r.nextDayRecheckScheduledDate,'2026-10-22');assert.equal(s.__test.pending(r,day),true);assert.equal(s.__test.cleared(r,day),true);assert.equal(r.dueDate,'2026-10-23');
  date('2026-10-23');s.__test.commit(question,0);assert.equal(rec(s).mastered,true);assert.equal(rec(s).reviewStage,1);assert.equal(rec(s).lateSessionNextDayRecheck,false);
 });
 await test('non-tail success schedules an actual recheck rather than claiming completion',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question,...Array.from({length:15},(_,i)=>q('navi2|rest'+i))]);s.__test.commit(question,0);s.__test.schedule(question);assert.equal(rec(s).sameDayConfirmedDate,null);assert.equal(s.__test.cleared(rec(s),day),false);assert.equal(s.__test.getQueue().filter(x=>x._sameDayRecheck).length,1);
 });
 await test('provisional review and exam-day reviews are never placed after target or into the past',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);s.__test.plan({dailyCap:70,grades:{navi2:{enabled:true,examDate:'2026-10-24'},navi3:{enabled:false,examDate:''}}});s.__test.commit(question,0);s.__test.commit(question,0);assert.equal(rec(s).dueDate,'2026-10-23');
  assert.equal(s.__test.due('2026-10-24',30,'2026-10-24'),'2026-10-25');assert.equal(s.__test.due('2026-10-25',30,'2026-10-24'),'2026-11-24');
 });
 await test('leaving after selecting an answer commits at most once and keeps its position',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);s.chooseNavigatorPassPlanAnswer(0);assert.equal(s.__test.flush(),true);const checkpoint=s.__test.load();assert.equal(checkpoint.nextIndex,0);assert.equal(checkpoint.answers[0],0);assert.equal(rec(s).attempts,1);s.__test.flush();s.nextNavigatorPassPlanQuestion();assert.equal(rec(s).attempts,1);assert.equal(rec(s).recentOutcomes.length,1);
 });
 await test('a failed selected-answer flush leaves the checkpoint and navigation uncommitted',()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question]);s.chooseNavigatorPassPlanAnswer(1);const checkpoint=data.get(C),original=s.safeStorageSet;s.safeStorageSet=(k,v)=>k===P?false:original(k,v);assert.equal(s.__test.flush(),false);assert.equal(data.get(C),checkpoint);assert.equal(Object.keys(s.__test.progress()).length,0);s.safeStorageSet=original;assert.equal(s.__test.flush(),true);assert.equal(rec(s).wrong,1);
 });
 await test('weak drill checkpoint writes preserve original homework including first answers',()=>{
  date('2026-10-22');const {s,data}=harness();s.__test.setup([q()]);s.chooseNavigatorPassPlanAnswer(1);s.__test.save(0);const before=data.get(C);s.__test.setKind('today-wrong');s.__test.save(0);assert.equal(data.get(C),before);assert.equal(JSON.parse(before).firstAnswers['navi2|q'].correct,false);
 });
 await test('real weak-drill transition and homework resume preserve the original first answer',async()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{wrong:2,lastWrongDate:day,status:'weak'}});s.__test.useHydration([question]);s.chooseNavigatorPassPlanAnswer(1);const before=JSON.parse(data.get(C));await s.startNavigatorWeakDrill('today-wrong');const checkpoint=data.get(C);assert.equal(JSON.parse(checkpoint).answers[0],before.answers[0]);assert.equal(JSON.parse(checkpoint).nextIndex,0);assert.deepEqual(JSON.parse(checkpoint).committed,[0]);s.chooseNavigatorPassPlanAnswer(0);s.nextNavigatorPassPlanQuestion();assert.equal(rec(s).lastOutcome,'sure');assert.equal(data.get(C),checkpoint);await s.retryNavigatorPassPlanUnresolved();assert.equal(data.get(C),checkpoint);await s.startNavigatorPassPlanToday();assert.equal(s.__mdPassPlanLearningAPI.getResultStats().baseCorrect,0);assert.equal(s.__test.load().answers[0],1);s.nextNavigatorPassPlanQuestion();assert.equal(rec(s).lastOutcome,'sure','an old selected answer must not overwrite newer recovery');assert.equal(rec(s).wrong,3);
 });
 await test('home detour flushes the saved pending answer before later recovery can overwrite it',async()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question],'today',{[question._planKey]:{wrong:2,lastWrongDate:day,status:'weak'}});s.__test.useHydration([question]);s.chooseNavigatorPassPlanAnswer(1);s.currentMode='home';await s.startNavigatorWeakDrill('today-wrong');const checkpoint=data.get(C);assert.deepEqual(JSON.parse(checkpoint).committed,[0]);s.chooseNavigatorPassPlanAnswer(0);s.nextNavigatorPassPlanQuestion();await s.startNavigatorPassPlanToday();s.nextNavigatorPassPlanQuestion();assert.equal(rec(s).lastOutcome,'sure');assert.equal(rec(s).wrong,3);
 });
 await test('home detour does not recreate a deliberately cleared or completed checkpoint',()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question]);s.chooseNavigatorPassPlanAnswer(1);data.delete(C);s.currentMode='home';assert.equal(s.__test.flush(),true);assert.equal(data.has(C),false);assert.equal(Object.keys(s.__test.progress()).length,0);
  s.__test.setup([question]);s.chooseNavigatorPassPlanAnswer(0);s.nextNavigatorPassPlanQuestion();s.currentMode='home';s.__test.flush();assert.equal(data.has(C),false);assert.equal(rec(s).attempts,1);
 });
 await test('home detour safely ignores a stale malformed in-memory question',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);s.chooseNavigatorPassPlanAnswer(0);delete question['선택지'];s.currentMode='home';assert.equal(s.__test.flush(),true);assert.equal(Object.keys(s.__test.progress()).length,0);
 });
 await test('same-day legacy checkpoint remains valid across both policy upgrades',()=>{
  date('2026-10-22');const {s,data}=harness();data.set(C,JSON.stringify({version:2,date:day,dedupePolicy:'near-duplicate-v1',subjectBalancePolicy:'coverage-even-v2',queueKeys:['navi2|old'],nextIndex:0,answers:[0]}));assert.equal(s.__test.load().queueKeys[0],'navi2|old');assert.ok(data.has(C));
 });
 await test('hint-assisted correct mock answers remain unsure evidence after submission',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);
  s.commitNavigatorPredictiveMockResult([{...question,_predictiveMock:true,_mockHintViewed:true}],[0]);
  const record=rec(s);assert.equal(record.correct,1);assert.equal(record.unsure,1);assert.equal(record.recentOutcomes.at(-1).outcome,'unsure');assert.equal(record.mastered,false);
 });
 await test('mock wrong evidence keeps active assignment and queues separate follow-up',()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question]);s.__test.save(0);data.set(D,JSON.stringify({[day]:{keys:['navi2|q'],signature:'old'}}));const checkpoint=data.get(C);s.commitNavigatorPredictiveMockResult([{...q('navi2|newwrong'),_predictiveMock:true}],[1]);
  assert.deepEqual(JSON.parse(data.get(D))[day].keys,['navi2|q']);assert.deepEqual(JSON.parse(data.get(D))[day].pendingMockReviewKeys,['navi2|newwrong']);assert.equal(data.get(C),checkpoint);assert.equal(rec(s,'navi2|newwrong').reviewStage,0);
 });
 await test('daily display restores the checkpoint queue when cached assignment differs',async()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question]);s.__test.save(0);data.set(D,JSON.stringify({[day]:{keys:['navi2|newwrong'],signature:'old'}}));const pools={navi2:[{key:'navi2|q',gradeId:'navi2',subject:'항해'}],navi3:[]};const plan={grades:{navi2:{enabled:true,examDate:'2026-11-14'},navi3:{enabled:false,examDate:''}}};
  const a=await s.__test.daily(plan,pools,{},false);assert.deepEqual(Array.from(a.keys),['navi2|q']);assert.equal(a.resumedCheckpoint,true);assert.equal(a.estimatedTotalAnswers,1);
 });
 await test('result API separates first attempts, rechecks, pending confirmations and subjects',()=>{
  date('2026-10-22');const {s}=harness(),question=q(),english=q('navi2|english',{subject:'영어'});s.__test.setup([question,{...question,_sameDayRecheck:true},english]);s.chooseNavigatorPassPlanAnswer(1);s.__test.setIndex(1);s.chooseNavigatorPassPlanAnswer(0);s.__test.setIndex(2);s.chooseNavigatorPassPlanAnswer(0);
  const stats=s.__mdPassPlanLearningAPI.getResultStats();assert.equal(stats.baseTotal,2);assert.equal(stats.baseCorrect,1);assert.equal(stats.recheckTotal,1);assert.equal(stats.recheckCorrect,1);assert.equal(stats.subjects.find(x=>x.subject==='항해').firstCorrect,0);
 });
 await test('unresolved retry deduplicates source questions and retains original first answers',async()=>{
  date('2026-10-22');const {s}=harness(),question=q(),english=q('navi2|english',{subject:'영어'});s.__test.setup([question,{...question,_sameDayRecheck:true},english]);s.__test.useHydration([question,english]);s.__test.setFirst({[question._planKey]:{answer:1,correct:false,subject:'항해'},[english._planKey]:{answer:0,correct:true,subject:'영어'}});await s.retryNavigatorPassPlanUnresolved();assert.equal(s.__test.getQueue().length,2);const stats=s.__mdPassPlanLearningAPI.getResultStats();assert.equal(stats.baseTotal,2);assert.equal(stats.baseCorrect,1);assert.ok(s.__test.load());
 });
 await test('evidence revision reacts to imported or synchronized progress and stays stable otherwise',()=>{
  date('2026-10-22');const {s,data}=harness(),api=s.__mdPassPlanLearningAPI;const before=api.getEvidenceRevision();assert.equal(api.getEvidenceRevision(),before);data.set(P,JSON.stringify({'navi2|imported':{attempts:1}}));assert.ok(api.getEvidenceRevision()>before);
 });
 await test('topic evidence scans source questions once per revision and invalidates after sync',()=>{
  date('2026-10-22');const {s,data}=harness(),question=q();s.__test.setup([question]);s.__test.commit(question,0);let lookups=0;s.getPastExam=()=>({questions:[{...question,'번호':1}]});s.mdQuestionUsable=()=>{lookups++;return true};const api=s.__mdPassPlanLearningAPI,first=api.getRecentTopicEvidence('navi2');assert.equal(first.length,1);assert.equal(first[0].choices.length,4);assert.equal(api.getRecentTopicEvidence('navi2'),first);assert.equal(lookups,1);const changed=JSON.parse(data.get(P));changed[question._planKey].wrong=2;data.set(P,JSON.stringify(changed));assert.notEqual(api.getRecentTopicEvidence('navi2'),first);assert.equal(lookups,2);
 });
 await test('recent evidence is bounded and distinguishes homework from mock practice',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);for(let i=0;i<30;i++)s.__test.commit(question,i%2);assert.equal(rec(s).recentOutcomes.length,3);assert.equal(rec(s).recentOutcomes[0].mode,'homework');s.commitNavigatorPredictiveMockResult([{...question,_predictiveMock:true}],[0]);assert.equal(rec(s).recentOutcomes.at(-1).mode,'predictive-mock');
 });
 await test('evidence identities distinguish same-millisecond attempts and survive replay unchanged',()=>{
  date('2026-10-22');const {s}=harness(),question=q();s.__test.setup([question]);s.__test.commit(question,0);const first=rec(s).recentOutcomes[0];s.__test.repeatCommit(question,0);assert.equal(rec(s).recentOutcomes.length,1);assert.equal(rec(s).recentOutcomes[0].evidenceId,first.evidenceId);s.__test.commit(question,0);const events=rec(s).recentOutcomes;assert.equal(events.length,2);assert.notEqual(events[0].evidenceId,events[1].evidenceId);assert.equal(events[0].at,events[1].at);assert.ok(Number.isFinite(Date.parse(events[0].at)));
 });
 await test('oral exam cap changes actual due date while retaining SM-2 model and same-day safeguards',()=>{
  date('2026-10-22');const s={console,Date:AuditDate,Math,schedule:{exam:'2026-10-26'},SM2_DEFAULT_EF:2.5,SM2_MIN_EF:1.3,toLocalDateInput:d=>d.toISOString().slice(0,10)};vm.createContext(s);
  const begin=html.indexOf('// oral-review-exam-cap-v522'),end=html.indexOf('function shuffle(a)',begin);vm.runInContext(html.slice(begin,end),s);
  const item={ef:2.5,reps:2,interval:6};s.updateSpacedReview(item,5);assert.equal(item.interval,16);assert.equal(item.nextReview.slice(0,10),'2026-10-25');const once=JSON.stringify(item);s.updateSpacedReview(item,5);assert.equal(JSON.stringify(item),once);s.updateSpacedReview(item,1);assert.equal(item.reps,0);assert.equal(item.interval,1);assert.equal(item.nextReview.slice(0,10),'2026-10-23');
 });
 console.log('mastery/session v5.22 regressions: PASS ('+passed+' cases)');
})().catch(e=>{console.error(e);process.exitCode=1});
