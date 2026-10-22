'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{},Date,Math,Set,Map,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','scheduler-v522.js'),'utf8'),context);
const {build,days}=context.window.__mdSchedulerV522;
const subjects=['항해','운용','법규','영어','상선전문'];
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function row(i,overrides={}){
  return {key:'navi2|test-'+i,clusterId:'navi2|test-'+i,gradeId:'navi2',subject:subjects[i%subjects.length],seen:false,due:false,weak:false,mastered:false,count:1,latest:2026,needsSameDayConfirmation:true,...overrides};
}
function rows(n,offset=0,overrides={}){return Array.from({length:n},(_,i)=>row(i+offset,overrides))}
function config(overrides={}){
  return {today:'2026-10-22',cap:70,finalDays:4,priorityMode:'auto',grades:[{id:'navi2',enabled:true,examDate:'2026-11-14'},{id:'navi3',enabled:false,examDate:'2026-11-14'}],rows:[],...overrides};
}
function clone(value){return JSON.parse(JSON.stringify(value))}
function assertMetrics(input,result){
  const active=new Set(input.grades.filter(g=>g.enabled&&days(input.today,g.examDate)>0).map(g=>g.id));
  const eligible=[],seen=new Set();
  for(const r of input.rows){if(!active.has(r.gradeId)||r.cleared||(!r.due&&r.seen))continue;const id=r.clusterId||r.key;if(seen.has(id))continue;seen.add(id);eligible.push(r)}
  const byKey=new Map(eligible.map(r=>[r.key,r])),selected=result.keys.map(k=>byKey.get(k));
  assert.ok(selected.every(Boolean),'every selection resolves to an eligible input');
  assert.equal(new Set(selected.map(r=>r.clusterId||r.key)).size,selected.length,'no duplicate cluster in assignment');
  assert.ok(selected.length<=Math.max(40,Math.min(250,input.cap)),'base cap is respected');
  const due=selected.filter(r=>r.due),fresh=selected.filter(r=>!r.due),selectedIds=new Set(selected.map(r=>r.clusterId||r.key));
  const deferred=eligible.filter(r=>r.due&&!selectedIds.has(r.clusterId||r.key));
  assert.equal(result.dueCount,due.length);assert.equal(result.newCount,fresh.length);
  assert.equal(result.newCount+result.dueCount,result.keys.length);
  assert.equal(result.dueOverflow,deferred.length);
  assert.equal(result.deferredStrongReviewCount,deferred.filter(r=>r.mastered&&!r.weak).length);
  assert.equal(result.scheduledFirstPassCount,selected.filter(r=>!r.seen).length);
  assert.equal(result.estimatedAutomaticRechecks,selected.filter((r,i)=>r.needsSameDayConfirmation&&selected.length-i-1>=15).length);
  assert.equal(result.estimatedTotalAnswers,selected.length+result.estimatedAutomaticRechecks);
  for(const g of input.grades){const assigned=selected.filter(r=>r.gradeId===g.id),counts=result.gradeCounts[g.id];assert.ok(counts);assert.equal(counts.new,assigned.filter(r=>!r.due).length);assert.equal(counts.review,assigned.filter(r=>r.due).length)}
}

test('current-scale assignment mixes urgent review from the first question and reports unmet work',()=>{
  const input=config({rows:[...rows(1326),...rows(106,2000,{due:true,seen:true,weak:true,overdueDays:2,count:5,needsSameDayConfirmation:false})]});
  const before=JSON.stringify(input),result=build(input);assertMetrics(input,result);
  const byKey=new Map(input.rows.map(r=>[r.key,r]));
  assert.equal(result.keys.length,70);assert.ok(byKey.get(result.keys[0]).due);
  assert.ok(result.keys.slice(0,10).some(k=>!byKey.get(k).due),'new questions remain interleaved');
  assert.ok(result.dueCount>=21,'conservative review reservation is honored');
  assert.equal(result.coverageByGrade.navi2.studyDays,23,'exam day does not add a 24th study day');
  assert.equal(result.coverageByGrade.navi2.newStudyDays,19);
  assert.equal(result.coverageByGrade.navi2.requiredFirstPassToday,70);
  assert.ok(result.coverageAtRisk);assert.ok(result.newShortfall>0);
  assert.equal(JSON.stringify(input),before,'scheduler must not mutate caller progress rows');
});

test('final review period chooses due work before low-frequency fresh questions',()=>{
  const input=config({today:'2026-11-10',rows:[...rows(1000),...rows(100,2000,{due:true,seen:true,weak:true,overdueDays:1})]}),result=build(input);
  assertMetrics(input,result);assert.equal(result.newCount,0);assert.equal(result.dueCount,70);assert.equal(result.dueOverflow,30);
  assert.ok(result.coverageByGrade.navi2.finalReview);assert.equal(result.coverageByGrade.navi2.newStudyDays,0);assert.ok(result.coverageAtRisk);
});

test('exam date and dates after the exam do not receive daily homework',()=>{
  for(const today of ['2026-11-14','2026-11-15']){const input=config({today,rows:rows(200)}),result=build(input);assertMetrics(input,result);assert.equal(result.keys.length,0);assert.equal(result.estimatedTotalAnswers,0)}
});

test('manual 80:20 grade ratio is exact when both active pools have capacity',()=>{
  const input=config({priorityMode:'custom',weights:{navi2:80,navi3:20},grades:[{id:'navi2',enabled:true,examDate:'2026-11-14'},{id:'navi3',enabled:true,examDate:'2026-11-14'}],rows:[...rows(200),...rows(200).map((r,i)=>({...r,key:'navi3|test-'+i,clusterId:'navi3|test-'+i,gradeId:'navi3'}))]}),result=build(input);
  assertMetrics(input,result);assert.equal(result.quotaTarget.navi2,56);assert.equal(result.quotaTarget.navi3,14);assert.equal(result.gradeCounts.navi2.new,56);assert.equal(result.gradeCounts.navi3.new,14);
});

test('an inactive or exhausted grade releases its budget to the active pool',()=>{
  const inactive=config({priorityMode:'custom',weights:{navi2:0,navi3:100},rows:rows(200)}),a=build(inactive);assertMetrics(inactive,a);assert.equal(a.gradeCounts.navi2.new,70);
  const exhausted=config({priorityMode:'custom',weights:{navi2:80,navi3:20},grades:[{id:'navi2',enabled:true,examDate:'2026-11-14'},{id:'navi3',enabled:true,examDate:'2026-11-14'}],rows:[...rows(3),...rows(200).map((r,i)=>({...r,key:'navi3|test-'+i,clusterId:'navi3|test-'+i,gradeId:'navi3'}))]}),b=build(exhausted);assertMetrics(exhausted,b);assert.equal(b.keys.length,70);assert.equal(b.gradeCounts.navi2.new,3);assert.equal(b.gradeCounts.navi3.new,67);
});

test('subject coverage remains balanced while exhausted subjects release their slots',()=>{
  const input=config({rows:rows(200)}),balanced=build(input);assertMetrics(input,balanced);assert.deepEqual(Object.values(balanced.subjectCounts).sort((a,b)=>a-b),[14,14,14,14,14]);
  const scarce=config({rows:[...rows(100).map(r=>({...r,subject:'항해'})),...subjects.slice(1).map((subject,i)=>row(1000+i,{subject}))]}),filled=build(scarce);assertMetrics(scarce,filled);assert.equal(filled.keys.length,70);assert.equal(filled.subjectCounts['항해'],66);for(const subject of subjects.slice(1))assert.equal(filled.subjectCounts[subject],1);
});

test('cleared questions, future reviews and duplicate clusters do not reappear',()=>{
  const input=config({rows:[...rows(100),row(200,{clusterId:'navi2|test-0'}),row(201,{cleared:true}),row(202,{seen:true,due:false})]}),result=build(input);assertMetrics(input,result);assert.ok(!result.keys.includes('navi2|test-200'));assert.ok(!result.keys.includes('navi2|test-201'));assert.ok(!result.keys.includes('navi2|test-202'));
});

test('a never-passed wrong answer is a review but still counts toward first-pass coverage',()=>{
  const input=config({rows:rows(70,0,{due:true,seen:false,weak:true,overdueDays:2})}),result=build(input);assertMetrics(input,result);assert.equal(result.newCount,0);assert.equal(result.dueCount,70);assert.equal(result.scheduledFirstPassCount,70);
});

test('seven-day escalation defeats frequency dominance for old low-frequency misses',()=>{
  const old=rows(5,2000,{seen:true,due:true,weak:true,count:1,overdueDays:51}),freshMisses=rows(70,0,{seen:true,due:true,weak:true,count:10,overdueDays:0});
  const input=config({rows:[...freshMisses,...old]}),result=build(input);assertMetrics(input,result);for(const r of old)assert.ok(result.keys.includes(r.key));assert.equal(result.overduePromotedCount,5);
});

test('aged reviews rotate inside the budget without erasing fresh coverage',()=>{
  for(const count of [100,1326]){
    const input=config({rows:[...rows(count),...rows(106,2000,{due:true,seen:true,weak:true,overdueDays:30,count:5,needsSameDayConfirmation:false})]}),result=build(input);
    assertMetrics(input,result);assert.ok(result.newCount>=21,'normal periods protect at least 30% fresh questions');assert.ok(result.dueCount<=49,'aging does not bypass the normal review budget');
    if(count===1326){assert.equal(result.newCount,49);assert.equal(result.dueCount,21)}
  }
});

test('all-wrong repeated practice rotates deferred misses instead of starving them',()=>{
  const all=[...rows(70,0,{seen:true,due:true,weak:true,count:10,overdueDays:0}),...rows(5,2000,{seen:true,due:true,weak:true,count:1,overdueDays:51})],encounters=new Map();
  for(let day=0;day<4;day++){
    const date=new Date('2026-10-22T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);const input=config({today:date.toISOString().slice(0,10),rows:all}),result=build(input);assertMetrics(input,result);const chosen=new Set(result.keys);
    for(const r of all){if(chosen.has(r.key)){encounters.set(r.key,(encounters.get(r.key)||0)+1);r.overdueDays=0}else r.overdueDays++}
  }
  assert.equal(encounters.size,75,'every miss is encountered despite the count difference');
});

test('multi-day all-correct model includes spaced recalls and exposes remaining capacity limits',()=>{
  // Outcome model only: a first pass schedules a review two days later; a recall
  // schedules five days later. These are test inputs, not a learning efficacy claim.
  const all=rows(200),dueOn=new Map(),recalls=new Set(),firstPasses=new Set();let presentations=0;
  for(let day=0;day<20;day++){
    const date=new Date('2026-10-22T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);const today=date.toISOString().slice(0,10);
    for(const r of all){const dueDate=dueOn.get(r.key);r.due=!!dueDate&&dueDate<=today;r.overdueDays=r.due?Math.max(0,days(dueDate,today)):0}
    const input=config({today,cap:40,rows:all}),result=build(input);assertMetrics(input,result);presentations+=result.keys.length;
    for(const key of result.keys){const r=all.find(x=>x.key===key),alreadySeen=r.seen;if(alreadySeen)recalls.add(key);else firstPasses.add(key);r.seen=true;r.mastered=alreadySeen;r.needsSameDayConfirmation=false;const next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+(alreadySeen?5:2));dueOn.set(key,next.toISOString().slice(0,10));r.due=false;r.overdueDays=0}
  }
  assert.equal(firstPasses.size,200,'feasible pool completes its first pass');assert.ok(recalls.size>100,'more than half the pool receives a later-day recall');assert.ok(presentations>firstPasses.size);
});

test('current-scale all-correct model warns instead of claiming an infeasible deadline is guaranteed',()=>{
  const fresh=rows(1326),prior=rows(138,2000,{seen:true,due:true,weak:true,count:5,needsSameDayConfirmation:false}),all=[...fresh,...prior];
  const dueOn=new Map(prior.map(r=>[r.key,'2026-10-20'])),firstPasses=new Set(),recalls=new Set();let warned=false;
  for(let day=0;day<23;day++){
    const date=new Date('2026-10-22T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);const today=date.toISOString().slice(0,10);
    for(const r of all){const dueDate=dueOn.get(r.key);r.due=!!dueDate&&dueDate<=today;r.overdueDays=r.due?Math.max(0,days(dueDate,today)):0}
    const input=config({today,rows:all}),result=build(input);assertMetrics(input,result);warned=warned||result.coverageAtRisk;
    for(const key of result.keys){const r=all.find(x=>x.key===key),alreadySeen=r.seen;if(alreadySeen)recalls.add(key);else firstPasses.add(key);r.seen=true;r.mastered=alreadySeen;r.weak=false;r.needsSameDayConfirmation=false;const next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+(alreadySeen?5:2));dueOn.set(key,next.toISOString().slice(0,10));r.due=false;r.overdueDays=0}
  }
  assert.ok(warned,'capacity mismatch is explicitly surfaced');assert.ok(firstPasses.size>0);assert.ok(firstPasses.size<1326,'preserving review capacity cannot guarantee every remaining first pass');assert.ok(recalls.size>100,'later recall is not starved by the deadline target');
});

console.log(`scheduler v5.22 behavior checks: PASS (${passed} cases)`);
