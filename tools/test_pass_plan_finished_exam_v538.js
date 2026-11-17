'use strict';
// v5.38: an exam that already took place must not block settings, weak drills or warnings.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(process.env.MD_TEST_HTML||path.join(root,'index.html'),'utf8');
const NativeDate=Date;let day='2026-11-17';
class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[day+'T12:00:00']))}static now(){return +new NativeDate(day+'T12:00:00')}}
const PLAN='md_nav23_pass_plan_v1',PROGRESS='md_nav23_pass_progress_v1';
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}

function harness({plan,progress={},form}){
  const data=new Map([[PLAN,JSON.stringify(plan)],[PROGRESS,JSON.stringify(progress)]]),toasts=[];
  const fields=new Map();
  for(const g of ['navi2','navi3']){
    const f=form[g];fields.set('pp-enable-'+g,{checked:f.enabled});fields.set('pp-date-'+g,{value:f.examDate});
  }
  fields.set('pp-daily-cap',{value:String(form.cap||120)});fields.set('pp-final-days',{value:'4'});fields.set('pp-priority-navi3-pct',{value:'80'});
  const subjects=['항해','운용','법규','영어','상선전문'];
  const s={console,Date:FixedDate,Math,Set,Map,JSON,Object,Array,Number,String,Promise,
    localStorage:{getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},
    safeStorageSet:(k,v)=>{data.set(k,String(v));return true},showToast:m=>toasts.push(m),
    currentMode:'home',app:{innerHTML:'',appendChild(){}},escapeHtml:v=>String(v),icon:()=>'',SVG_ICONS:{},
    document:{getElementById:id=>fields.get(id)||null,querySelector:sel=>sel.includes('pp-priority-mode')?{value:'auto'}:null,
      querySelectorAll:sel=>{const g=(sel.match(/navi[23]/)||[])[0];return subjects.map(v=>({value:v,checked:true}))},documentElement:{},addEventListener(){}},
    setTimeout(){},stopTTS(){},stopMockTimer(){},renderPastLoading(){},pickPrepType(){},
    mdQuestionUsable:()=>true,ensurePastExplainForYears:async()=>{},pastDataSubjectsLoaded:new Set(['navi2','navi3']),ensurePastDataForSubject:async()=>{},
    getPastProgress:()=>null,clearPastProgress(){},showConfirm:(m,f)=>f(),shuffle:a=>[...a],removePastWrong(){},addPastWrong(){},pqid:q=>q._planKey,
    ensureNavi3FrequencyData:async()=>{},PAST_MOCK_PER_SUBJECT:25,crypto:{randomUUID:()=>'test-device'}};
  s.__mdWeakTopicClassifier={classify:()=>'기타'};s.window=s;s.__mdDriveSyncV2={resetKey:(k,v)=>s.safeStorageSet(k,v)};
  vm.createContext(s);
  for(const name of ['daily-storage.js','learning-integrity.js','data-identity.js','scheduler-v522.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s);
  // Pools: two questions per grade, one wrong today in each grade.
  const pools={navi2:[],navi3:[]};
  for(const g of ['navi2','navi3'])for(let i=0;i<2;i++)pools[g].push({key:`${g}|q${i}`,gradeId:g,groupId:'q'+i,subject:subjects[i],count:2,latest:2025,maxYear:2026,hits:[{year:2025}],canonicalQuestion:{'문제':g+i,'선택지':['a','b','c','d'],'정답':0,'과목':subjects[i],_year:2025,'회차':1,'번호':i+1}});
  s.n3aData=g=>({subjects,meta:{years:[2022,2023,2024,2025,2026]},groups:[]});
  const start=html.indexOf('// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제'),end=html.indexOf('</script>',start);
  let body=html.slice(start,end);const close=body.lastIndexOf('})();');
  body=body.slice(0,close)+`window.__test={
    finished:ppGradeFinished,active:plan=>ppActivePlanItems(plan),todayWrong:(plan,progress,today)=>ppTodayWrongItems(plan,progress,today),
    frequent:(plan,progress)=>ppFrequentWrongItems(plan,progress),loadPlan:ppLoadPlan,setPools(v){planPools=v;ppBuildPools=async()=>{planPools=v;return v}}
  };`+body.slice(close);
  vm.runInContext(body,s);
  s.__test.setPools(pools);
  return {s,data,toasts};
}
const both=(n2,n3)=>({dailyCap:120,finalDays:4,priorityMode:'auto',priorityNavi3Pct:80,revision:1,grades:{navi2:{enabled:true,examDate:n2,subjects:null},navi3:{enabled:true,examDate:n3,subjects:null}}});
const wrongToday={'navi2|q0':{attempts:3,wrong:2,correct:1,lastWrongDate:'2026-11-17',status:'weak'},'navi3|q0':{attempts:3,wrong:2,correct:1,lastWrongDate:'2026-11-17',status:'weak'}};

(async()=>{
  await test('a finished exam is detected only after its date; exam day still counts as active',()=>{
    const {s}=harness({plan:both('2026-11-10','2027-03-01'),form:{navi2:{enabled:true,examDate:'2026-11-10'},navi3:{enabled:true,examDate:'2027-03-01'}}});
    const plan=s.__test.loadPlan();
    assert.equal(s.__test.finished(plan,'navi2','2026-11-17'),true);
    assert.equal(s.__test.finished(plan,'navi3','2026-11-17'),false);
    assert.equal(s.__test.finished(plan,'navi2','2026-11-10'),false,'exam day is not finished yet');
  });
  await test('weak drills exclude questions of a finished exam but keep the active grade',()=>{
    const {s}=harness({plan:both('2026-11-10','2027-03-01'),form:{navi2:{enabled:true,examDate:'2026-11-10'},navi3:{enabled:true,examDate:'2027-03-01'}}});
    const plan=s.__test.loadPlan();
    assert.deepEqual([...s.__test.active(plan).map(x=>x.gradeId)].sort(),['navi3','navi3']);
    assert.deepEqual([...s.__test.todayWrong(plan,JSON.parse(JSON.stringify(wrongToday)),'2026-11-17').map(x=>x.key)],['navi3|q0']);
    assert.deepEqual([...s.__test.frequent(plan,JSON.parse(JSON.stringify(wrongToday))).map(x=>x.key)],['navi3|q0']);
  });
  await test('settings save with an unchanged past exam date instead of being blocked',async()=>{
    const {s,data,toasts}=harness({plan:both('2026-11-10','2027-03-01'),form:{navi2:{enabled:true,examDate:'2026-11-10'},navi3:{enabled:true,examDate:'2027-03-01'},cap:150}});
    s.renderNavigatorPassPlan=async()=>{};
    await s.saveNavigatorPassPlanSettings();
    assert.equal(JSON.parse(data.get(PLAN)).dailyCap,150,'other settings are saved');
    assert.ok(!toasts.some(t=>t.includes('지났습니다')||t.includes('오늘 이후')),toasts.join(' / '));
  });
  await test('a newly entered past exam date is still rejected',async()=>{
    const {s,data,toasts}=harness({plan:both('2027-01-16','2027-03-01'),form:{navi2:{enabled:true,examDate:'2026-11-01'},navi3:{enabled:true,examDate:'2027-03-01'},cap:150}});
    s.renderNavigatorPassPlan=async()=>{};
    await s.saveNavigatorPassPlanSettings();
    assert.equal(JSON.parse(data.get(PLAN)).dailyCap,120,'nothing is saved');
    assert.ok(toasts.some(t=>t.includes('이미 지났습니다')));
  });
  await test('an enabled grade without an exam date is still rejected',async()=>{
    const {s,data,toasts}=harness({plan:both('2027-01-16','2027-03-01'),form:{navi2:{enabled:true,examDate:''},navi3:{enabled:true,examDate:'2027-03-01'},cap:150}});
    s.renderNavigatorPassPlan=async()=>{};
    await s.saveNavigatorPassPlanSettings();
    assert.equal(JSON.parse(data.get(PLAN)).dailyCap,120);
    assert.ok(toasts.some(t=>t.includes('시험일을 입력하세요')));
  });
  await test('plan screen hides deadline warnings for exam-day or finished grades and marks the finished card',async()=>{
    const {s}=harness({plan:both('2026-11-10','2027-03-01'),form:{navi2:{enabled:true,examDate:'2026-11-10'},navi3:{enabled:true,examDate:'2027-03-01'}}});
    s.mdOrganizePassPlan=()=>{};
    await s.renderNavigatorPassPlan('navi3');
    const out=s.app.innerHTML;
    assert.ok(out.includes('data-pass-plan-finished'),'finished guidance is shown');
    assert.ok(out.includes('시험 종료'));
    assert.ok(!out.includes('2급 항해사 미통과'),'no first-pass deadline warning for the finished grade');
    assert.ok(out.includes('3급 항해사 미통과'),'the active grade keeps its coverage line');
  });
  console.log(`pass plan finished-exam v5.38 regressions: PASS (${passed} cases)`);
})().catch(e=>{console.error(e);process.exitCode=1});
