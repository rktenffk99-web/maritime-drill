'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf('const DRIVE_SYNC_CLIENT_ID='),end=html.indexOf("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',driveSyncInit",start);
const managed=html.slice(html.indexOf('function isManagedStorageKey('),html.indexOf('function backupNotice('));
const base=html.slice(start,end),patch=fs.readFileSync(path.join(root,'drive-auth.js'),'utf8');
const TOKEN='maritime-drill:drive-auth:v1',LEGACY='md_drive_sync_token_session_v1',STATE='md_drive_sync_state_v1';
function harness(options={}){
  class Storage{
    constructor(data){this.data=data||new Map();this.fail=false}
    get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}
    getItem(k){return this.data.get(k)??null}removeItem(k){this.data.delete(k)}
    setItem(k,v){if(this.fail)throw new Error('QuotaExceededError');this.data.set(k,String(v))}
  }
  let now=Date.UTC(2026,8,22),interval,oauthConfig,network=0,syncs=0,revokes=0;
  const timers=new Map(),listeners={},prompts=[],notices=[];
  const status={textContent:'',style:{}};
  const s={Storage,localStorage:new Storage(options.data),sessionStorage:new Storage(),RESTORE_POINT_KEY:'md_restore_point_v1',
    Date:class extends Date{static now(){return now}},Headers,AbortController,URLSearchParams,
    document:{body:null,readyState:'loading',visibilityState:'visible',getElementById:id=>id==='md-drive-sync-status'?status:null,
      addEventListener(name,fn){(listeners[name]||=[]).push(fn)},querySelector:()=>null},
    addEventListener(name,fn){(listeners[name]||=[]).push(fn)},navigator:{onLine:true,locks:{request:async(name,run)=>run({name})}},console:{warn(){}},
    setInterval(fn){interval=fn;return 1},clearInterval(){},setTimeout(fn,ms){const id={};timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},
    alert:m=>notices.push(m),backupNotice:m=>notices.push(m),__mdDailyStorage:{migrateLocal(){}},
    google:{accounts:{oauth2:{initTokenClient(config){oauthConfig=config;return {requestAccessToken(o){prompts.push(o)}}},
      hasGrantedAllScopes(response,scope){return (response.scope||'').split(' ').includes(scope)},revoke(){revokes++}}}},
    fetch:async()=>{network++;return new Response('{}')},
  };
  s.window=s;vm.createContext(s);vm.runInContext(managed,s);vm.runInContext(base,s);
  s.driveSyncOnce=async()=>{syncs++};vm.runInContext(patch,s);
  const h={s,run:code=>vm.runInContext(code,s),status,prompts,notices,timers,
    advance(ms){now+=ms},emit(name,event){for(const fn of listeners[name]||[])fn(event)},poll:()=>interval(),
    respond(response={}){oauthConfig.callback({access_token:'test-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.appdata',...response})},
    error(type){oauthConfig.error_callback({type})},get counts(){return {network,syncs,revokes}}};
  h.enable=()=>h.run('driveSyncSaveState({...driveSyncDefaultState(),enabled:true})');
  h.save=(token='test-token',seconds=3600)=>s.driveSyncSaveSessionToken({access_token:token,expires_in:seconds});
  return h;
}
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name)}
(async()=>{
  await test('a valid connection survives a new tab and browser-session model',()=>{
    const a=harness();a.enable();a.save();const b=harness({data:a.s.localStorage.data});
    assert.equal(b.s.driveSyncLoadSessionToken().access_token,'test-token');assert.equal(b.s.driveSyncLoadState().enabled,true);
  });
  await test('valid through minute 59, expires at exact Google expiry without extending it',()=>{
    const h=harness();h.save();h.advance(3599000);assert.ok(h.s.driveSyncHasToken());h.advance(1000);assert.equal(h.s.driveSyncHasToken(),false);assert.equal(h.s.localStorage.getItem(TOKEN),null);
  });
  await test('legacy session migrates with its original expiry and is removed',()=>{
    const h=harness();const expiry=h.run('Date.now()')+30000;
    h.s.sessionStorage.setItem(LEGACY,JSON.stringify({access_token:'legacy',expiresAt:expiry}));
    assert.equal(h.s.driveSyncLoadSessionToken().expiresAt,expiry);assert.equal(h.s.sessionStorage.getItem(LEGACY),null);
    h.advance(30000);assert.equal(h.s.driveSyncHasToken(),false);
  });
  await test('credentials are excluded from exports and sync change tracking',()=>{
    const h=harness();h.save();h.s.localStorage.setItem('md_progress','{"q1":1}');h.s.localStorage.setItem(LEGACY,'sensitive');
    assert.equal(JSON.stringify(h.s.collectBackupItems()),'{"md_progress":"{\\"q1\\":1}"}');
    assert.equal(h.s.isManagedStorageKey(TOKEN),false);assert.equal(h.s.isManagedStorageKey(LEGACY),false);
  });
  await test('expiry refreshes visible status without background OAuth requests',()=>{
    const h=harness();h.enable();h.save();h.emit('DOMContentLoaded');h.advance(3600000);const before=h.counts.syncs;h.poll();
    assert.match(h.status.textContent,/일시 중지/);assert.equal(h.prompts.length,0);assert.equal(h.counts.syncs,before);
  });
  await test('answer-screen banner and polling read codec headers without expanding field clocks',()=>{
    const h=harness();let headers=0,enabled=false;h.s.document.body={};h.s.document.getElementById=()=>null;
    h.s.__mdDriveStateCodec={loadHeader(){headers++;return {enabled}}};h.s.driveSyncLoadState=()=>{throw new Error('answer-screen status must not fully decode state')};
    h.s.driveSyncRefreshPanel();h.emit('DOMContentLoaded');h.poll();assert.ok(headers>=5);assert.equal(h.counts.syncs,0);
    enabled=true;h.save();h.poll();assert.equal(h.counts.syncs,1);h.s.navigator.onLine=false;h.poll();assert.equal(h.counts.syncs,1);assert.match(h.s.driveSyncPanelStatus().label,/오프라인/);
    enabled=false;h.emit('storage',{key:STATE,oldValue:'{"enabled":true}',newValue:'{"enabled":false}'});assert.equal(h.counts.syncs,1);assert.equal(h.prompts.length,0);
  });
  await test('renewal is synchronous with the click, does not force chooser, and coalesces requests',async()=>{
    const h=harness();const p=h.s.driveSyncRequestToken(true),q=h.s.driveSyncRequestToken(true);
    assert.equal(h.prompts.length,1);assert.equal(h.prompts[0].prompt,'');assert.equal(p,q);h.respond();await p;assert.ok(h.s.driveSyncHasToken());
  });
  await test('background calls cannot create popup requests',async()=>{
    const h=harness();await assert.rejects(h.s.driveSyncRequestToken(false),/갱신/);assert.equal(h.prompts.length,0);
  });
  await test('popup errors are actionable and retry is possible',async()=>{
    const h=harness();const p=h.s.driveSyncRequestToken();h.error('popup_failed_to_open');await assert.rejects(p,/팝업이 차단/);
    const q=h.s.driveSyncRequestToken();h.respond();await q;assert.equal(h.prompts.length,2);
  });
  await test('timeout rejects and late OAuth callbacks cannot persist tokens',async()=>{
    const h=harness();const p=h.s.driveSyncRequestToken();[...h.timers.values()].find(t=>t.ms===120000).fn();
    await assert.rejects(p,/시간이 초과/);h.respond();assert.equal(h.s.driveSyncHasToken(),false);
  });
  await test('missing scope or invalid expiry cannot report a connected state',async()=>{
    for(const response of [{scope:''},{expires_in:0},{expires_in:undefined}]){
      const h=harness();const p=h.s.driveSyncRequestToken();h.respond(response);await assert.rejects(p);assert.equal(h.s.driveSyncHasToken(),false);
    }
  });
  await test('disconnect cancels pending authorization without revoking other devices',async()=>{
    const h=harness();h.enable();h.s.localStorage.setItem('md_progress','keep');
    const p=h.s.driveSyncRequestToken();h.s.disconnectGoogleDriveSync();await assert.rejects(p,/취소/);h.respond();
    assert.equal(h.s.driveSyncLoadState().enabled,false);assert.equal(h.s.driveSyncHasToken(),false);assert.equal(h.counts.revokes,0);assert.equal(h.s.localStorage.getItem('md_progress'),'keep');
  });
  await test('localStorage quota failure retains a usable session and in-memory credential',()=>{
    const h=harness();h.s.localStorage.fail=true;h.save();assert.equal(h.s.driveSyncLoadSessionToken().access_token,'test-token');assert.ok(h.s.sessionStorage.getItem(LEGACY));
    h.s.sessionStorage.fail=true;h.save('memory');assert.equal(h.s.driveSyncLoadSessionToken().access_token,'memory');
  });
  await test('401 for an old request never retries its payload with a replacement credential',async()=>{
    const h=harness();h.save('old');let n=0;const requests=[];
    h.s.fetch=async(url,options)=>{requests.push(options);n++;if(n===1){h.save('new');return new Response(null,{status:401})}return new Response('{"ok":true}')};
    await assert.rejects(h.s.driveSyncFetch('/mock',{method:'POST',body:'old account payload'}),/연결 정보가 변경/);
    assert.equal(n,1);assert.equal(h.s.driveSyncLoadSessionToken().access_token,'new');assert.equal(requests[0].signal.aborted,true);assert.equal(h.timers.size,0);
    const response=await h.s.driveSyncFetch('/fresh-discovery');assert.equal(n,2);assert.equal(requests[1].headers.get('Authorization'),'Bearer new');assert.deepEqual(await response.json(),{ok:true});
  });
  await test('credential epochs change on replacement and expiry without invalidating an unchanged token',()=>{
    const h=harness(),initial=h.s.__mdDriveAuthGeneration();h.save('first');const first=h.s.__mdDriveAuthGeneration();assert.ok(first>initial);
    h.save('first');assert.equal(h.s.__mdDriveAuthGeneration(),first);h.save('second');const second=h.s.__mdDriveAuthGeneration();assert.ok(second>first);
    h.advance(3600000);assert.ok(h.s.__mdDriveAuthGeneration()>second);assert.equal(h.s.driveSyncHasToken(),false);
  });
  await test('cross-tab replacement is observed even before its storage event is delivered',()=>{
    const h=harness();h.enable();h.save('first');h.emit('DOMContentLoaded');const epoch=h.s.__mdDriveAuthGeneration();
    h.s.localStorage.setItem(TOKEN,JSON.stringify({access_token:'other-account',expiresAt:h.run('Date.now()')+3600000}));
    assert.ok(h.s.__mdDriveAuthGeneration()>epoch);const changed=h.s.__mdDriveAuthGeneration();
    h.emit('storage',{key:TOKEN,newValue:h.s.localStorage.getItem(TOKEN)});assert.equal(h.s.__mdDriveAuthGeneration(),changed);
    assert.equal(h.s.driveSyncLoadSessionToken().access_token,'other-account');
  });
  await test('a successful response from a replaced credential is rejected before the caller can apply it',async()=>{
    const h=harness();h.save('first');let calls=0;
    h.s.fetch=async()=>{calls++;h.save('replacement');return new Response('{"oldAccountData":true}')};
    await assert.rejects(h.s.driveSyncFetch('/mock'),/연결 정보가 변경/);assert.equal(calls,1);assert.equal(h.s.driveSyncLoadSessionToken().access_token,'replacement');assert.equal(h.timers.size,0);
  });
  await test('first interactive login still enables sync after its own credential epoch changes',async()=>{
    const h=harness(),before=h.s.__mdDriveAuthGeneration(),pending=h.s.connectGoogleDriveSync();h.respond();await pending;
    assert.ok(h.s.__mdDriveAuthGeneration()>before);assert.equal(h.s.driveSyncLoadState().enabled,true);assert.equal(h.counts.syncs,1);
  });
  await test('401 invalidates current token; ordinary network failures keep it',async()=>{
    const h=harness();h.save();h.s.fetch=async()=>{throw new Error('offline')};await assert.rejects(h.s.driveSyncFetch('/mock'),/offline/);assert.ok(h.s.driveSyncHasToken());
    h.s.fetch=async()=>new Response(null,{status:401});await assert.rejects(h.s.driveSyncFetch('/mock'),/갱신/);assert.equal(h.s.driveSyncHasToken(),false);assert.equal(h.timers.size,0);
  });
  await test('HTTP 404 remains distinguishable from permission errors and network failures',async()=>{
    for(const status of [403,404,500]){
      const h=harness();h.save();h.s.fetch=async()=>new Response(JSON.stringify({error:{message:'provider detail'}}),{status});
      await assert.rejects(h.s.driveSyncFetch('https://www.googleapis.com/drive/v3/files/example'),error=>error.status===status&&error.message==='provider detail');
      assert.equal(h.s.driveSyncHasToken(),true);
    }
    const h=harness();h.save();h.s.fetch=async()=>{throw new Error('network failure')};
    await assert.rejects(h.s.driveSyncFetch('https://www.googleapis.com/drive/v3/files/example'),error=>error.status===undefined);
  });
  await test('network timeout releases a stalled fetch and preserves authentication',async()=>{
    const h=harness();h.save();h.s.fetch=(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));
    const p=h.s.driveSyncFetch('/mock');[...h.timers.values()].find(t=>t.ms===20000).fn();await assert.rejects(p,/응답이 늦어/);assert.ok(h.s.driveSyncHasToken());assert.equal(h.timers.size,0);
  });
  await test('successful native responses keep their status, headers and one-shot body consumption',async()=>{
    const h=harness();h.save();let original;
    h.s.fetch=async()=>original=new Response('{"value":"항해"}',{status:201,headers:{'X-Test':'retained'}});
    const response=await h.s.driveSyncFetch('/mock');
    assert.equal(response,original);assert.equal(response.status,201);assert.equal(response.headers.get('X-Test'),'retained');
    assert.equal(response.bodyUsed,false);assert.equal(h.timers.size,0);assert.deepEqual(await response.json(),{value:'항해'});
    assert.equal(response.bodyUsed,true);await assert.rejects(response.text(),TypeError);
  });
  await test('headers and body share one deadline and a stalled body preserves authentication',async()=>{
    const h=harness();h.save();let signal,started,aborts=0;
    const headers=new Promise(resolve=>started=resolve);
    h.s.fetch=async(url,options)=>{
      signal=options.signal;
      const response=new Response(new ReadableStream({start(controller){
        controller.enqueue(new TextEncoder().encode('{"partial":'));
        signal.addEventListener('abort',()=>{aborts++;controller.error(new DOMException('aborted','AbortError'))});
      }}));started();return response;
    };
    const pending=h.s.driveSyncFetch('/mock');await headers;await Promise.resolve();
    const timers=[...h.timers.values()].filter(t=>t.ms===20000);assert.equal(timers.length,1);timers[0].fn();
    await assert.rejects(pending,/응답이 늦어/);assert.equal(signal.aborted,true);assert.equal(aborts,1);
    assert.equal(h.timers.size,0);assert.ok(h.s.driveSyncHasToken());
  });
  await test('HTTP error bodies use the same timeout and clean up on parsed or malformed errors',async()=>{
    const h=harness();h.save();
    for(const [body,message] of [['{"error":{"message":"quota reached"}}',/quota reached/],['{bad',/요청 실패 \(500\)/]]){
      h.s.fetch=async()=>new Response(body,{status:500});await assert.rejects(h.s.driveSyncFetch('/mock'),message);assert.equal(h.timers.size,0);
    }
    let started;const headers=new Promise(resolve=>started=resolve);
    h.s.fetch=async(url,{signal})=>{
      const response=new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')))}}),{status:500});
      started();return response;
    };
    const pending=h.s.driveSyncFetch('/mock');await headers;await Promise.resolve();
    [...h.timers.values()].find(t=>t.ms===20000).fn();await assert.rejects(pending,/응답이 늦어/);
    assert.equal(h.timers.size,0);assert.ok(h.s.driveSyncHasToken());
  });
  await test('malformed successful JSON rejects through the native parser without leaving a timer',async()=>{
    const h=harness();h.save();h.s.fetch=async()=>new Response('{bad');
    const response=await h.s.driveSyncFetch('/mock');assert.equal(h.timers.size,0);
    await assert.rejects(response.json(),SyntaxError);assert.equal(h.timers.size,0);assert.ok(h.s.driveSyncHasToken());
  });
  await test('a stalled media body releases the real sync busy flag without modifying learning data',async()=>{
    const h=harness();h.enable();h.save();h.s.localStorage.setItem('md_progress','{"q1":{"correct":1}}');
    vm.runInContext(fs.readFileSync(path.join(root,'daily-storage.js'),'utf8'),h.s);
    vm.runInContext(fs.readFileSync(path.join(root,'drive-sync-v2.js'),'utf8'),h.s);
    const before=Object.fromEntries(h.s.localStorage.data);let started,signal;
    const mediaHeaders=new Promise(resolve=>started=resolve);
    h.s.fetch=async(url,options)=>{
      if(!url.includes('alt=media'))return new Response(JSON.stringify({files:[{id:'file-1',name:h.run('DRIVE_SYNC_FILE'),size:'123',modifiedTime:'2026-09-21T00:00:00Z'}]}));
      signal=options.signal;
      const response=new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')))}}));
      started();return response;
    };
    const pending=h.s.driveSyncOnce({showNotice:true});
    await Promise.race([mediaHeaders,pending.then(()=>{throw new Error('Sync ended before media download: '+h.run('driveSyncLastError'))})]);await Promise.resolve();
    assert.equal(h.run('driveSyncBusy'),true);[...h.timers.values()].find(t=>t.ms===20000).fn();await pending;
    assert.equal(signal.aborted,true);assert.equal(h.run('driveSyncBusy'),false);assert.match(h.run('driveSyncLastError'),/응답이 늦어/);
    assert.equal(h.timers.size,0);assert.ok(h.s.driveSyncHasToken());assert.deepEqual(Object.fromEntries(h.s.localStorage.data),before);
  });
  await test('metadata storage events cannot create cross-tab sync ping-pong',()=>{
    const h=harness();h.enable();h.save();h.emit('DOMContentLoaded');const before=h.counts.syncs;
    h.emit('storage',{key:STATE,oldValue:'{"enabled":true,"revision":1}',newValue:'{"enabled":true,"revision":2}'});assert.equal(h.counts.syncs,before);
  });
  await test('cross-tab token removal invalidates memory and any legacy session copy',()=>{
    const h=harness();h.enable();h.save();h.emit('DOMContentLoaded');h.s.localStorage.removeItem(TOKEN);
    h.s.sessionStorage.setItem(LEGACY,JSON.stringify({access_token:'stale',expiresAt:h.run('Date.now()')+3600000}));
    h.emit('storage',{key:TOKEN,newValue:null});assert.equal(h.s.driveSyncHasToken(),false);
  });
  await test('progress metadata changed during OAuth is preserved on connection',async()=>{
    const h=harness();h.enable();const p=h.s.connectGoogleDriveSync();
    h.run('driveSyncSaveState({...driveSyncLoadState(),revision:42,itemMeta:{changed:true}})');h.respond();await p;
    assert.equal(h.s.driveSyncLoadState().revision,42);assert.equal(h.s.driveSyncLoadState().itemMeta.changed,true);
  });
  console.log(`drive-auth tests: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
