'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),{randomUUID}=require('crypto');
const {harness:examHarness}=require('./test_exam_sessions_v530');
const fixture=examHarness();fixture.s.savePastProgress();
const examItems=fixture.s.__mdExamSessions.liveItems(),examKey=Object.keys(examItems)[0],examRaw=examItems[examKey];
const baseSource=fs.readFileSync(path.join(__dirname,'test_sync_races.js'),'utf8').split('\nlet count=0;')[0];
const box={require,__dirname,console,process,module:{exports:null}};
vm.runInNewContext(baseSource+'\nmodule.exports=harness;',box);
const base=box.module.exports,clone=value=>JSON.parse(JSON.stringify(value));
function harness(options={}){
 const h=base({...options,noRemote:options.noRemote!==false}),s=h.sandbox,journals=new Map(options.journals||[]);
 const originalFind=s.driveSyncFindRemoteFile,originalDownload=s.driveSyncDownloadPayload;
 let epoch=0,serial=0;
 Object.assign(s,{URLSearchParams,crypto:{randomUUID},__mdExamSessions:fixture.s.__mdExamSessions,__mdDriveAuthGeneration:()=>epoch,
  driveSyncFindRemoteFile:originalFind,
  driveSyncDownloadPayload:async id=>{
   if(journals.has(id)){
    if(options.failJournalDownload)throw new Error('journal download failed');
    if(options.changeAccountDuringDiscovery)epoch++;
    return clone(journals.get(id));
   }
   if(options.aggregateError){
    const status=options.aggregateError;if(status===404)h.remote=null;
    const error=new Error('aggregate download failed '+status);error.status=status;throw error;
   }
   return originalDownload(id);
  },
  driveSyncFetch:async(url,request={})=>{
   if(request.method==='POST'){
    const parts=request.body.split('\r\n\r\n'),body=JSON.parse(parts[2].split('\r\n--')[0]);
    const id='posted-'+(++serial);journals.set(id,body);return {json:async()=>({id})};
   }
   if(options.failJournalList)throw new Error('journal listing failed');
   const params=new URL(url).searchParams,start=Number(params.get('pageToken')||0),ids=[...journals.keys()];
   return {json:async()=>({files:ids.slice(start,start+1).map(id=>({id})),nextPageToken:start+1<ids.length?String(start+1):undefined})};
  }
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','drive-exam-journal.js'),'utf8'),s);
 return Object.assign(h,{s,journals,changeAccount(){epoch++}});
}
const paperJournal=['paper',{app:'Maritime Drill',items:examItems}];
const deletionJournal=['deleted',{app:'Maritime Drill',items:{},itemMeta:{[examKey]:{updatedAt:'2026-10-27T00:00:00Z',deleted:true,fields:{}}}}];
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name)}
(async()=>{
 await test('first sync restores journal-only exams before reporting successful aggregate creation',async()=>{
  const h=harness({journals:[paperJournal]});await h.sync();
  assert.equal(h.s.driveSyncLastError,'');assert.equal(h.calls.create,1);assert.equal(h.calls.reload,1);
  assert.equal(h.storage.getItem(examKey),examRaw);assert.equal(h.remote.items[examKey],examRaw);
  assert.ok(h.load().lastSyncedAt);assert.ok(h.messages.some(m=>m.includes('남아 있던 시험 기록')));
 });
 await test('tombstone-only journals remove a stale local paper in the first sync and persist the deletion',async()=>{
  const h=harness({journals:[deletionJournal]});h.storage.setItem(examKey,examRaw);await h.sync();
  assert.equal(h.s.driveSyncLastError,'');assert.equal(h.storage.getItem(examKey),null);
  assert.equal(h.remote.items[examKey],undefined);assert.equal(h.remote.itemMeta[examKey].deleted,true);
  assert.equal(h.load().itemMeta[examKey].deleted,true);
 });
 await test('an aggregate 404 after listing rediscovers and restores journals in the same sync',async()=>{
  const h=harness({noRemote:false,aggregateError:404,journals:[paperJournal]});await h.sync();
  assert.equal(h.s.driveSyncLastError,'');assert.equal(h.calls.find,2);assert.equal(h.calls.create,1);
  assert.equal(h.storage.getItem(examKey),examRaw);assert.equal(h.remote.items[examKey],examRaw);
 });
 await test('an aggregate 404 recovery honors tombstones as well as surviving papers',async()=>{
  const h=harness({noRemote:false,aggregateError:404,journals:[paperJournal,deletionJournal]});
  h.storage.setItem(examKey,examRaw);await h.sync();
  assert.equal(h.s.driveSyncLastError,'');assert.equal(h.storage.getItem(examKey),null);
  assert.equal(h.remote.items[examKey],undefined);assert.equal(h.remote.itemMeta[examKey].deleted,true);
 });
 await test('401, 403, server errors and malformed failures never recreate or apply an aggregate',async()=>{
  for(const status of [401,403,500,'malformed']){
   const h=harness({noRemote:false,aggregateError:status,journals:[paperJournal]}),before=h.collect();await h.sync();
   assert.equal(h.calls.create,0);assert.equal(h.calls.apply,0);assert.deepEqual(h.collect(),before);assert.match(h.s.driveSyncLastError,/download failed/);
  }
 });
 await test('journal listing/download failures cannot report an empty first backup as successful',async()=>{
  for(const options of [{failJournalList:true},{failJournalDownload:true}]){
   const h=harness({...options,journals:[paperJournal]}),before=h.collect();await h.sync();
   assert.equal(h.calls.create,0);assert.equal(h.calls.apply,0);assert.deepEqual(h.collect(),before);assert.match(h.s.driveSyncLastError,/journal/);
  }
 });
 await test('a failed replacement creation keeps local records and retries journal recovery',async()=>{
  let fail=true;const h=harness({journals:[paperJournal],onCreate(){if(fail)throw new Error('create failed')}}),before=h.collect();await h.sync();
  assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.equal(h.remote,null);
  fail=false;await h.sync();assert.equal(h.s.driveSyncLastError,'');assert.equal(h.storage.getItem(examKey),examRaw);
 });
 await test('account changes invalidate discovered snapshots and stop first-sync writes',async()=>{
  const h=harness({journals:[paperJournal],changeAccountDuringDiscovery:true}),before=h.collect();await h.sync();
  assert.equal(h.calls.create,0);assert.deepEqual(h.collect(),before);assert.match(h.s.driveSyncLastError,/연결이 변경/);
  const ready=harness({journals:[paperJournal]});await ready.s.driveSyncFindRemoteFile();ready.changeAccount();
  assert.throws(()=>ready.s.__mdDriveExamJournal.snapshot(),/연결이 변경/);
 });
 await test('account changes during replacement creation never apply a prior account snapshot',async()=>{
  let h;h=harness({journals:[paperJournal],onCreate(){h.changeAccount()}});const before=h.collect();await h.sync();
  assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
 });
 await test('journal recovery preserves active study and applies incoming papers once the user leaves it',async()=>{
  const h=harness({mode:'past',journals:[paperJournal]});await h.sync();
  assert.equal(h.storage.getItem(examKey),null);assert.equal(h.calls.reload,0);assert.equal(h.remote.items[examKey],examRaw);
  h.s.currentMode='home';await h.sync();assert.equal(h.storage.getItem(examKey),examRaw);assert.equal(h.calls.reload,1);
 });
 console.log(`Drive journal recovery v5.32: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
