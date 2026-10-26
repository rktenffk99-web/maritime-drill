'use strict';
const assert=require('node:assert/strict');
const {harness}=require('./test_exam_sessions_v530.js');
const plain=value=>JSON.parse(JSON.stringify(value));
const seed=harness();seed.s.savePastProgress();
const id=seed.s.pastProgressId,key=seed.s.__mdExamSessions.PREFIX+id;
const original=JSON.parse(seed.data.get(key));
const head=record=>Object.values(record.heads)[0];
let count=0;
async function test(name,run){await run();count++;console.log('PASS '+name);}
function quietHarness(data){const h=harness(data);h.s.console={...console,warn(){}};return h;}
(async()=>{
 await test('generated v3 records keep 50 answers, exact paper and cursor through validation and resume',async()=>{
  const h=harness();
  for(let i=0;i<50;i++)h.s.pastAnswers[i]=i%4;
  h.s.pastIdx=50;assert.equal(h.s.savePastProgress(),true);
  const paperId=h.s.pastProgressId,saved=plain(h.s.getPastProgress(paperId));
  const before=new Map(h.data),fresh=harness(new Map(h.data));fresh.s.currentMode='home';
  const paperKey=h.s.__mdExamSessions.PREFIX+paperId;
  assert.equal(fresh.s.__mdExamSessions.valid(JSON.parse(h.data.get(paperKey))),true);
  await fresh.s.resumePastProgress(paperId);
  assert.equal(fresh.s.currentMode,'past');assert.equal(fresh.s.pastIdx,50);
  assert.deepEqual(plain(fresh.s.pastAnswers),saved.state.answers);
  assert.deepEqual(plain(fresh.s.pastQueue.map(fresh.s.pqid)),saved.meta.refs.map(ref=>ref.id));
  assert.deepEqual(fresh.data,before,'unchanged resume does not rewrite the valid saved record');
 });
 await test('missing, malformed and out-of-range timestamps cannot pass active record validation',()=>{
  for(const field of ['createdAt','startedAt','savedAt'])for(const value of [undefined,null,'broken','1793050000000',1e100,-1e100,NaN,Infinity]){
   const record=plain(original),target=field==='createdAt'?record.meta:head(record).state;
   if(value===undefined)delete target[field];else target[field]=value;
   assert.equal(seed.s.__mdExamSessions.valid(record),false,field+': '+String(value));
  }
 });
 await test('invalid object containers and throwing inputs return false without throwing',()=>{
  const cases=[null,[],true,'record',{},Object.defineProperty({},'schema',{get(){throw Error('broken getter')}})];
  for(const mutate of [
   r=>r.meta=[],r=>r.meta=null,r=>r.heads=[],r=>r.heads=null,
   r=>r.heads={version:null},r=>head(r).clock=null,r=>head(r).clock=[1],
   r=>head(r).state=null,r=>head(r).state=[],r=>r.meta.refs=[null],
  ]){const record=plain(original);mutate(record);cases.push(record);}
  for(const record of cases)assert.equal(seed.s.__mdExamSessions.valid(record),false);
 });
 await test('one corrupt exam cannot break the home resume list or erase its original bytes',()=>{
  const damaged=plain(original);damaged.meta.id='damaged-exam';head(damaged).state.id='damaged-exam';delete damaged.meta.createdAt;
  const badKey=seed.s.__mdExamSessions.PREFIX+'damaged-exam',raw=JSON.stringify(damaged);
  const h=quietHarness();h.data.set(key,JSON.stringify(original));h.data.set(badKey,raw);
  const before=new Map(h.data),cards=h.s.renderPastResumeCard();
  assert.ok(cards.includes('data-past-resume="'+id+'"'));
  assert.ok(!cards.includes('data-past-resume="damaged-exam"'));
  assert.equal(h.s.__mdExamSessions.list().length,1);
  assert.deepEqual(h.data,before);assert.equal(h.data.get(badKey),raw);
 });
 await test('explicit restore and merge reject malformed timestamps before modifying any records',()=>{
  for(const field of ['createdAt','startedAt','savedAt']){
   const damaged=plain(original),target=field==='createdAt'?damaged.meta:head(damaged).state;
   target[field]=1e100;
   const items={[key]:JSON.stringify(damaged)},before=plain(items);
   assert.throws(()=>seed.s.__mdExamSessions.restoreItems(items),/식별 정보/);
   assert.deepEqual(items,before);
   assert.throws(()=>seed.s.__mdExamSessions.merge(original,damaged),/식별 정보/);
   assert.throws(()=>seed.s.__mdExamSessions.merge(damaged,original),/식별 정보/);
  }
 });
 await test('compact completed records remain valid without creation or start timestamps',()=>{
  const completed=plain(original);head(completed).status='completed';
  const compact=seed.s.__mdExamSessions.compact(completed);
  assert.deepEqual(plain(compact.meta),{id});assert.equal(head(compact).state.startedAt,undefined);
  assert.equal(seed.s.__mdExamSessions.valid(compact),true);
  const restored=seed.s.__mdExamSessions.restoreItems({[key]:JSON.stringify(compact)});
  assert.deepEqual(plain(JSON.parse(restored[key])),plain(compact));
  head(compact).state.savedAt=1e100;assert.equal(seed.s.__mdExamSessions.valid(compact),false);
 });
 await test('valid numeric dates and device clock skew are not rejected by chronological assumptions',()=>{
  const record=plain(original);record.meta.createdAt=0;
  head(record).state.savedAt=1;head(record).state.startedAt=2;
  assert.equal(seed.s.__mdExamSessions.valid(record),true);
  assert.ok(Number.isFinite(new Date(record.meta.createdAt).getTime()));
 });
 console.log('exam validation v5.33: PASS ('+count+' cases)');
})().catch(error=>{console.error(error);process.exitCode=1;});
