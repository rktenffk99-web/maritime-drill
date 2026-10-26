#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('reported-content-fixes.js','utf8');
const rawStem='유지선은원칙적으로 침로와 속력을 유지한다.';
const cleanStem='유지선은 원칙적으로 침로와 속력을 유지한다.';
function question(number=1){return {'번호':number,'과목':'운용','문제':rawStem,'선택지':['가','나','다','Williamson turn 5 -'],'정답':3};}
function trackedQuestion(){
  const q=question();let stem=q['문제'],writes=0;
  Object.defineProperty(q,'문제',{enumerable:true,configurable:true,get:()=>stem,set(value){stem=value;writes++;}});
  return {q,writes:()=>writes};
}
function harness(exam){
  const s={console,MD_PAST:{paper:exam},MD_NAVI_FREQUENCY:{},MD_DATA:{}};s.window=s;
  s.getPastExam=(id='paper')=>s.MD_PAST[id];
  s.ensurePastDataForSubject=async()=>Object.values(s.MD_PAST);
  s.ensureNavi3FrequencyData=async grade=>s.MD_NAVI_FREQUENCY[grade];
  vm.createContext(s);vm.runInContext(source,s);return s;
}
const checks=[];
async function test(name,run){await run();checks.push(name);console.log('PASS '+name);}
(async()=>{
  await test('125 repeated paper lookups do not rewrite already corrected source text',()=>{
    const t=trackedQuestion(),exam={questions:[t.q]},s=harness(exam);
    assert.equal(s.getPastExam(),exam);const before=t.writes();
    for(let i=0;i<125;i++)assert.equal(s.getPastExam(),exam);
    assert.equal(t.writes(),before,'answer rendering repeated the complete text repair');
    assert.equal(t.q['문제'],cleanStem);assert.equal(t.q['선택지'][3],'Williamson turn');
    assert.equal(t.q['정답'],3);
  });
  await test('in-place stem and choice edits invalidate a cached paper immediately',()=>{
    const q=question(),exam={questions:[q]},s=harness(exam);s.getPastExam();
    q['문제']=rawStem;q['선택지'][3]='도선사의 사용 4 -';
    s.getPastExam();assert.equal(q['문제'],cleanStem);assert.equal(q['선택지'][3],'도선사의 사용');
    assert.equal(q['정답'],3);
  });
  await test('replaced question arrays, appended rows and replacement papers are repaired',()=>{
    const exam={questions:[question()]},s=harness(exam);s.getPastExam();
    exam.questions=[question(2)];s.getPastExam();assert.equal(exam.questions[0]['문제'],cleanStem);
    exam.questions.push(question(3));s.getPastExam();assert.equal(exam.questions[1]['선택지'][3],'Williamson turn');
    s.MD_PAST.paper={questions:[question(4)]};assert.equal(s.getPastExam().questions[0]['문제'],cleanStem);
    s.MD_PAST.late={questions:[question(5)]};assert.equal(s.getPastExam('late').questions[0]['문제'],cleanStem);
  });
  await test('explicit patchObject always repairs and updates a cached paper snapshot',()=>{
    const t=trackedQuestion(),exam={questions:[t.q]},s=harness(exam);s.getPastExam();
    const initial=t.writes();s.__mdReportedContentFixes.patchObject(exam);
    assert.ok(t.writes()>initial,'explicit API must remain a full repair');
    t.q['문제']=rawStem;s.__mdReportedContentFixes.patchObject(exam);assert.equal(t.q['문제'],cleanStem);
    const repaired=t.writes();s.getPastExam();assert.equal(t.writes(),repaired);
  });
  await test('cyclic and non-JSON objects fall back to full repair without losing edits',()=>{
    const exam={questions:[question()]},s=harness(exam);s.getPastExam();
    exam.self=exam;exam.questions[0]['문제']=rawStem;
    assert.equal(s.getPastExam(),exam);assert.equal(exam.questions[0]['문제'],cleanStem);
    exam.questions[0]['선택지'][3]='추가 선택지 4 -';s.getPastExam();assert.equal(exam.questions[0]['선택지'][3],'추가 선택지');
    delete exam.self;exam.nonJson=1n;exam.questions[0]['문제']=rawStem;
    s.getPastExam();assert.equal(exam.questions[0]['문제'],cleanStem);assert.equal(exam.nonJson,1n);
    delete exam.nonJson;s.getPastExam();
  });
  await test('lazy paper and frequency loads still repair new or mutated source content',async()=>{
    const s=harness({questions:[question()]});
    s.MD_PAST.late={questions:[question(2)]};
    await s.ensurePastDataForSubject('navi3');assert.equal(s.MD_PAST.late.questions[0]['문제'],cleanStem);
    s.MD_PAST.late.questions.push(question(3));
    await s.ensurePastDataForSubject('navi3');assert.equal(s.MD_PAST.late.questions[1]['선택지'][3],'Williamson turn');
    s.MD_NAVI_FREQUENCY.navi3={groups:[{question:rawStem,choices:['가','나','다','도선사의 사용 4 -'],answer:3}]};
    const frequency=await s.ensureNavi3FrequencyData('navi3');assert.equal(frequency.groups[0].question,cleanStem);
    frequency.groups[0].question=rawStem;
    await s.ensureNavi3FrequencyData('navi3');assert.equal(frequency.groups[0].question,cleanStem);
    s.MD_DATA.navi3={newText:'위하여침로를 변경한다.'};
    s.__mdReportedContentFixes.patchKnownData();assert.equal(s.MD_DATA.navi3.newText,'위하여 침로를 변경한다.');
    s.MD_DATA.navi3.newText='위하여침로를 변경한다.';
    s.__mdReportedContentFixes.patchKnownData();assert.equal(s.MD_DATA.navi3.newText,'위하여 침로를 변경한다.');
  });
  console.log(`reported content cache: ${checks.length} checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
