'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const built=spawnSync(process.env.MD_PYTHON||'python',['tools/patch_homework_checkpoint_v533.py','--stdin','--stdout'],{cwd:root,input:html,encoding:'utf8',maxBuffer:60*1024*1024});
assert.equal(built.status,0,built.stderr);assert.equal(built.stdout,html,'final homework patch must be applied and idempotent');
// Reuse the actual app-function harness; no production behavior is duplicated here.
let source=fs.readFileSync(path.join(__dirname,'test_mastery_sessions_v522.js'),'utf8').split('(async()=>{')[0];
source=source.replace('progress:ppLoadProgress,','state(){return {index:planSessionIdx,answers:planSessionAnswers.slice(),committed:[...planSessionCommitted]}},progress:ppLoadProgress,');
const box={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(source+'\nmodule.exports={harness,q,rec,date};',box);
const {harness:base,q,rec,date}=box.module.exports,C='md_pass_plan_session_checkpoint_v2';
let count=0;
function harness(size=2){
  date('2026-10-22');const h=base(),s=h.s,notices=[];s.showToast=message=>notices.push(message);s.console={...console,warn(){}};
  const questions=Array.from({length:size},(_,i)=>q('navi2|q'+i));s.__test.setup(questions);s.__test.save(0);s.__test.useHydration(questions);
  const set=s.localStorage.setItem,remove=s.localStorage.removeItem,fail={set:()=>false,remove:()=>false};
  s.localStorage.setItem=(k,v)=>{if(fail.set(k,v))throw Error('QuotaExceededError');return set(k,v)};
  s.localStorage.removeItem=k=>{if(fail.remove(k))throw Error('SecurityError');return remove(k)};
  return {...h,s,notices,questions,fail,stored:()=>JSON.parse(h.data.get(C)||'null'),record:()=>rec(s,'navi2|q0')};
}
async function test(name,run){await run();count++;console.log('PASS '+name)}
(async()=>{
  await test('failed answer save retains the live answer, warns, and blocks next before scoring',()=>{
    const h=harness(),before=h.data.get(C);h.fail.set=k=>k===C;h.s.chooseNavigatorPassPlanAnswer(1);
    assert.equal(h.s.__test.state().answers[0],1);assert.equal(h.data.get(C),before);assert.equal(h.s.__mdHomeworkPersistence.hasUnsaved(),true);assert.match(h.notices.at(-1),/저장하지 못/);
    h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,0);assert.equal(h.record(),undefined);assert.equal(h.data.get(C),before);
  });
  await test('same-answer retry persists without changing the answer or recording it twice',()=>{
    const h=harness();h.fail.set=k=>k===C;h.s.chooseNavigatorPassPlanAnswer(1);h.fail.set=()=>false;h.s.chooseNavigatorPassPlanAnswer(1);
    assert.equal(h.stored().answers[0],1);assert.equal(h.s.__mdHomeworkPersistence.hasUnsaved(),false);h.s.chooseNavigatorPassPlanAnswer(0);assert.equal(h.stored().answers[0],1);
    h.s.nextNavigatorPassPlanQuestion();assert.equal(h.record().attempts,1);assert.equal(h.record().wrong,1);
  });
  await test('post-score cursor failure stays on the question and retry preserves one attempt',()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(1);h.fail.set=(k,v)=>k===C&&JSON.parse(v).nextIndex===1;
    h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,0);assert.equal(h.record().attempts,1);assert.equal(h.stored().answers[0],1);assert.equal(h.stored().nextIndex,0);
    h.fail.set=()=>false;h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,1);assert.equal(h.record().attempts,1);assert.equal(h.stored().nextIndex,1);
  });
  await test('reload after post-score cursor failure reuses the saved occurrence identity',async()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(1);h.fail.set=(k,v)=>k===C&&JSON.parse(v).nextIndex===1;h.s.nextNavigatorPassPlanQuestion();
    const reopened=harness();reopened.data.clear();for(const [k,v]of h.data)reopened.data.set(k,v);
    await reopened.s.startNavigatorPassPlanToday();assert.equal(reopened.s.__test.state().answers[0],1);reopened.s.nextNavigatorPassPlanQuestion();assert.equal(reopened.record().attempts,1);assert.equal(reopened.record().wrong,1);
  });
  await test('previous navigation also waits for its exact cursor checkpoint',()=>{
    const h=harness(3);h.s.chooseNavigatorPassPlanAnswer(1);h.s.nextNavigatorPassPlanQuestion();h.fail.set=(k,v)=>k===C&&JSON.parse(v).nextIndex===0;
    h.s.prevNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,1);assert.equal(h.stored().nextIndex,1);
    h.fail.set=()=>false;h.s.prevNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,0);assert.equal(h.stored().nextIndex,0);
  });
  await test('leaving after a failed checkpoint is blocked until the pending answer is durable',()=>{
    const h=harness();h.fail.set=k=>k===C;h.s.chooseNavigatorPassPlanAnswer(1);assert.equal(h.s.__mdHomeworkPersistence.beforeLeave(),false);assert.equal(h.s.currentMode,'pass-plan-session');assert.equal(h.record(),undefined);
    h.fail.set=()=>false;assert.equal(h.s.__mdHomeworkPersistence.beforeLeave(),true);assert.equal(h.record().attempts,1);assert.equal(h.stored().answers[0],1);assert.deepEqual(h.stored().committed,[0]);
    assert.equal(h.s.__mdHomeworkPersistence.beforeLeave(),true);assert.equal(h.record().attempts,1);
  });
  await test('completion removal failure cannot leave a ghost result or double count on retry',()=>{
    const h=harness(1);h.s.chooseNavigatorPassPlanAnswer(1);h.fail.remove=k=>k===C;h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,0);assert.ok(h.data.has(C));assert.equal(h.record().attempts,1);
    h.fail.remove=()=>false;h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,1);assert.equal(h.data.has(C),false);assert.equal(h.record().attempts,1);
  });
  await test('returning to homework cannot replace an unsaved live answer with the stale checkpoint',async()=>{
    const h=harness();h.fail.set=k=>k===C;h.s.chooseNavigatorPassPlanAnswer(1);h.s.currentMode='home';await h.s.startNavigatorPassPlanToday();assert.equal(h.s.currentMode,'pass-plan-session');assert.equal(h.s.__test.state().answers[0],1);assert.equal(h.stored().answers[0],null);
  });
  await test('global home navigation and unload obey the real persistence guard',()=>{
    const h=harness(),s=h.s,events={};let homeCalls=0;s.renderSubjectSelect=()=>homeCalls++;s.addEventListener=(name,cb)=>events[name]=cb;
    const nav=fs.readFileSync(path.join(root,'app-navigation.js'),'utf8'),start=nav.indexOf('  // Homework checkpoints follow'),end=nav.indexOf("  window.addEventListener('pagehide'",start);assert.ok(start>=0&&end>start);vm.runInContext(nav.slice(start,end),s);
    h.fail.set=k=>k===C;s.chooseNavigatorPassPlanAnswer(1);s.renderSubjectSelect();assert.equal(homeCalls,0);
    let prevented=false;const event={preventDefault(){prevented=true}};events.beforeunload(event);assert.equal(prevented,true);assert.equal(event.returnValue,'');
    h.fail.set=()=>false;s.renderSubjectSelect();assert.equal(homeCalls,1);assert.equal(h.record().attempts,1);
  });
  await test('lifecycle observation cannot overwrite a checkpoint explicitly restored by another flow',()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(1);
    const restored=JSON.stringify({...h.stored(),answers:[0,null],startedAt:987654321});h.data.set(C,restored);
    assert.equal(h.s.__mdHomeworkPersistence.checkpoint(),true);assert.equal(h.data.get(C),restored);
  });
  await test('separate weak drills retain today homework checkpoint unchanged',()=>{
    const h=harness(),before=h.data.get(C);h.s.__test.setKind('today-wrong');h.s.chooseNavigatorPassPlanAnswer(1);h.s.nextNavigatorPassPlanQuestion();assert.equal(h.data.get(C),before);assert.equal(h.s.__mdHomeworkPersistence.hasUnsaved(),false);
  });
  assert.match(html,/data-homework-save-status/);assert.match(html,/onclick="retryNavigatorPassPlanSave\(\)"/);
  console.log(`homework checkpoint v5.33 regressions: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
