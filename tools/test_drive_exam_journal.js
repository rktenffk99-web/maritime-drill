'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {harness}=require('./test_exam_sessions_v530');
const clone=x=>JSON.parse(JSON.stringify(x));
const files=new Map();let next=0,fail=false,posts=0;
function client(){
 const {s}=harness();Object.assign(s,{URLSearchParams,BACKUP_SCHEMA_VERSION:1,APP_VERSION:'5.30',
  driveSyncFindRemoteFile:async()=>({id:'aggregate'}),
  driveSyncDownloadPayload:async id=>clone(files.get(id)),
  driveSyncCreateRemote:async p=>{files.set('aggregate',clone(p));return 'aggregate'},
  driveSyncUploadRemote:async(id,p)=>{files.set(id,clone(p));return {}},
  driveSyncFetch:async(url,options={})=>{
   if(options.method==='POST'){
    posts++;if(fail)throw new Error('offline');
    const parts=options.body.split('\r\n\r\n');
    const meta=JSON.parse(parts[1].split('\r\n--')[0]);
    const body=JSON.parse(parts[2].split('\r\n--')[0]);
    assert.equal(meta.appProperties.kind,'maritime-drill-exam-v3');
    const id='journal-'+(++next);files.set(id,body);return {json:async()=>({id})};
   }
   const params=new URL(url).searchParams;assert.ok(params.get('q').includes('appProperties'));
   const all=[...files.keys()].filter(id=>id!=='aggregate'),start=Number(params.get('pageToken')||0);
   return {json:async()=>({files:all.slice(start,start+1).map(id=>({id})),nextPageToken:start+1<all.length?String(start+1):undefined})};
  }});
 vm.runInContext(fs.readFileSync('drive-exam-journal.js','utf8'),s);return s;
}
(async()=>{
 const a=client(),b=client();a.savePastProgress();b.savePastProgress();
 const first={app:'Maritime Drill',items:a.__mdExamSessions.liveItems()},second={app:'Maritime Drill',items:b.__mdExamSessions.liveItems()};
 // Both readers see the same stale aggregate, then last PATCH wins.
 files.set('aggregate',{app:'Maritime Drill',items:{}});
 await Promise.all([a.driveSyncFindRemoteFile(),b.driveSyncFindRemoteFile()]);
 await Promise.all([a.driveSyncUploadRemote('aggregate',first),b.driveSyncUploadRemote('aggregate',second)]);
 assert.equal(Object.keys(files.get('aggregate').items).length,1);
 await a.driveSyncFindRemoteFile();const recovered=await a.driveSyncDownloadPayload('aggregate');
 assert.equal(Object.keys(recovered.items).length,2);
 console.log('PASS simultaneous stale aggregate uploads recover both independent papers from immutable journals');
 const count=posts;await a.driveSyncUploadRemote('aggregate',recovered);assert.equal(posts,count);
 console.log('PASS journal pagination and idempotent publication (no duplicate upload for existing versions)');
 a.pastAnswers[0]=2;a.savePastProgress();const pending={app:'Maritime Drill',items:a.__mdExamSessions.liveItems()},prior=clone(files.get('aggregate'));
 fail=true;await assert.rejects(a.driveSyncUploadRemote('aggregate',pending),/offline/);assert.deepEqual(files.get('aggregate'),prior);
 fail=false;await a.driveSyncUploadRemote('aggregate',pending);
 console.log('PASS journal failure blocks aggregate write; retry succeeds without deleting local answers');
})().catch(e=>{console.error(e);process.exitCode=1});
