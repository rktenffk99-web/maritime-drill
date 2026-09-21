'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sandbox={window:null,console,localStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){},document:{documentElement:{},addEventListener(){},getElementById(){return null}}};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const name of ['weak-topic-classifier.js','predictive-analytics.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const start=html.indexOf('  function ppWeakTopicId(item){'),end=html.indexOf('  function ppPredictivePersonalMultiplier(',start);
assert.ok(start>=0&&end>start);vm.runInContext(html.slice(start,end),sandbox);
const a=sandbox.__mdWeakTopicAnalytics;
const q=(text,subject='영어',correct=0)=>({_predictiveMock:true,subject,question:text,'정답':correct});
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
for(const [text,subject,expected] of [
 ['Select the necessary preposition to complete this sentence.','영어','문법·어휘·번역'],
 ['Choose the translation for anniversary.','영어','문법·어휘·번역'],
 ['SAR rescue operations on VHF.','영어','SAR·통신 영어'],
 ['ＳＡＲ operation','영어','SAR·통신 영어'],
 ['FIO loading and discharging costs','영어','용선·하역 영어'],
 ['SMCP: steady as she goes','영어','SMCP·표준해사영어'],
 ['MARPOL pollution control','영어','안전·환경 영어'],
 ['Select a suitable answer.','영어','해사영어 일반'],
 ['A ship log and Doppler sensor','항해','항해계기'],
 ['Logistics and the catalog','항해','항해 일반'],
 ['Radar echoes','항해','레이더'],
 ['Celestial navigation','항해','천문항해'],
 ['선박직원법 승무기준','법규','선박직원법'],
 ['COLREG collision avoidance','법규','충돌예방규칙'],
 ['','운용','운용 일반'],
])test('shared classifier: '+text,()=>{const item=q(text,subject);assert.equal(a.topicOf(item),expected);assert.equal(sandbox.ppWeakTopicId(item),expected)});
test('irrelevant explanation/concept text cannot override question classification',()=>{
 const item={...q('Select the necessary preposition.'),'해설':'SAR distress',_predictiveConcept:'영어|sar'};assert.equal(a.topicOf(item),'문법·어휘·번역');
});
test('1 correct + 24 unanswered = score 4, answered accuracy 100',()=>{
 const row=a.stats(Array.from({length:25},()=>q('preposition')),[0,...Array(24).fill(null)]).subjects[0];assert.equal(row.total,25);assert.equal(row.attempts,1);assert.equal(row.correct,1);assert.equal(row.wrong,0);assert.equal(row.unanswered,24);assert.equal(row.score,4);assert.equal(row.accuracy,100);
});
test('entirely unanswered paper produces score 0, no answered accuracy, and reinforcement',()=>{
 const s=a.stats(Array.from({length:25},()=>q('preposition')),[]),row=s.subjects[0];assert.equal(row.score,0);assert.equal(row.accuracy,null);assert.equal(row.unanswered,25);assert.equal(a.reinforcement(s.topics).length,1);assert.equal(a.reinforcement(s.topics)[0].targetShare,100);
});
test('correct option index zero is an answered response',()=>{const row=a.stats([q('preposition')],[0]).subjects[0];assert.equal(row.attempts,1);assert.equal(row.score,100)});
test('ordinary wrong answers are separate from unanswered',()=>{const row=a.stats([q('preposition'),q('preposition'),q('preposition')],[0,1,null]).subjects[0];assert.equal(row.wrong,1);assert.equal(row.unanswered,1);assert.equal(row.attempts,2);assert.equal(row.score,33);assert.equal(row.accuracy,50)});
test('subject denominators are independent',()=>{const rows=a.stats([q('preposition'),q('Radar','항해'),q('Radar','항해')],[0,0,null]).subjects;assert.equal(rows.find(r=>r.subject==='영어').score,100);assert.equal(rows.find(r=>r.subject==='항해').score,50)});
test('non-predictive questions are ignored',()=>{assert.equal(a.stats([{subject:'영어','정답':0}],[0]).subjects.length,0)});
test('empty paper is safe',()=>{assert.equal(a.stats([],[]).subjects.length,0);assert.equal(a.reinforcement([]).length,0)});
test('homework gives unanswered topics review weight without changing storage key',()=>{
 const item=q('preposition'),profile={'영어|문법·어휘·번역':{wrong:0,unanswered:25,targetShare:100,reviewRate:100,errorRate:0}};assert.ok(sandbox.ppWeakTopicBoost(item,profile)>1);assert.ok(html.includes("const WEAK_TOPIC_PROFILE_KEY='md_weak_topic_profile_v1'"));
});
test('legacy weak-topic profiles are still accepted',()=>{assert.ok(sandbox.ppWeakTopicBoost(q('preposition'),{'영어|문법·어휘·번역':{wrong:2,errorRate:50,targetShare:100}})>1)});
test('shared classifier loads before result analytics',()=>{const loader=fs.readFileSync(path.join(root,'keyboard-controls.js'),'utf8');assert.ok(loader.indexOf("mdLoadAuxScript('weak-topic-classifier.js')")<loader.indexOf("mdLoadAuxScript('predictive-analytics.js')"))});
console.log(`analytics regression tests: PASS (${count} cases)`);
