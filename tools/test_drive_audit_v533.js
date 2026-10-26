'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(process.env.MD_DRIVE_TEST_INDEX||path.join(root,'index.html'),'utf8');
const baseSource=fs.readFileSync(path.join(__dirname,'test_drive_recovery_v522.js'),'utf8').split('let count=0;')[0];
const box={require,__dirname,console,process,URLSearchParams,URL,Buffer,module:{exports:null}};
vm.runInNewContext(baseSource+'\nmodule.exports=harness;',box);
const base=box.module.exports,clone=value=>JSON.parse(JSON.stringify(value));
function harness(options={}){
  const h=base(options),s=h.s;let epoch=0;
  const start=html.indexOf('function validateImportedBackupEntries('),end=html.indexOf('function mergeImportedBackupEntries(',start);
  vm.runInContext(html.slice(start,end),s);
  s.__mdDriveAuthGeneration=()=>epoch;
  h.changeAccount=()=>epoch++;
  const original=s.driveSyncFetch;
  s.driveSyncFetch=async(url,request={})=>{
    if(!request.method&&!url.includes('alt=media')&&options.pageSize){
      h.calls.list++;
      const params=new URL(url).searchParams,offset=Number(params.get('pageToken')||0),files=[...h.files.values(),...h.snapshotFiles.values()].map(({body,...file})=>file);
      assert.match(params.get('fields'),/nextPageToken/);
      return {json:async()=>({files:clone(files.slice(offset,offset+options.pageSize)),nextPageToken:offset+options.pageSize<files.length?String(offset+options.pageSize):undefined})};
    }
    if(url.includes('alt=media')){
      const id=decodeURIComponent(new URL(url).pathname.split('/').pop());
      if(options.downloadError&&id===options.downloadError.id){const error=new Error('download '+options.downloadError.status);error.status=options.downloadError.status;throw error;}
      if(options.beforeDownload)await options.beforeDownload(h,id);
    }
    return original(url,request);
  };
  h.addPayload=(id,items,updatedAt='2026-10-23T00:00:00Z',itemMeta={})=>h.addFile(id,JSON.stringify({app:'Maritime Drill',revision:1,updatedAt,items,itemMeta}),'200');
  return h;
}
function attachRealAuth(h){
  const s=h.s,serverFetch=s.driveSyncFetch,listeners={},requests=[];
  const tokenKey='maritime-drill:drive-auth:v1';
  Object.assign(s,{
    Headers,AbortController,sessionStorage:new s.Storage(),
    DRIVE_SYNC_SESSION_TOKEN_KEY:'md_drive_sync_token_session_v1',DRIVE_SYNC_POLL_MS:30000,driveSyncTimer:null,
    driveSyncPanelStatus:()=>({label:'test',tone:'#000'}),
    document:{body:null,readyState:'loading',visibilityState:'hidden',getElementById:()=>null,querySelector:()=>null,
      addEventListener(name,fn){(listeners[name]||=[]).push(fn)}},
    addEventListener(name,fn){(listeners[name]||=[]).push(fn)},
    setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},
    google:{accounts:{oauth2:{}}},
    fetch:async(url,request={})=>{
      requests.push({method:request.method||'GET',authorization:request.headers.get('Authorization')});
      const response=await serverFetch(url,{...request,headers:{'Content-Type':request.headers.get('Content-Type')}});
      const body=typeof response.text==='function'?await response.text():JSON.stringify(await response.json());
      return new Response(body,{status:200,headers:{'Content-Type':'application/json'}});
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root,'drive-auth.js'),'utf8'),s);
  s.driveSyncHasToken=()=>!!s.driveSyncLoadSessionToken();
  h.authSave=token=>s.driveSyncSaveSessionToken({access_token:token,expires_in:3600});
  h.authEmit=(name,event)=>{for(const listener of listeners[name]||[])listener(event)};
  h.authReplaceFromOtherTab=token=>{
    const oldValue=s.localStorage.getItem(tokenKey),newValue=JSON.stringify({access_token:token,expiresAt:Date.now()+3600000});
    s.localStorage.setItem(tokenKey,newValue);h.authEmit('storage',{key:tokenKey,oldValue,newValue});
  };
  h.authRequests=requests;h.authSave('synthetic-account-A');h.authEmit('DOMContentLoaded');
  return h;
}
let count=0;async function test(name,run){await run();count++;console.log('PASS '+name)}
(async()=>{
  await test('a fresh third device recovers both simultaneous first uploads while original devices stay closed',async()=>{
    const files=new Map(),a=harness({files,devicePrefix:'A'}),b=harness({files,devicePrefix:'B'});
    a.write('uniqueA');b.write('uniqueB');await Promise.all([a.sync(),b.sync()]);assert.equal(files.size,2);
    const c=harness({files});await c.sync();
    assert.equal(c.s.driveSyncLastError,'');assert.ok(c.progress().uniqueA);assert.ok(c.progress().uniqueB);
    const canonical=JSON.parse(files.get(c.load().remoteFileId).body);assert.ok(JSON.parse(canonical.items.md_progress).uniqueA);assert.ok(JSON.parse(canonical.items.md_progress).uniqueB);
  });
  await test('duplicate aggregates across every listing page merge before the first success',async()=>{
    const h=harness({pageSize:1});
    h.addPayload('a',{md_from_a:'"A"'});h.addPayload('b',{md_from_b:'"B"'});h.addPayload('c',{md_from_c:'"C"'});
    await h.sync();assert.equal(h.calls.list,3);assert.equal(h.s.driveSyncLastError,'');
    for(const letter of ['a','b','c'])assert.equal(h.storage.getItem('md_from_'+letter),JSON.stringify(letter.toUpperCase()));
  });
  await test('older duplicate fallback clocks do not overwrite a newer local record',async()=>{
    const h=harness();h.storage.setItem('md_local_setting',JSON.stringify({value:'new local'}));
    const state=h.load();state.itemMeta.md_local_setting={updatedAt:'2026-10-22T00:00:00Z',fields:{'value':{updatedAt:'2026-10-22T00:00:00Z',deleted:false}}};h.save(state);
    h.addPayload('old',{md_local_setting:'{"value":"old remote"}'},'2026-10-20T00:00:00Z');
    h.addPayload('new',{md_other_setting:'"new remote"'},'2026-10-25T00:00:00Z');await h.sync();
    assert.equal(h.s.driveSyncLastError,'');assert.equal(JSON.parse(h.storage.getItem('md_local_setting')).value,'new local');assert.equal(h.storage.getItem('md_other_setting'),'"new remote"');
  });
  await test('active study uploads recovered duplicate history but defers local replacement and reload',async()=>{
    const h=harness();h.s.currentMode='past';h.addPayload('a',{md_from_a:'"A"'});h.addPayload('b',{md_from_b:'"B"'});
    await h.sync();assert.equal(h.calls.reload,0);assert.equal(h.storage.getItem('md_from_a'),null);assert.equal(h.storage.getItem('md_from_b'),null);
    const remote=JSON.parse(h.files.get(h.load().remoteFileId).body);assert.equal(remote.items.md_from_a,'"A"');assert.equal(remote.items.md_from_b,'"B"');
    h.s.currentMode='home';await h.sync();assert.equal(h.storage.getItem('md_from_a'),'"A"');assert.equal(h.storage.getItem('md_from_b'),'"B"');
  });
  await test('answers written during the last duplicate download remain in both local and uploaded snapshots',async()=>{
    const h=harness({beforeDownload(h,id){if(id==='a')h.write('duringDuplicate')}});h.addPayload('a',{md_a:'"A"'});h.addPayload('b',{md_b:'"B"'});
    await h.sync();assert.ok(h.progress().duringDuplicate);const payload=JSON.parse(h.files.get(h.load().remoteFileId).body);assert.ok(JSON.parse(payload.items.md_progress).duringDuplicate);
  });
  await test('401, 403 and 500 from a duplicate stop all uploads, local changes and success status',async()=>{
    for(const status of [401,403,500]){
      const h=harness({downloadError:{id:'a',status}});h.addPayload('a',{md_a:'"A"'});h.addPayload('b',{md_b:'"B"'});
      const before=h.collect(),files=[...h.files.values(),...h.snapshotFiles.values()].map(f=>f.body);await h.sync();
      assert.deepEqual(h.collect(),before);assert.deepEqual([...h.files.values()].map(f=>f.body),files);assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.match(h.s.driveSyncLastError,/download/);
    }
  });
  await test('a confirmed 404 for an extra duplicate does not discard the surviving aggregate',async()=>{
    const h=harness({downloadError:{id:'a',status:404}});h.addPayload('a',{md_a:'"A"'});h.addPayload('b',{md_b:'"B"'});await h.sync();
    assert.equal(h.s.driveSyncLastError,'');assert.equal(h.storage.getItem('md_b'),'"B"');assert.equal(h.calls.create,0);
  });
  await test('account change while a duplicate downloads prevents every subsequent write',async()=>{
    const h=harness({beforeDownload(h,id){if(id==='a')h.changeAccount()}});h.addPayload('a',{md_a:'"A"'});h.addPayload('b',{md_b:'"B"'});const before=h.collect();await h.sync();
    assert.deepEqual(h.collect(),before);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.match(h.s.driveSyncLastError,/연결이 변경/);
  });
  await test('known malformed remote records cannot replace local learning data or update Drive',async()=>{
    for(const [key,value] of [
      ['md_nav23_pass_progress_v1','[]'],['md_nav23_pass_progress_v1','{bad'],['md_nav23_pass_progress_v1','{"q":{"attempts":-1}}'],
      ['md_past_wrongs_v1','{"q":{"q":"broken"}}'],['md_problem_reports_v1','{}'],['md_focus_history_navi3','[{}]'],['md_progress','[]'],['md_progress',42],
    ]){
      const h=harness();h.addPayload('bad',{[key]:value},'2099-01-01T00:00:00Z');const before=h.collect(),remote=h.files.get('bad').body;await h.sync();
      assert.deepEqual(h.collect(),before);assert.equal(h.files.get('bad').body,remote);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);assert.ok(h.s.driveSyncLastError,key+' must fail');
    }
  });
  await test('malformed secondary aggregate cannot be skipped in favor of a success notification',async()=>{
    const h=harness();h.addPayload('a',{md_past_history_v1:'[]'});h.addPayload('b',{md_b:'"B"'});const before=h.collect();await h.sync();
    assert.deepEqual(h.collect(),before);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.match(h.s.driveSyncLastError,/형식/);
  });
  await test('valid legacy numeric strings normalize and ordinary scalar settings still sync',async()=>{
    const h=harness();h.addPayload('a',{md_nav23_pass_progress_v1:'{"q":{"attempts":"2","correct":"1","wrong":"1"}}',md_focus_n:'15',goc_tts:'off',md_view_mode_v1:'desktop'});await h.sync();
    assert.equal(h.s.driveSyncLastError,'');assert.equal(JSON.parse(h.storage.getItem('md_nav23_pass_progress_v1')).q.attempts,2);assert.equal(h.storage.getItem('md_focus_n'),'15');assert.equal(h.storage.getItem('md_view_mode_v1'),'desktop');
  });
  await test('simultaneous shared aggregate PATCHes survive both original devices closing immediately',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'}),b=harness({files,deviceId:'B'});
    a.addPayload('shared',a.collect());a.write('onlyA');b.write('onlyB');await Promise.all([a.sync(),b.sync()]);
    assert.equal(a.s.driveSyncLastError,'');assert.equal(b.s.driveSyncLastError,'');assert.equal(files.size,1);assert.equal(a.snapshotFiles.size,2);
    const c=harness({files,deviceId:'C'});await c.sync();assert.ok(c.progress().onlyA);assert.ok(c.progress().onlyB);assert.equal(c.s.driveSyncLastError,'');
  });
  await test('unchanged polls create no extra device files and perform no uploads',async()=>{
    const h=harness();await h.sync();const counts=clone(h.calls),sizes=[h.files.size,h.snapshotFiles.size];
    for(let i=0;i<10;i++)await h.sync();
    assert.equal(h.s.driveSyncLastError,'');assert.deepEqual([h.files.size,h.snapshotFiles.size],sizes);assert.equal(h.calls.create,counts.create);assert.equal(h.calls.deviceCreate,counts.deviceCreate);assert.equal(h.calls.upload,counts.upload);assert.equal(h.calls.deviceUpload,counts.deviceUpload);
  });
  await test('changed polls and reloading the same device retain one durable snapshot file',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'});await a.sync();
    for(let i=0;i<5;i++){a.write('answer'+i);await a.sync()}
    assert.equal(a.snapshotFiles.size,1);assert.equal(a.calls.deviceCreate,1);assert.equal(a.s.driveSyncLastError,'');
    const reloaded=harness({files,deviceId:'A',storage:a.storage});await reloaded.sync();assert.equal(reloaded.snapshotFiles.size,1);assert.ok(reloaded.progress().answer4);
  });
  await test('snapshot creation failure prevents aggregate writes and success state',async()=>{
    const h=harness({deviceCreateFails:true});h.addPayload('shared',{md_other:'"remote"'});const before=h.collect(),remote=h.files.get('shared').body;await h.sync();
    assert.deepEqual(h.collect(),before);assert.equal(h.files.get('shared').body,remote);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.equal(h.load().lastSyncedAt,undefined);assert.match(h.s.driveSyncLastError,/snapshot create failed/);
  });
  await test('snapshot update failure prevents aggregate writes and preserves both previous remote copies',async()=>{
    const h=harness();await h.sync();h.write('newAnswer');h.options.deviceUploadFails=true;
    const local=h.collect(),aggregate=[...h.files.values()][0].body,snapshot=[...h.snapshotFiles.values()][0].body,uploads=h.calls.upload;await h.sync();
    assert.deepEqual(h.collect(),local);assert.equal([...h.files.values()][0].body,aggregate);assert.equal([...h.snapshotFiles.values()][0].body,snapshot);assert.equal(h.calls.upload,uploads);assert.match(h.s.driveSyncLastError,/snapshot upload failed/);
  });
  await test('an aggregate failure after snapshot success remains recoverable by a new device',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'});await a.sync();a.write('survivesFailedAggregate');a.options.onUpload=()=>{throw new Error('aggregate update failed')};await a.sync();assert.match(a.s.driveSyncLastError,/aggregate update failed/);
    const c=harness({files,deviceId:'C'});await c.sync();assert.ok(c.progress().survivesFailedAggregate);assert.equal(c.s.driveSyncLastError,'');
  });
  await test('snapshot-only recovery reconstructs a missing aggregate in the same sync',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'});a.write('survivesMissingAggregate');await a.sync();files.clear();
    const c=harness({files,deviceId:'C'});await c.sync();assert.ok(c.progress().survivesMissingAggregate);assert.equal(files.size,1);assert.equal(c.s.driveSyncLastError,'');
  });
  await test('an account change while snapshot creation is in flight stops the aggregate and local writes',async()=>{
    const h=harness({onDeviceCreate(h){h.changeAccount()}});h.addPayload('shared',{md_remote:'"R"'});const before=h.collect(),remote=h.files.get('shared').body;await h.sync();
    assert.deepEqual(h.collect(),before);assert.equal(h.files.get('shared').body,remote);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.match(h.s.driveSyncLastError,/연결이 변경/);
  });
  await test('same-device tabs serialize all network work under one origin lock and preserve live answers',async()=>{
    let tail=Promise.resolve(),active=0,maxActive=0;
    const locks={request(name,run){assert.equal(name,'maritime-drill-drive-sync');const task=tail.then(async()=>{active++;maxActive=Math.max(maxActive,active);try{return await run({name})}finally{active--}});tail=task.catch(()=>{});return task}};
    const files=new Map(),a=harness({files,deviceId:'same',locks,onDeviceCreate(h){h.write('duringFirstTab')}}),b=harness({files,deviceId:'same',locks,storage:a.storage});
    a.write('beforeTabs');await Promise.all([a.sync(),b.sync()]);assert.equal(maxActive,1);assert.equal(a.snapshotFiles.size,1);assert.equal(a.s.driveSyncBusy,false);assert.equal(b.s.driveSyncBusy,false);
    const fresh=harness({files,deviceId:'third'});await fresh.sync();assert.ok(fresh.progress().beforeTabs);assert.ok(fresh.progress().duringFirstTab);
  });
  await test('a waiting sync stays busy and cannot use a connection changed before lock acquisition',async()=>{
    let release;const ready=new Promise(resolve=>release=resolve);
    const h=harness({locks:{async request(name,run){await ready;return run({name})}}});const pending=h.sync();
    assert.equal(h.s.driveSyncBusy,true);assert.equal(h.calls.list,0);h.changeAccount();release();await pending;
    assert.equal(h.calls.list,0);assert.equal(h.calls.deviceCreate,0);assert.equal(h.s.driveSyncBusy,false);assert.equal(h.load().lastSyncedAt,undefined);
  });
  await test('missing Web Locks stops cloud writes with a clear error while local storage still works',async()=>{
    const h=harness();h.s.navigator.locks=null;const before=h.collect();await h.sync();assert.deepEqual(h.collect(),before);assert.equal(h.calls.list,0);assert.equal(h.calls.deviceCreate,0);assert.match(h.s.driveSyncLastError,/최신 Chrome/);assert.equal(h.s.driveSyncBusy,false);
    h.write('offlineAnswer');assert.ok(h.progress().offlineAnswer);
  });
  await test('a rejected lock releases the busy state and a later supported attempt succeeds',async()=>{
    const h=harness({locks:{request:async()=>{throw new Error('lock refused')}}});await h.sync();assert.equal(h.s.driveSyncBusy,false);assert.match(h.s.driveSyncLastError,/lock refused/);
    h.s.navigator.locks={request:async(name,run)=>run({name})};await h.sync();assert.equal(h.s.driveSyncLastError,'');assert.equal(h.calls.deviceCreate,1);
  });
  await test('explicit reset generations and key deletions survive old snapshots and legacy aggregates',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'}),b=harness({files,deviceId:'B'});a.storage.setItem('md_removed','"remove me"');a.write('oldRecord');await a.sync();await b.sync();
    const legacy=clone([...files.values()][0]);legacy.id='legacy-old';files.set(legacy.id,legacy);
    assert.equal(a.s.__mdDriveSyncV2.resetKey('md_progress','{}','reset'),true);a.storage.removeItem('md_removed');await a.sync();
    const c=harness({files,deviceId:'C'});await c.sync();assert.equal(JSON.stringify(c.progress()),'{}');assert.equal(c.storage.getItem('md_removed'),null);assert.equal(c.s.driveSyncLastError,'');
  });
  await test('a zero-byte legacy aggregate cannot hide a complete device snapshot on first recovery',async()=>{
    const files=new Map(),a=harness({files,deviceId:'A'});a.write('survivesEmptyAggregate');await a.sync();files.clear();a.addFile('empty','','0');
    const c=harness({files,deviceId:'C'});await c.sync();assert.ok(c.progress().survivesEmptyAggregate);assert.equal(c.s.driveSyncLastError,'');assert.equal(files.get('empty').body,'');assert.equal(files.size,2);assert.equal(c.calls.create,1);
  });
  await test('a lost snapshot create response reuses the durable file on retry without duplication',async()=>{
    const h=harness({lostDeviceResponse:true});h.write('retainedAfterLostResponse');await h.sync();assert.equal(h.files.size,0);assert.equal(h.snapshotFiles.size,1);assert.match(h.s.driveSyncLastError,/response lost/);
    h.options.lostDeviceResponse=false;await h.sync();assert.equal(h.snapshotFiles.size,1);assert.equal(h.calls.deviceCreate,1);assert.equal(h.files.size,1);assert.equal(h.s.driveSyncLastError,'');assert.ok(h.progress().retainedAfterLostResponse);
  });
  await test('real auth token replacement during snapshot creation cannot issue an aggregate write with the new token',async()=>{
    const h=attachRealAuth(harness({onDeviceCreate(h){h.authSave('synthetic-account-B')}}));h.addPayload('shared',{md_remote:'"A-only"'});
    const before=h.collect(),remote=h.files.get('shared').body;await h.sync();
    assert.deepEqual(h.collect(),before);assert.equal(h.files.get('shared').body,remote);assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.equal(h.calls.apply,0);assert.match(h.s.driveSyncLastError,/연결/);
    assert.equal(h.s.driveSyncLoadSessionToken().access_token,'synthetic-account-B');assert.equal(h.authRequests.filter(request=>request.method!=='GET').length,1);assert.ok(h.authRequests.every(request=>request.authorization==='Bearer synthetic-account-A'));
  });
  await test('real auth storage-event token replacement during snapshot update blocks aggregate application and preserves the new connection',async()=>{
    const h=attachRealAuth(harness());await h.sync();assert.equal(h.s.driveSyncLastError,'');h.write('liveAnswer');h.authRequests.length=0;
    h.options.onDeviceUpload=()=>h.authReplaceFromOtherTab('synthetic-account-B');const before=h.collect(),remote=[...h.files.values()][0].body,uploads=h.calls.upload,applies=h.calls.apply;
    await h.sync();assert.deepEqual(h.collect(),before);assert.equal([...h.files.values()][0].body,remote);assert.equal(h.calls.upload,uploads);assert.equal(h.calls.apply,applies);assert.match(h.s.driveSyncLastError,/연결/);assert.equal(h.s.driveSyncBusy,false);
    assert.equal(h.s.driveSyncLoadSessionToken().access_token,'synthetic-account-B');assert.equal(h.authRequests.filter(request=>request.method!=='GET').length,1);assert.ok(h.authRequests.every(request=>request.authorization==='Bearer synthetic-account-A'));
  });
  console.log(`Drive full audit v5.33: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
