'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','balanced-mock.js'),'utf8'),scope);
const engine=scope.__mdBalancedMock,copy=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function rng(seed=17){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const data={rules:Array.from({length:8},(_,i)=>({id:'type'+i,subject:'항해',pattern:'topic'+i+'\\b'}))};
function pool(n=240){return Array.from({length:n},(_,i)=>({key:'navi2|q'+i,subject:'항해',question:'topic'+(i%8)+' question '+i,hits:Array(i%5+1).fill({year:2025})}))}
function draw(items,state,extra={}){return engine.select(items,{count:25,gradeId:'navi2',data,state,identity:x=>x.key,random:rng(81),...extra})}
test('twenty fresh papers rotate all questions and exclude each of the last three papers',()=>{
  const items=pool(),original=JSON.stringify(items),seen=new Set();let state=engine.normalize(null);
  for(let i=0;i<20;i++){
    const prior=new Set(state.grades.navi2.recent.flat()),out=draw(items,state,{random:rng(i+1)});
    assert.equal(out.items.length,25);assert.equal(new Set(out.identities).size,25);
    assert.ok(out.identities.every(id=>!prior.has(id)));
    assert.ok(Object.values(out.topicCounts).every(n=>n<=5));
    out.identities.forEach(id=>seen.add(id));state=engine.record(state,'navi2',out.identities);
  }
  assert.equal(seen.size,240);assert.ok(Math.max(...Object.values(state.grades.navi2.seen).map(x=>x[0]))<=3);
  assert.equal(JSON.stringify(items),original);
});
test('known near-duplicates and identical stems cannot occupy two places',()=>{
  const items=pool(160);items.push({...items[0],key:'navi2|alias'});
  const out=draw(items,null,{count:160,identity:x=>['navi2|q1','navi2|q2'].includes(x.key)?'cluster':x.key});
  assert.equal(out.items.length,159);assert.equal(new Set(out.items.map(x=>x.question)).size,159);
  assert.equal(out.identities.filter(id=>id==='cluster').length,1);
});
test('short pools relax the oldest exclusion first and keep the immediately previous paper out',()=>{
  const items=pool(50),ids=items.map(x=>x.key);
  let state=engine.record(null,'navi2',ids.slice(0,25));state=engine.record(state,'navi2',ids.slice(25));
  const out=draw(items,state);assert.equal(out.recentWindow,1);assert.equal(out.items.length,25);
  assert.ok(out.identities.every(id=>ids.slice(0,25).includes(id)));
});
test('insufficient total pool and one-topic pools still terminate without duplicates',()=>{
  const items=pool(11).map(x=>({...x,question:x.question.replace(/topic\d/,'unclassified')}));
  const out=draw(items,null);assert.equal(out.items.length,11);assert.equal(new Set(out.identities).size,11);
  assert.equal(Object.keys(out.topicCounts).length,1);
});
test('small topic buckets are not granted the same draw weight as an entire large topic',()=>{
  const items=pool(200).map((x,i)=>({...x,question:(i?'topic1':'topic0')+' question '+i}));
  const out=draw(items,null);assert.equal(out.items.length,25);assert.ok((out.topicCounts['항해|type0']||0)<=1);
});
test('unclassified questions share one category, and commercial law is classified',()=>{
  assert.equal(engine.topic({subject:'항해',question:'분류 없는 첫 문제'},data),engine.topic({subject:'항해',question:'분류 없는 다른 문제'},data));
  assert.equal(engine.topic({subject:'법규',question:'상법상 공동해손의 분담은?'},data),'법규|상법·해상운송');
});
test('English separates maritime domains and can infer a generic stem from its options',()=>{
  const examples=['SMCP wheel order','VHF distress frequency','MARPOL garbage','Charter laytime','SOLAS lifeboat','Radar bearings','Engine valve','Select a preposition'];
  const topics=examples.map(question=>engine.topic({subject:'영어',question},data));
  assert.equal(new Set(topics).size,8);
  assert.equal(engine.topic({subject:'영어',question:'Choose the correct statement.',choices:['Radar display','Compass bearing','Anchor chain','hello']},data),'영어|항해·선박운항');
});
test('paper creation history is grade-scoped, serializable and independent of scoring',()=>{
  let state=engine.record(null,'navi2',['a','b','a']);const saved=JSON.stringify(state);
  state=engine.record(JSON.parse(saved),'navi3',['c']);
  assert.deepEqual(copy(state.grades.navi2.seen),{a:[1,1],b:[1,1]});assert.equal(state.grades.navi3.sequence,1);
  assert.deepEqual(copy(engine.normalize(state)),JSON.parse(JSON.stringify(state)));
});
test('malformed state is repaired without allowing unbounded history or invalid counters',()=>{
  const state=engine.normalize({grades:{navi2:{sequence:'bad',seen:{bad:[-1,9],valid:[2,4]},recent:[[1,'valid'],null]}}});
  assert.equal(state.grades.navi2.sequence,4);assert.deepEqual(copy(state.grades.navi2.seen),{valid:[2,4]});
  assert.deepEqual(copy(state.grades.navi2.recent),[['valid']]);
  let bounded=engine.normalize(null);for(let i=0;i<10;i++)bounded=engine.record(bounded,'navi2',['q'+i]);assert.equal(bounded.grades.navi2.recent.length,3);
});
console.log('balanced mock regressions: PASS ('+passed+' cases)');
