const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const patch=fs.readFileSync(path.join(__dirname,'..','drive-sync-v2.js'),'utf8');
const sandbox={console,window:null,navigator:{onLine:true},Storage:function(){},localStorage:{},setTimeout:()=>{},location:{reload:()=>{}},Date,JSON,Math,Object,Array,Set,Map,encodeURIComponent};
sandbox.window=sandbox;
Object.assign(sandbox,{
  driveSyncOnce:function(){},driveSyncLoadState:function(){return{}},isManagedStorageKey:k=>k.startsWith('md_'),
  driveSyncInstallStorageHooks:function(){},driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,
  driveSyncApplyingRemote:false,driveSyncNowIso:()=>new Date().toISOString(),driveSyncSaveState:()=>{},driveSyncRefreshPanel:()=>{},
  DRIVE_SYNC_STATE_KEY:'md_drive_sync_state_v1',driveSyncBusy:false,driveSyncLastError:'',driveSyncHasToken:()=>true,
  backupNotice:()=>{},driveSyncRequestToken:async()=>{},driveSyncFindRemoteFile:async()=>null,collectBackupItems:()=>({}),
  driveSyncCreateRemote:async()=>'',driveSyncDownloadPayload:async()=>({}),driveSyncUploadRemote:async()=>({}),
  createAutomaticRestorePoint:()=>{},applyBackupSnapshot:()=>{},driveSyncClearSessionToken:()=>{},
  BACKUP_SCHEMA_VERSION:1,APP_VERSION:'test'
});
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','daily-storage.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','learning-integrity.js'),'utf8'),sandbox);vm.runInContext(patch,sandbox);
const merge=sandbox.__mdDriveSyncV2.mergeSnapshots;
function raw(o){return JSON.stringify(o)}

// 1) Legacy v5.08: progress made on different questions on two devices must both survive.
{
 const local={md_state_navi3:raw({boxes:{q1:{correct:2,wrong:0,lastStudied:'2026-09-16T01:00:00Z'},q2:{correct:0,wrong:0,lastStudied:'2026-09-14T01:00:00Z'}}})};
 const remote={md_state_navi3:raw({boxes:{q1:{correct:1,wrong:0,lastStudied:'2026-09-15T01:00:00Z'},q2:{correct:3,wrong:1,lastStudied:'2026-09-16T02:00:00Z'}}})};
 const m=merge(local,remote,{},{} ,'2026-09-16T01:00:00Z','2026-09-16T02:00:00Z');
 const v=JSON.parse(m.items.md_state_navi3);
 assert.equal(v.boxes.q1.correct,2); assert.equal(v.boxes.q2.correct,3); assert.equal(v.boxes.q2.wrong,1);
}
// 2) Pass-plan records: later per-question date wins state; monotonic counters preserve the max.
{
 const local={md_nav23_pass_progress_v1:raw({a:{lastDate:'2026-09-16',status:'weak',attempts:5,correct:3,wrong:2},b:{lastDate:'2026-09-14',status:'new',attempts:0,correct:0,wrong:0}})};
 const remote={md_nav23_pass_progress_v1:raw({a:{lastDate:'2026-09-15',status:'provisional',attempts:4,correct:3,wrong:1},b:{lastDate:'2026-09-16',status:'mastered',attempts:3,correct:3,wrong:0}})};
 const m=merge(local,remote,{},{} ,'2026-09-16T03:00:00Z','2026-09-16T04:00:00Z');
 const v=JSON.parse(m.items.md_nav23_pass_progress_v1);
 assert.equal(v.a.status,'weak'); assert.equal(v.a.attempts,5); assert.equal(v.b.status,'mastered'); assert.equal(v.b.attempts,3);
}
// 3) v2 metadata: exact field timestamps override a newer whole-snapshot timestamp.
{
 const local={md_x:raw({q:{score:7,note:'local'}})}, remote={md_x:raw({q:{score:3,note:'remote'}})};
 const lm={md_x:{updatedAt:'2026-09-16T01:00:00Z',fields:{'q/score':{updatedAt:'2026-09-16T05:00:00Z',deleted:false}}}};
 const rm={md_x:{updatedAt:'2026-09-16T04:00:00Z',fields:{}}};
 const m=merge(local,remote,lm,rm,'2026-09-16T01:00:00Z','2026-09-16T04:00:00Z');
 const v=JSON.parse(m.items.md_x); assert.equal(v.q.score,7); assert.equal(v.q.note,'remote');
}
// 4) A newer deletion tombstone must remove an older remote value.
{
 const local={},remote={md_x:raw({a:1})};
 const lm={md_x:{updatedAt:'2026-09-16T05:00:00Z',deleted:true,fields:{}}};
 const rm={md_x:{updatedAt:'2026-09-16T04:00:00Z',deleted:false,fields:{}}};
 const m=merge(local,remote,lm,rm,'2026-09-16T05:00:00Z','2026-09-16T04:00:00Z');
 assert.equal(Object.prototype.hasOwnProperty.call(m.items,'md_x'),false);
}
// 5) Disjoint object entries must union instead of whole-file overwrite.
{
 const m=merge({md_x:raw({a:{v:1}})},{md_x:raw({b:{v:2}})},{},{},'2026-09-16T01:00:00Z','2026-09-16T02:00:00Z');
 assert.deepEqual(JSON.parse(m.items.md_x),{a:{v:1},b:{v:2}});
}
// 6) Concurrent work on the same question is added once per device.
{
 const key='md_nav23_pass_progress_v1';
 const base={attempts:10,correct:5,wrong:5,unsure:0,masteryReviews:0};
 const rec=(id,outcome)=>({_counterVersion:1,_counterBase:base,_counterComponents:{[id]:{correct:outcome==='correct'?1:0,wrong:outcome==='wrong'?1:0,unsure:0,masteryReviews:0}}});
 const local={[key]:raw({a:rec('device-a','correct')})},remote={[key]:raw({a:rec('device-b','wrong')})};
 const m=merge(local,remote,{},{} ,'2026-09-16T03:00:00Z','2026-09-16T04:00:00Z');
 const v=JSON.parse(m.items[key]).a;
 assert.equal(v.attempts,12);assert.equal(v.correct,6);assert.equal(v.wrong,6);
 const again=merge(m.items,remote,{},{} ,'2026-09-16T05:00:00Z','2026-09-16T04:00:00Z');
 assert.equal(JSON.parse(again.items[key]).a.attempts,12);
}
// 7) A checkpoint's answers and queue must come from the same session.
{
 const key='md_pass_plan_session_checkpoint_v2';
 const a={queueKeys:['a','b'],answers:[1,null],nextIndex:1},b={queueKeys:['x'],answers:[2],nextIndex:0};
 const m=merge({[key]:raw(a)},{[key]:raw(b)},{},{},'2026-09-16T03:00:00Z','2026-09-16T04:00:00Z');
 assert.deepEqual(JSON.parse(m.items[key]),b);
}
// 8) An older device cannot reintroduce duplicated question pools on sync.
{
 const key='md_nav23_pass_daily_v1',old={'2026-09-21':{keys:['navi3|a'],signature:'same',phases:{navi3:{candidates:[{question:'large '.repeat(10000)}]}}}};
 const remote={[key]:raw(old),md_nav23_pass_progress_v1:raw({a:{attempts:5,correct:3,wrong:2}})};
 const m=merge({},remote,{},{},'2026-09-16T03:00:00Z','2026-09-16T04:00:00Z');
 assert.deepEqual(JSON.parse(m.items[key]),{'2026-09-21':{keys:['navi3|a'],signature:'same'}});assert.equal(m.items.md_nav23_pass_progress_v1,remote.md_nav23_pass_progress_v1);
}
// 9) Unioning separate cache histories must still obey the 30-day bound.
{
 const key='md_nav23_pass_daily_v1',a={},b={};for(let i=1;i<=31;i++)(i<16?a:b)['2025-01-'+String(i).padStart(2,'0')]={keys:['q'+i]};
 const m=merge({[key]:raw(a)},{[key]:raw(b)},{},{},'2026-09-16T03:00:00Z','2026-09-16T04:00:00Z');assert.equal(Object.keys(JSON.parse(m.items[key])).length,30);
}
console.log('drive-sync-v2 tests: PASS (9 cases)');
