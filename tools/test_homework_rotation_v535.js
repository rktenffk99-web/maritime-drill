'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(process.env.MD_TEST_HTML||path.join(root,'index.html'),'utf8');
const built=spawnSync(process.env.MD_PYTHON||'python',['tools/patch_homework_rotation_v535.py','--stdin','--stdout'],{cwd:root,input:html,encoding:'utf8',maxBuffer:60*1024*1024});
assert.equal(built.status,0,built.stderr);assert.equal(built.stdout,html,'apply the homework rotation patch before final verification');
// Execute the real session functions through the existing app harness.
let source=fs.readFileSync(path.join(__dirname,'test_mastery_sessions_v522.js'),'utf8').split('(async()=>{')[0];
source=source.replace('progress:ppLoadProgress,','state(){return {index:planSessionIdx,answers:planSessionAnswers.slice(),committed:[...planSessionCommitted]}},progress:ppLoadProgress,');
const box={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(source+'\nmodule.exports={harness,q,rec,date};',box);
const {harness:base,q,rec,date}=box.module.exports,P='md_nav23_pass_progress_v1',C='md_pass_plan_session_checkpoint_v2';
let count=0;
function harness(size=1){
  date('2026-10-22');const h=base(),s=h.s,questions=Array.from({length:size},(_,i)=>q('navi2|q'+i)),notices=[];
  s.showToast=message=>notices.push(message);s.__test.setup(questions);s.__test.useHydration(questions);s.__test.save(0);
  const save=s.safeStorageSet,fail={schedule:true};let scheduleWrites=0;
  s.safeStorageSet=(key,value)=>{
    const rows=key===P?Object.values(JSON.parse(value)):[];
    if(rows.some(r=>r.lateSessionNextDayRecheck)){scheduleWrites++;if(fail.schedule)return false;}
    return save(key,value);
  };
  return {...h,questions,notices,fail,record:()=>rec(s,'navi2|q0'),writes:()=>scheduleWrites};
}
async function test(name,run){await run();count++;console.log('PASS '+name)}
(async()=>{
  await test('last-answer recheck save failure retains the answer and checkpoint instead of completing',()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(0);h.s.nextNavigatorPassPlanQuestion();
    assert.equal(h.s.__test.state().index,0);assert.equal(h.s.__test.state().answers[0],0);assert.ok(h.data.has(C));
    assert.equal(h.record().attempts,1);assert.equal(h.record().lateSessionNextDayRecheck,false);assert.equal(h.s.__mdHomeworkPersistence.hasUnsaved(),true);
    assert.match(h.notices.at(-1),/재확인 일정을 저장하지 못/);
  });
  await test('retry saves tomorrow recheck and completion without scoring the same answer twice',()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(0);h.s.nextNavigatorPassPlanQuestion();h.fail.schedule=false;
    assert.equal(h.s.retryNavigatorPassPlanSave(),true);assert.equal(h.s.__mdHomeworkPersistence.hasUnsaved(),false);
    assert.equal(h.record().dueDate,'2026-10-23');assert.equal(h.record().lateSessionNextDayRecheck,true);assert.equal(h.record().attempts,1);
    const writes=h.writes();h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.state().index,1);assert.equal(h.data.has(C),false);assert.equal(h.record().attempts,1);
    assert.equal(h.writes(),writes,'already saved deferred recheck is not written again');
  });
  await test('reload after deferred-recheck failure retries the saved occurrence without duplicate credit',async()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(0);h.s.nextNavigatorPassPlanQuestion();
    const reopened=harness();reopened.data.clear();for(const [k,v]of h.data)reopened.data.set(k,v);reopened.fail.schedule=false;
    await reopened.s.startNavigatorPassPlanToday();reopened.s.nextNavigatorPassPlanQuestion();
    assert.equal(reopened.record().attempts,1);assert.equal(reopened.record().dueDate,'2026-10-23');assert.equal(reopened.record().lateSessionNextDayRecheck,true);assert.equal(reopened.data.has(C),false);
  });
  await test('home navigation is blocked until both answer and recheck schedule are saved',()=>{
    const h=harness();h.s.chooseNavigatorPassPlanAnswer(0);assert.equal(h.s.__mdHomeworkPersistence.beforeLeave(),false);
    assert.equal(h.s.currentMode,'pass-plan-session');assert.equal(h.s.__test.state().index,0);assert.ok(h.data.has(C));assert.equal(h.record().attempts,1);
    h.fail.schedule=false;assert.equal(h.s.__mdHomeworkPersistence.beforeLeave(),true);assert.equal(h.record().attempts,1);assert.equal(h.record().dueDate,'2026-10-23');
  });
  await test('retrying non-tail homework inserts one spaced recheck and preserves the base question count',()=>{
    const h=harness(16);h.fail.schedule=false;h.s.chooseNavigatorPassPlanAnswer(0);
    assert.equal(h.s.retryNavigatorPassPlanSave(),true);assert.equal(h.s.retryNavigatorPassPlanSave(),true);
    const queue=h.s.__test.getQueue();assert.equal(queue.length,17);assert.equal(queue.filter(x=>x._sameDayRecheck).length,1);assert.equal(h.record().attempts,1);
    h.s.nextNavigatorPassPlanQuestion();assert.equal(h.s.__test.getQueue().length,17);assert.equal(h.record().attempts,1);
  });
  console.log(`homework rotation v5.35 regressions: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
