'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {harness}=require('./test_exam_sessions_v530');
const clone=x=>JSON.parse(JSON.stringify(x));
function installSync(s){Object.assign(s,{driveSyncOnce(){},driveSyncLoadState(){return {}},isManagedStorageKey:k=>k.startsWith('md_')});vm.runInContext(fs.readFileSync('drive-sync-v2.js','utf8'),s);return s.__mdDriveSyncV2.mergeSnapshots;}
(async()=>{
 const {s,data}=harness();let now=1000,writes=0;const capture=s.capturePastProgressState,set=s.safeStorageSet;
 s.capturePastProgressState=()=>({...capture(),savedAt:++now});s.safeStorageSet=(...args)=>{writes++;return set(...args)};
 s.savePastProgress();const id=s.pastProgressId,key=s.__mdExamSessions.PREFIX+id,first=data.get(key);
 for(let i=0;i<30;i++)assert.equal(s.savePastProgress(),true);
 assert.equal(data.get(key),first);assert.equal(writes,1);assert.equal(s.__mdExamSessions.liveItems()[key],first);
 s.pastAnswers[0]=2;s.savePastProgress();assert.notEqual(data.get(key),first);
 const answered=data.get(key);s.pastIdx=1;s.savePastProgress();assert.notEqual(data.get(key),answered);
 const moved=data.get(key);s.pastQueue[1]._mockHintViewed=true;s.savePastProgress();assert.notEqual(data.get(key),moved);
 const hinted=data.get(key);s.savePastProgress();assert.equal(data.get(key),hinted);
 console.log('PASS unchanged redraw/backup creates no version or storage write; answers, position and hints still persist');
 const reloaded=harness(new Map(data));reloaded.s.currentMode='home';await reloaded.s.resumePastProgress(id);
 assert.equal(reloaded.data.get(key),hinted);
 console.log('PASS reopening unchanged exam does not generate another journal version');
 const full=JSON.parse(hinted);s.clearPastProgress();const minimal=JSON.parse(data.get(key));
 assert.deepEqual(Object.keys(minimal.meta),['id']);
 assert.equal(Object.values(minimal.heads)[0].status,'completed');
 assert.deepEqual(Object.keys(Object.values(minimal.heads)[0].state).sort(),['id','savedAt']);
 assert.ok(data.get(key).length<hinted.length/20);
 assert.deepEqual(clone(s.__mdExamSessions.merge(full,minimal)),minimal);
 assert.deepEqual(clone(s.__mdExamSessions.merge(minimal,full)),minimal);
 console.log('PASS completion drops question text/answers, reduces record by over 95%, and stale active versions remain completed');
 const legacy=clone(full);Object.values(legacy.heads)[0].status='completed';
 const upgraded=harness(new Map([[key,JSON.stringify(legacy)]]));const compacted=JSON.parse(upgraded.data.get(key));
 assert.equal(compacted.meta.refs,undefined);assert.equal(Object.values(compacted.heads)[0].state.answers,undefined);
 assert.deepEqual(clone(upgraded.s.__mdExamSessions.merge(legacy,compacted)),compacted);
 console.log('PASS existing v5.30 completed records compact on startup and merge with their legacy originals');
 // A concurrently edited branch is still recoverable after another branch finishes.
 const concurrent=clone(full),head=Object.values(concurrent.heads)[0];concurrent.heads={offline:{...head,clock:{offline:1}}};
 const conflict=s.__mdExamSessions.merge(minimal,concurrent);
 assert.equal(conflict.meta.refs.length,125);assert.equal(Object.values(conflict.heads).filter(h=>h.status==='active').length,1);
 assert.equal(Object.values(conflict.heads).find(h=>h.status==='completed').state.answers,undefined);
 console.log('PASS compact completion preserves full paper for independent concurrent active answers');
 const merge=installSync(s),deleted={updatedAt:'2026-10-27T00:00:00Z',deleted:true,fields:{}},old={updatedAt:'2026-10-26T00:00:00Z',deleted:false,fields:{}};
 for(const [left,right,lm,rm] of [[{}, {[key]:hinted},{[key]:deleted},{[key]:old}],[{[key]:hinted},{},{[key]:old},{[key]:deleted}],[{[key]:hinted},{[key]:hinted},{[key]:deleted},{[key]:{...old,updatedAt:'2099-01-01T00:00:00Z'}}]]){
   const result=merge(left,right,lm,rm,'2000-01-01','2099-01-01');assert.equal(result.items[key],undefined);assert.equal(result.itemMeta[key].deleted,true);
 }
 console.log('PASS explicit deletion wins in both directions, including stale journals and clock-skewed offline writes');
 const newer={...old,generation:{id:'reset',updatedAt:'2026-10-27T00:00:00Z'}};
 assert.equal(merge({}, {[key]:hinted},{[key]:newer},{},'','').items[key],undefined);
 console.log('PASS explicit reset generation is applied before exam-specific merge');
 reloaded.s.driveSyncLoadState=()=>({itemMeta:{[key]:deleted}});reloaded.s.pastAnswers[2]=1;
 assert.equal(reloaded.s.savePastProgress(),false);assert.equal(reloaded.data.get(key),hinted);assert.equal(reloaded.s.getPastProgress(id),null);
 console.log('PASS an open exam cannot silently rewrite its deleted UUID');
 const tab=harness();tab.s.savePastProgress();const tabKey=tab.s.__mdExamSessions.PREFIX+tab.s.pastProgressId,initial=JSON.parse(tab.data.get(tabKey));
 const incoming=clone(initial),latest=clone(initial),template=Object.values(initial.heads)[0];
 incoming.heads={incoming:{...template,clock:{incoming:1}}};latest.heads={latest:{...template,clock:{latest:1}}};
 tab.data.set(tabKey,JSON.stringify(latest));tab.events.storage({storageArea:tab.s.localStorage,key:tabKey,newValue:JSON.stringify(incoming)});
 assert.equal(Object.keys(JSON.parse(tab.data.get(tabKey)).heads).length,3);
 tab.data.delete(tabKey);tab.events.storage({storageArea:tab.s.localStorage,key:tabKey,newValue:JSON.stringify(incoming)});
 assert.equal(tab.data.has(tabKey),false);
 console.log('PASS queued tab events preserve latest disk head and cannot rewrite an already removed exam');
})().catch(e=>{console.error(e);process.exitCode=1});
