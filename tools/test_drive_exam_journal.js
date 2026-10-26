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
 // Redraws and exports must not create extra immutable files.
 const repeat=posts;for(let i=0;i<10;i++){a.savePastProgress();await a.driveSyncUploadRemote('aggregate',{items:a.__mdExamSessions.liveItems()});}
 assert.equal(posts,repeat);
 console.log('PASS repeated unchanged saves and backups create zero extra Drive files');
 const key=Object.keys(pending.items)[0],deleted={items:{},itemMeta:{[key]:{updatedAt:'2026-10-27T00:00:00Z',deleted:true,fields:{}}}};
 fail=true;const beforeDelete=clone(files.get('aggregate'));await assert.rejects(a.driveSyncUploadRemote('aggregate',deleted),/offline/);assert.deepEqual(files.get('aggregate'),beforeDelete);
 fail=false;await a.driveSyncUploadRemote('aggregate',deleted);
 // An offline device overwrites the aggregate with its old active exam and no
 // deletion metadata. A brand-new runtime must recover the journal tombstone.
 await b.driveSyncUploadRemote('aggregate',pending);
 const fresh=client();await fresh.driveSyncFindRemoteFile();const after=await fresh.driveSyncDownloadPayload('aggregate');
 assert.equal(after.items[key],undefined);assert.equal(after.itemMeta[key].deleted,true);
 const deletedPosts=posts;await fresh.driveSyncUploadRemote('aggregate',after);assert.equal(posts,deletedPosts);
 console.log('PASS durable deletion survives stale aggregate overwrite, fresh runtime, pagination and retry without duplicate markers');
 b.clearPastProgress();const complete={items:{}};
 for(let i=0;i<b.localStorage.length;i++){const k=b.localStorage.key(i);if(k.startsWith(b.__mdExamSessions.PREFIX))complete.items[k]=b.localStorage.getItem(k);}
 await b.driveSyncUploadRemote('aggregate',complete);
 const completion=files.get('journal-'+next);const record=JSON.parse(Object.values(completion.items)[0]);
 assert.equal(record.meta.refs,undefined);assert.equal(Object.values(record.heads)[0].state.answers,undefined);
 await fresh.driveSyncFindRemoteFile();const final=await fresh.driveSyncDownloadPayload('aggregate');
 const completedKey=Object.keys(complete.items)[0];assert.equal(JSON.parse(final.items[completedKey]).meta.refs,undefined);
 assert.equal(final.items[key],undefined);
 console.log('PASS compact completion journals merge with old full-paper files without restoring answers or deleted exams');
})().catch(e=>{console.error(e);process.exitCode=1});
