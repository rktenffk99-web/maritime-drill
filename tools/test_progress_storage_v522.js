'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'daily-storage.js'),'utf8');
const KEY='md_nav23_pass_progress_v1',CP='md_pass_plan_session_checkpoint_v2',RESTORE='md_restore_point_v1';
const clone=v=>JSON.parse(JSON.stringify(v)),bytes=v=>JSON.stringify(v).length*2;
const sandbox={window:null,console,Date,localStorage:{getItem(){return null}}};sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
const api=sandbox.__mdPassProgressStorage,today='2026-10-22';let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function record(extra={}){return {attempts:110,correct:100,wrong:10,unsure:0,masteryReviews:7,mastered:false,status:'weak',firstPassDate:'2026-03-01',dueDate:today,lastDate:today,lastWrongDate:today,sameDayFirstCorrectDate:null,sameDayConfirmedDate:null,recoveryStartDate:null,todayWrongReviewDate:null,reviewScheduleVersion:1,reviewStage:0,reviewSuccessDate:null,reviewLapseDate:today,nextDayRecheckScheduledDate:null,lateSessionNextDayRecheck:false,_counterVersion:1,_counterBase:{attempts:0,correct:0,wrong:0,unsure:0,masteryReviews:0},_counterComponents:{device:{attempts:110,correct:100,wrong:10,unsure:0,masteryReviews:7}},...extra}}
test('sparse persistence restores lifetime counters, false mastery, lapse state and explicit legacy guards',()=>{
 const original=record(),out=api.compact({q:original},{today,checkpoint:null}),restored=api.hydrate(out).q;
 for(const [key,value]of Object.entries(original))if(key!=='_counterBase')assert.deepEqual(clone(restored[key]),clone(value),key);
 assert.deepEqual(clone(out.q._counterBase),{});assert.ok(Object.hasOwn(out.q,'sameDayFirstCorrectDate'));assert.ok(Object.hasOwn(out.q,'sameDayConfirmedDate'));
 assert.equal(out.q.mastered,undefined);assert.equal(restored.mastered,false);assert.equal(restored.reviewStage,0);assert.equal(restored.reviewLapseDate,today);
 assert.deepEqual(clone(api.compact(out,{today,checkpoint:null})),clone(out));
});
test('unknown records, own prototype-named keys and malformed data survive exactly',()=>{
 const original=JSON.parse('{"__proto__":{"attempts":17,"custom":"keep"},"custom":{"untouched":true},"q":null}');
 for(const out of [api.compact(original,{today,checkpoint:null}),api.hydrate(original)])assert.deepEqual(clone(out),original);
 for(const raw of ['{bad','[]','null','"text"'])assert.equal(api.compactValue(raw),raw);
});
test('derived evidence retains exact newest events within per-question and global bounds',()=>{
 const progress={};for(let i=0;i<180;i++)progress['q'+i]=record({recentOutcomes:Array.from({length:6},(_,j)=>({evidenceId:i+'|'+j,at:new Date(Date.UTC(2026,9,22,i,j)).toISOString(),date:today,outcome:j%2?'wrong':'sure',mode:'homework'}))});
 const out=api.compact(progress,{today,checkpoint:null}),events=Object.values(out).flatMap(r=>r.recentOutcomes||[]);
 assert.equal(events.length,400);assert.ok(Object.values(out).every(r=>(r.recentOutcomes||[]).length<=3));
 assert.ok(events.some(e=>e.evidenceId==='179|5'));assert.ok(!events.some(e=>e.evidenceId==='0|0'));
 assert.ok(events.every(e=>e.at&&e.mode==='homework'&&e.evidenceId));
});
test('replay ledger expires old sessions while pinning every active checkpoint occurrence',()=>{
 const old='device|'+Date.parse('2026-10-20T12:00:00Z')+'|',now='device|'+Date.parse(today+'T12:00:00Z')+'|';
 const ids=[old+'0',...Array.from({length:80},(_,i)=>now+i)],cp={date:today,commitIds:[old+'0',now+'0']};
 const out=api.compact({q:record({lastDate:'2026-10-20',homeworkCommitIds:ids,lastHomeworkCommitId:old+'0'})},{today,checkpoint:cp}).q;
 assert.ok(out.homeworkCommitIds.includes(old+'0'));assert.ok(out.homeworkCommitIds.includes(now+'0'));assert.equal(out.homeworkCommitIds.length,66);
 const expired=api.compact({q:out},{today:'2026-10-23',checkpoint:null}).q;assert.equal(expired.homeworkCommitIds,undefined);assert.equal(expired.lastHomeworkCommitId,undefined);
 const crossing=api.compact({q:record({homeworkCommitIds:[old+'0'],lastHomeworkCommitId:old+'0'})},{today,checkpoint:null}).q;assert.ok(crossing.homeworkCommitIds.includes(old+'0'));
});
test('restore-point compaction retains every item and hydrates the same durable learning values',()=>{
 const r=record(),items={[KEY]:JSON.stringify({q:r}),[CP]:JSON.stringify({date:today,queueKeys:['q'],answers:[1],commitIds:['old']}),other:'exact'},point={app:'Maritime Drill',reason:'before-sync',items};
 const out=JSON.parse(sandbox.__mdDailyStorage.compactValue(RESTORE,JSON.stringify(point))),restored=api.hydrateItems(out.items);
 assert.equal(out.app,point.app);assert.equal(out.reason,point.reason);assert.equal(restored[CP],items[CP]);assert.equal(restored.other,'exact');
 const restoredRecord=JSON.parse(restored[KEY]).q;for(const [key,value]of Object.entries(r))if(key!=='_counterBase')assert.deepEqual(clone(restoredRecord[key]),clone(value),key);
});

// Reuse the actual ppCommitOutcome fixture without executing its independent suite.
const fixtureSource=fs.readFileSync(path.join(__dirname,'test_mastery_sessions_v522.js'),'utf8').split('(async()=>{')[0]+'\nglobalThis.fixture={harness,q,date,rec};';
const fixtureContext={require,__dirname,process,console};vm.createContext(fixtureContext);vm.runInContext(fixtureSource,fixtureContext);
const fixture=fixtureContext.fixture,UUID='12345678-1234-1234-1234-123456789abc';
function actualRecord(attempts){
 fixture.date(today);const {s,data}=fixture.harness(),q=fixture.q('navi2|q-1234567');s.crypto.randomUUID=()=>UUID;s.testSequence=Date.parse(today+'T12:00:00Z');s.__test.setup([q]);
 for(let i=0;i<attempts;i++){const d=new Date(today+'T12:00:00Z');d.setDate(d.getDate()+Math.max(0,i-1)*3);fixture.date(d.toISOString().slice(0,10));s.__test.commit(q,i>1&&i%5===0?1:0)}
 return {record:JSON.parse(data.get(KEY))[q._planKey],s};
}
function budget(record,count){
 const progress=Object.fromEntries(Array.from({length:count},(_,i)=>['navi2|q-'+String(i).padStart(7,'0'),record]));
 const compact=api.compact(progress,{today:'2030-01-01',checkpoint:null}),raw=JSON.stringify(compact),items={[KEY]:raw};
 return {count,progressBytes:raw.length*2,restoreBytes:bytes({app:'Maritime Drill',exportedAt:'2030-01-01T12:00:00Z',reason:'before-sync',items}),combinedBytes:raw.length*2+bytes({app:'Maritime Drill',exportedAt:'2030-01-01T12:00:00Z',reason:'before-sync',items})+Math.ceil(1.09*1048576),events:Object.values(compact).reduce((n,r)=>n+(r.recentOutcomes||[]).length,0)};
}
const measurements=[];
test('actual answer commits keep new evidence and replay metadata bounded after 10 and 100 attempts',()=>{
 for(const attempts of [1,2,6,10,100]){const {record}=actualRecord(attempts);for(const count of [1628,3346])measurements.push({attempts,...budget(record,count)})}
 for(const row of measurements)assert.equal(row.events,400);
 const one=measurements.find(r=>r.count===1628&&r.attempts===100);assert.ok(one.progressBytes+one.restoreBytes<5*1048576,'one-grade progress and intact restore point stay below 5 MiB before other app data');
 for(const count of [1628,3346]){const ten=measurements.find(r=>r.count===count&&r.attempts===10),hundred=measurements.find(r=>r.count===count&&r.attempts===100);assert.ok(hundred.progressBytes-ten.progressBytes<100*1024,'attempt growth must not retain expired replay IDs/evidence')}
});
console.log('STORAGE_BUDGET '+JSON.stringify(measurements));
console.log(`progress storage v5.22 regressions: PASS (${passed} cases)`);
