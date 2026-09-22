'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(process.env.MD_SYNC_TEST_SOURCE||path.join(__dirname,'..','drive-sync-v2.js'),'utf8');
const copy=v=>JSON.parse(JSON.stringify(v));
const KEY='md_progress',STATE='md_drive_sync_state_v1';
const T0='2026-09-21T00:00:00.000Z';
function harness(options={}){
  class Storage{
    constructor(){this.data=new Map()}
    get length(){return this.data.size}
    key(i){return [...this.data.keys()][i]||null}
    getItem(k){return this.data.has(k)?this.data.get(k):null}
    setItem(k,v){this.data.set(String(k),String(v))}
    removeItem(k){this.data.delete(String(k))}
  }
  const storage=new Storage(),calls={find:0,download:0,upload:0,create:0,apply:0,backup:0,reload:0};
  let now=Date.parse(T0),remote=options.noRemote?null:{app:'Maritime Drill',revision:1,updatedAt:T0,items:{[KEY]:JSON.stringify({q1:{correct:1}})},itemMeta:{}};
  storage.setItem(KEY,JSON.stringify({q1:{correct:1}}));
  storage.setItem(STATE,JSON.stringify({enabled:true,deviceId:'test',revision:1,localUpdatedAt:T0,lastSyncedAt:T0,itemMeta:{}}));
  const load=()=>JSON.parse(storage.getItem(STATE));
  const save=v=>{storage.setItem(STATE,JSON.stringify(v));return true};
  const collect=()=>Object.fromEntries([...storage.data].filter(([k])=>k!==STATE&&k.startsWith('md_')));
  const messages=[];
  const h={calls,storage,load,save,collect,messages,options,uploaded:[],
    get remote(){return remote},set remote(v){remote=v},
    progress(){return JSON.parse(storage.getItem(KEY))},
    write(key,value){now+=1000;storage.setItem(key,JSON.stringify(value))},
    addQuestion(id){const v=h.progress();v[id]={correct:1};h.write(KEY,v)},
  };
  const sandbox={window:null,Storage,localStorage:storage,navigator:{onLine:options.online!==false},console:{warn(){}},
    currentMode:options.mode||'home',setTimeout:()=>{},location:{reload(){calls.reload++}},
    Date,JSON,Math,Object,Array,Set,Map,encodeURIComponent,
    driveSyncOnce(){},driveSyncInstallStorageHooks(){},isManagedStorageKey:k=>k!==STATE&&k.startsWith('md_'),
    driveSyncLoadState:load,driveSyncSaveState:save,collectBackupItems:collect,
    driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,
    driveSyncBusy:false,driveSyncLastError:'',DRIVE_SYNC_STATE_KEY:STATE,
    driveSyncNowIso:()=>new Date(++now).toISOString(),driveSyncRefreshPanel(){},
    driveSyncHasToken:()=>true,driveSyncRequestToken:async()=>{},driveSyncClearSessionToken(){},
    backupNotice:m=>messages.push(m),alert:m=>messages.push(m),BACKUP_SCHEMA_VERSION:1,APP_VERSION:'test',
    async driveSyncFindRemoteFile(){calls.find++;return remote?{id:'remote-file',modifiedTime:remote.updatedAt}:null},
    async driveSyncDownloadPayload(){calls.download++;const result=copy(remote);await Promise.resolve();if(options.onDownload)await options.onDownload(h);return result},
    async driveSyncUploadRemote(id,payload){calls.upload++;await Promise.resolve();if(options.onUpload)await options.onUpload(h);if(options.uploadFails)throw new Error('network failed');remote=copy(payload);h.uploaded.push(copy(payload));return {modifiedTime:payload.updatedAt}},
    async driveSyncCreateRemote(payload){calls.create++;await Promise.resolve();if(options.onCreate)await options.onCreate(h);remote=copy(payload);h.uploaded.push(copy(payload));return 'created-file'},
    createAutomaticRestorePoint(){calls.backup++;h.restorePoint=copy(collect());return options.backupFails!==true},
    applyBackupSnapshot(entries){calls.apply++;for(const k of Object.keys(collect()))storage.removeItem(k);for(const [k,v] of entries){if(options.applyFails&&calls.apply===1)continue;storage.setItem(k,v)}return {restored:entries.length,removed:0}},
  };
  sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','daily-storage.js'),'utf8'),sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','learning-integrity.js'),'utf8'),sandbox);vm.runInContext(source,sandbox);sandbox.driveSyncInstallStorageHooks();
  h.sandbox=sandbox;h.sync=()=>sandbox.driveSyncOnce({showNotice:true});
  return h;
}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name)}
(async()=>{
  await test('disconnect and reconnect during upload cannot apply the old connection result',async()=>{
    let version=0;
    const h=harness({onUpload(){version++}});
    h.sandbox.__mdDriveAuthGeneration=()=>version;h.remote.items.md_remote_only='"remote"';
    await h.sync();assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
  });
  await test('download-time answers are present in uploaded and local snapshots',async()=>{
    const h=harness({onDownload(h){h.addQuestion('duringDownload')}});h.remote.items.md_remote_only='"other device"';
    await h.sync();assert.ok(JSON.parse(h.remote.items[KEY]).duringDownload);assert.ok(h.progress().duringDownload);assert.equal(h.storage.getItem('md_remote_only'),'"other device"');assert.equal(h.sandbox.driveSyncBusy,false);
  });
  await test('upload-time answers/checkpoints and their metadata survive; next sync converges',async()=>{
    const h=harness({onUpload(h){h.addQuestion('duringUpload');h.write('md_checkpoint',{index:2})}});h.remote.items.md_remote_only='"remote"';
    await h.sync();assert.ok(h.progress().duringUpload);assert.equal(h.storage.getItem('md_checkpoint'),'{"index":2}');assert.ok(h.load().itemMeta[KEY].fields['duringUpload/correct']);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
    h.options.onUpload=null;await h.sync();assert.ok(JSON.parse(h.remote.items[KEY]).duringUpload);assert.equal(h.storage.getItem('md_remote_only'),'"remote"');
  });
  await test('first remote creation retains newer local values and modification metadata',async()=>{
    const h=harness({noRemote:true,onCreate(h){h.addQuestion('duringCreate')}});await h.sync();assert.ok(h.progress().duringCreate);assert.ok(h.load().itemMeta[KEY].fields['duringCreate/correct']);assert.equal(h.load().remoteFileId,'created-file');assert.equal(h.calls.reload,0);
    h.options.onCreate=null;await h.sync();assert.ok(JSON.parse(h.remote.items[KEY]).duringCreate);
  });
  await test('active study defers incoming application and reload until an idle sync',async()=>{
    const h=harness({mode:'pass-plan-session'});h.remote.items.md_remote_only='"remote"';await h.sync();assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);assert.equal(h.storage.getItem('md_remote_only'),null);
    h.sandbox.currentMode='home';await h.sync();assert.equal(h.storage.getItem('md_remote_only'),'"remote"');assert.equal(h.calls.reload,1);
  });
  await test('upload failures leave the original local data untouched',async()=>{
    const h=harness({uploadFails:true});h.remote.items.md_remote_only='"remote"';const before=h.collect();await h.sync();assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.match(h.sandbox.driveSyncLastError,/network failed/);assert.equal(h.sandbox.driveSyncBusy,false);
  });
  await test('metadata-only merges do not reload',async()=>{
    const h=harness();h.remote.itemMeta[KEY]={updatedAt:'2026-09-21T00:00:01.000Z',fields:{}};await h.sync();assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);assert.ok(h.load().itemMeta[KEY]);
  });
  await test('restore-point failure blocks local snapshot replacement',async()=>{
    const h=harness({backupFails:true});h.remote.items.md_remote_only='"remote"';const before=h.collect();await h.sync();assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.match(h.sandbox.driveSyncLastError,/복구 지점/);assert.equal(h.calls.reload,0);
  });
  await test('partial storage write is detected and rolls back to the pre-merge snapshot',async()=>{
    const h=harness({applyFails:true});h.remote.items.md_remote_only='"remote"';const before=h.collect();await h.sync();assert.deepEqual(h.collect(),before);assert.equal(h.calls.reload,0);assert.match(h.sandbox.driveSyncLastError,/병합 저장에 실패/);
  });
  await test('offline sync never calls the network or changes progress',async()=>{
    const h=harness({online:false});const before=h.collect();await h.sync();assert.equal(h.calls.find,0);assert.deepEqual(h.collect(),before);
  });
  await test('an overlapping sync cannot start a second network operation',async()=>{
    const h=harness({onDownload:async h=>{await h.sync()}});await h.sync();assert.equal(h.calls.find,1);assert.equal(h.calls.download,1);
  });
  await test('disconnect during upload is not overwritten by a stale enabled flag',async()=>{
    const h=harness({onUpload(h){const s=h.load();s.enabled=false;h.save(s)}});h.remote.items.md_remote_only='"remote"';await h.sync();assert.equal(h.load().enabled,false);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
  });
  await test('disconnect during download cancels application and upload',async()=>{
    const h=harness({onDownload(h){const s=h.load();s.enabled=false;h.save(s)}});h.remote.items.md_remote_only='"remote"';await h.sync();assert.equal(h.load().enabled,false);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);
  });
  await test('metadata changes without a data change are not overwritten after upload',async()=>{
    const h=harness({onUpload(h){const s=h.load();s.itemMeta.md_new={updatedAt:'2026-09-21T00:01:00Z',deleted:true,fields:{}};s.revision+=10;h.save(s)}});h.remote.items.md_remote_only='"remote"';await h.sync();assert.ok(h.load().itemMeta.md_new.deleted);assert.ok(h.load().revision>=11);assert.equal(h.calls.apply,0);
  });
  console.log(`sync race regression tests: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
