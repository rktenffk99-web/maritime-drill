'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),zlib=require('zlib'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.join(__dirname,'..'),rawHtml=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const bundledPython=path.resolve(path.dirname(process.execPath),'../../python/python.exe');
const python=process.env.MD_PYTHON||(process.platform==='win32'&&fs.existsSync(bundledPython)?bundledPython:'python');
function generate(input){
  const args=['tools/patch_learning_audit.py','--stdout'];if(input!==undefined)args.push('--stdin');
  const result=spawnSync(python,args,{cwd:root,input,encoding:'utf8',maxBuffer:50*1024*1024,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
  if(result.error)throw result.error;
  assert.equal(result.status,0,result.stderr);return result.stdout.replace(/\r\n/g,'\n');
}
const html=generate();
if(process.argv.includes('--final'))assert.ok(rawHtml===html,'apply patch_learning_audit.py before final-artifact verification');
const copy=value=>JSON.parse(JSON.stringify(value));
const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const PROGRESS='md_nav23_pass_progress_v1',DAILY='md_nav23_pass_daily_v1';
function harness(){
  const data=new Map(),writes=[],notes=new Map();
  const s={window:null,console,Date,Math,Set,Map,JSON,crypto:{randomUUID:()=> 'audit-device'},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>{data.set(k,String(v));writes.push(k)},removeItem:k=>data.delete(k)},
    safeStorageSet:(k,v)=>{data.set(k,String(v));writes.push(k);return true},
    app:{innerHTML:''},currentMode:'past',pastQueue:[],pastAnswers:[],pastIdx:0,pastMode:'mock',pastStartedAt:1,pastProgressId:'audit-result',pastResultId:null,
    pastReturnView:'pass-plan-predictive-mock',pastSubjectId:'navi3',pastBaseShort:'navi3',pastAllYears:false,pastYear:null,pastSession:null,
    SUBJECTS:[{id:'navi3',name:'3급 항해사'}],SUBJECT_GROUPS:[],n3aData:()=>null,
    addPastWrong(q,answer){notes.set(q._planKey,{q,answer})},removePastWrong:id=>notes.delete(id),pqid:q=>q._planKey,
    icon:()=>'',escapeHtml:v=>String(v??''),pastChoiceText:v=>String(v??''),renderExplainBlock:()=>'',recordPastSession(){},clearPastProgress(){},
    showConfirm:(m,f)=>f(),showToast(){},getPastProgress:()=>null,setTimeout(){},requestAnimationFrame(){},
    MutationObserver:class{observe(){}},document:{documentElement:{},addEventListener(){},getElementById:()=>null},
    navi3AnalysisState:{range:'all',sort:'count'},naviAnalysisSubjectId:'navi3',
    n3aRangeYears:()=>new Set([2026]),n3aFilteredHits:hits=>hits||[],n3aUniqueYears:hits=>[...new Set(hits.map(h=>h.year))],n3aRepeatScore:()=>1,
    n3aNormalizeQuestion:v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,''),
    renderPastLoading(){},pastDataSubjectsLoaded:new Set(['navi3']),ensurePastExplainForYears:async()=>{}};
  s.window=s;vm.createContext(s);
  for(const name of ['daily-storage.js','learning-integrity.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s,{filename:name});
  const guardStart=html.indexOf('function mdQuestionContentIssue(q)'),guardEnd=html.indexOf('function pastChoiceText(',guardStart);
  vm.runInContext(html.slice(guardStart,guardEnd),s);
  const start=html.indexOf('// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제'),end=html.indexOf('</script>',start);
  const source=html.slice(start,end),close=source.lastIndexOf('})();');
  vm.runInContext(source.slice(0,close)+'window.__audit={progressStats:ppProgressStats,uniqueUnseen:ppHomeworkUniqueUnseen,build:ppBuildTodayAssignment,buildPools:ppBuildPools,find:ppFindQuestion,identity:ppHomeworkClusterId};'+source.slice(close),s);
  const resultStart=html.indexOf('function renderPastResult(){'),resultEnd=html.indexOf('\nfunction escapeHtml(',resultStart);
  vm.runInContext(html.slice(resultStart,resultEnd),s);
  const frequencyStart=html.indexOf('function n3aPracticeGroups('),frequencyEnd=html.indexOf('async function startNavi3FrequencyPractice(',frequencyStart);
  vm.runInContext(html.slice(frequencyStart,frequencyEnd),s);
  const openStart=html.indexOf('async function openNavi3FrequencyQuestion('),openEnd=html.indexOf('function n3aMatchTopic(',openStart);
  vm.runInContext(html.slice(openStart,openEnd),s);
  data.set(PROGRESS,JSON.stringify({'navi3|existing':{attempts:1,correct:1,wrong:0}}));
  data.set(DAILY,JSON.stringify({[dateKey()]:{keys:['navi3|homework-a'],signature:'unchanged'}}));
  return {s,data,writes,notes};
}
const question={_predictiveMock:true,_planKey:'navi3|audit-question',_planGrade:'navi3','선택지':['a','b','c','d'],'정답':0,'문제':'테스트 문항','과목':'법규','번호':1};
function sourceQuestion(){
  const m=html.match(/<script[^>]+id=["']md-bundle-past-2026-navi3-3_js["'][^>]*>([\s\S]*?)<\/script>/);
  assert.ok(m,'2026 question bundle exists');
  const s={window:null};s.window=s;vm.createContext(s);
  vm.runInContext(zlib.gunzipSync(Buffer.from(m[1].trim(),'base64')).toString('utf8'),s);
  return s.MD_PAST['2026-navi3-3'].questions.find(q=>q['과목']==='법규'&&q['번호']===20);
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
  await test('generator is idempotent and does not mutate index.html',()=>{
    assert.equal(generate(html),html);assert.equal(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n'),rawHtml);
  });
  await test('evaluation answers preserve wrong notes, training progress and homework',()=>{
    for(const answer of [0,1,null]){
      const {s,data,writes,notes}=harness(),q={...question,_evaluationMock:true},prior={q:{prior:true},answer:3};
      notes.set(q._planKey,prior);const before=JSON.stringify([...data]);s.pastQueue=[q];s.pastAnswers=[answer];s.renderPastResult();
      assert.equal(JSON.stringify([...data]),before);assert.equal(notes.size,1);assert.equal(notes.get(q._planKey),prior);assert.equal(writes.length,0);
    }
  });
  await test('evaluation wrong-answer retry remains isolated',()=>{
    const {s,data,writes,notes}=harness(),q={...question,_evaluationMock:true,_predictiveReview:true};
    s.pastQueue=[q];s.pastAnswers=[1];const before=JSON.stringify([...data]);s.renderPastResult();
    assert.equal(notes.size,0);assert.equal(JSON.stringify([...data]),before);assert.equal(writes.length,0);
  });
  await test('unanswered papers and practice review do not invalidate today homework',()=>{
    for(const [queue,answers] of [[[question],[null]],[[question],[]],[[{...question,_predictiveReview:true}],[1]],[[],[]]]){
      const {s,data,writes}=harness(),before=JSON.stringify([...data]);s.commitNavigatorPredictiveMockResult(queue,answers);
      assert.equal(JSON.stringify([...data]),before);assert.equal(writes.length,0);
    }
  });
  await test('answered practice still records outcomes and rebuilds the homework assignment',()=>{
    const {s,data,notes}=harness();s.pastQueue=[question,{...question,_planKey:'navi3|correct'}];s.pastAnswers=[1,0];
    notes.set('navi3|correct',{prior:true});s.renderPastResult();
    const p=JSON.parse(data.get(PROGRESS));assert.equal(p[question._planKey].wrong,1);assert.equal(p['navi3|correct'].correct,1);
    assert.equal(JSON.parse(data.get(DAILY))[dateKey()],undefined);assert.equal(notes.has(question._planKey),true);assert.equal(notes.has('navi3|correct'),false);
  });
  const duplicatePool=[{key:'navi2|q-11uymt4',gradeId:'navi2',subject:'항해',count:2,latest:2025,hits:[{year:2025}]},{key:'navi2|q-frpsl4',gradeId:'navi2',subject:'항해',count:2,latest:2025,hits:[{year:2025}]}];
  const plan={dailyCap:40,finalDays:4,priorityMode:'auto',grades:{navi2:{enabled:true,examDate:'2099-01-01'},navi3:{enabled:false,examDate:''}}};
  await test('completed duplicate cluster reaches full progress and has no unseen assignment',()=>{
    const {s}=harness(),progress={'navi2|q-11uymt4':{firstPassDate:dateKey(),mastered:true,status:'mastered',attempts:3,correct:3,wrong:0,dueDate:'2099-01-01'}};
    const stats=s.__audit.progressStats(plan,'navi2',duplicatePool,progress,dateKey()),assignment=s.__audit.build(plan,{navi2:duplicatePool,navi3:[]},progress,dateKey());
    assert.equal(stats.selected,1);assert.equal(stats.passed,1);assert.equal(stats.mastered,1);assert.equal(stats.freqTotal,1);assert.equal(stats.freqPassed,1);
    assert.equal(stats.phase.allRemaining.length,0);assert.equal(assignment.keys.length,0);
  });
  await test('duplicate due and weak records are counted once',()=>{
    const {s}=harness(),record={firstPassDate:dateKey(),mastered:false,status:'weak',dueDate:dateKey()},progress=Object.fromEntries(duplicatePool.map(q=>[q.key,copy(record)]));
    const stats=s.__audit.progressStats(plan,'navi2',duplicatePool,progress,dateKey());assert.equal(stats.due,1);assert.equal(stats.weak,1);assert.equal(stats.passed,1);
  });
  await test('cross-grade duplicate completion uses the same rule as selection',()=>{
    const {s}=harness(),pool=[{key:'navi3|q-1cnq33k',gradeId:'navi3',count:2}],progress={'navi2|q-174fei8':{firstPassDate:dateKey(),mastered:true}};
    const stats=s.__audit.progressStats(plan,'navi3',pool,progress,dateKey());assert.equal(stats.selected,1);assert.equal(stats.passed,1);assert.equal(stats.mastered,1);assert.equal(stats.phase.allRemaining.length,0);
  });
  await test('known 2026 figure placeholder is excluded from saved queues and grading',()=>{
    const {s,data}=harness(),q=sourceQuestion();assert.match(q['문제'],/\[그림 문제\]/);assert.equal(s.mdQuestionUsable(q),false);
    const before=JSON.stringify([...data]);s.pastQueue=[q];s.pastAnswers=[0];assert.equal(s.mdGuardPastQueue(),false);
    assert.equal(s.pastQueue.length,0);assert.equal(s.pastAnswers.length,0);assert.equal(s.currentMode,'past-unavailable');assert.equal(JSON.stringify([...data]),before);
  });
  await test('frequency selection and direct opening exclude the missing figure',async()=>{
    const {s}=harness(),q=sourceQuestion(),hit={year:2026,session:3,number:20},group={id:'missing-figure',question:q['문제'],subject:q['과목'],normalized:s.n3aNormalizeQuestion(q['문제']),hits:[hit]},data={groups:[group]};
    s.n3aData=()=>data;s.getPastExam=()=>({questions:[q]});assert.equal(s.n3aPracticeGroups(data,'group',group.id).length,0);assert.equal(s.n3aFindQuestion(group,hit),undefined);
    await s.openNavi3FrequencyQuestion(group.id,2026,3,20);assert.equal(s.pastQueue.length,0);assert.match(s.app.innerHTML,/문제를 열지 못했습니다/);
  });
  await test('real textual figure descriptions and figure metadata remain usable',()=>{
    const {s}=harness();assert.equal(s.mdQuestionUsable({'문제':'다음 그림의 선박은? [그림: 홍색·백색·홍색 등화]'}),true);
    assert.equal(s.mdQuestionUsable({'문제':'문항 [그림 문제]',_figureText:'홍색·백색·홍색 등화'}),true);
    assert.equal(s.mdQuestionUsable({'문제':'수선면의 반쪽 형상만 그린 그림은?'}),true);
    assert.equal(s.mdQuestionUsable({'문제':'문항 [ 그림문제 ]'}),false);
  });
  await test('different source questions sharing one exam number are excluded before saved-answer identity is used',()=>{
    const {s,data}=harness(),m=html.match(/<script[^>]+id=["']md-bundle-past-2023-navi2-1_js["'][^>]*>([\s\S]*?)<\/script>/);
    assert.ok(m);vm.runInContext(zlib.gunzipSync(Buffer.from(m[1].trim(),'base64')).toString('utf8'),s);
    const exam=s.MD_PAST['2023-navi2-1'],ambiguous=exam.questions.filter(q=>q['과목']==='법규'&&q['번호']===4);
    assert.equal(ambiguous.length,2);assert.notEqual(ambiguous[0]['문제'],ambiguous[1]['문제']);
    s.getPastExam=()=>exam;const before=JSON.stringify([...data]);
    for(const q of ambiguous){
      const full={...q,_short:'navi2',_year:2023,_session:1,'회차':1};
      assert.equal(s.mdQuestionUsable(full),false);assert.match(s.mdQuestionContentIssue(full),/문항 번호/);
      const item={key:'navi2|source-'+q['문제'],subject:'법규',question:q['문제'],normalized:s.n3aNormalizeQuestion(q['문제']),hits:[{year:2023,session:1,number:4}]};
      assert.equal(s.__audit.find('navi2',item),null);
    }
    s.pastQueue=ambiguous.map(q=>({...q,_short:'navi2',_year:2023,_session:1,'회차':1}));s.pastAnswers=[0,1];
    assert.equal(s.mdGuardPastQueue(),false);assert.equal(s.pastQueue.length,0);assert.equal(JSON.stringify([...data]),before);
  });
  await test('real 2/3-grade pools still provide full balanced papers with unique source IDs',async()=>{
    const {s}=harness();
    for(const m of html.matchAll(/<script[^>]+id=["']md-bundle-([^"']+)["'][^>]*>([\s\S]*?)<\/script>/g)){
      if(!/^past-(?:\d{4}-navi[23](?:e)?-\d+|analysis-navi[23])_js$/.test(m[1]))continue;
      vm.runInContext(zlib.gunzipSync(Buffer.from(m[2].trim(),'base64')).toString('utf8'),s);
    }
    for(const name of ['balanced-mock.js','reported-content-fixes.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),s);
    s.getPastExam=(grade,year,session)=>s.MD_PAST[`${year}-${grade}-${session}`];
    s.n3aData=grade=>s.MD_NAVI_FREQUENCY[grade];s.ensureNavi3FrequencyData=async grade=>s.n3aData(grade);
    s.pastDataSubjectsLoaded=new Set(['navi2','navi3']);s.ensurePastDataForSubject=async()=>{};
    const all=['항해','운용','법규','영어','상선전문'],plan={grades:{navi2:{subjects:all},navi3:{subjects:all}}};
    const pools=await s.__audit.buildPools(plan),engine=s.__mdBalancedMock;
    const sourceId=q=>`${q._year}|${q._short}|${q['회차']}|${q['과목']}|${q['번호']}`;
    for(const grade of ['navi2','navi3']){
      const sourceIds=pools[grade].map(item=>sourceId(s.__audit.find(grade,item)));
      assert.equal(new Set(sourceIds).size,sourceIds.length,`${grade}: unambiguous source references`);
      for(const subject of all){
        const items=pools[grade].filter(item=>item.subject===subject).map(item=>({...item,choices:s.__audit.find(grade,item)['선택지']}));
        assert.ok(items.length>=25,`${grade} ${subject} has ${items.length} candidates`);
        for(let run=0;run<12;run++){
          let seed=run+1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
          const draw=engine.select(items,{count:25,gradeId:grade,data:s.n3aData(grade),state:null,identity:s.__audit.identity,random});
          assert.equal(draw.items.length,25);const ids=draw.items.map(item=>sourceId(s.__audit.find(grade,item)));
          assert.equal(new Set(ids).size,25,`${grade} ${subject} paper ${run}`);
        }
      }
    }
  });
  console.log(`learning audit regressions: PASS (${passed} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
