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
    addEventListener(name,fn){(listeners[name]||=[]).push(fn)},navigator:{onLine:true},console:{warn(){}},
    setInterval(fn){interval=fn;return 1},clearInterval(){},setTimeout(fn,ms){const id={};timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},
    alert:m=>notices.push(m),backupNotice:m=>notices.push(m),__mdDailyStorage:{migrateLocal(){}},
    google:{accounts:{oauth2:{initTokenClient(config){oauthConfig=config;return {requestAccessToken(o){prompts.push(o)}}},
      hasGrantedAllScopes(response,scope){return (response.scope||'').split(' ').includes(scope)},revoke(){revokes++}}}},
    fetch:async()=>{network++;return {status:200,ok:true,json:async()=>({})}},
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
  await test('401 for an old request reuses a newer token instead of deleting it',async()=>{
    const h=harness();h.save('old');let n=0;
    h.s.fetch=async()=>{n++;if(n===1){h.save('new');return {status:401,ok:false}}return {status:200,ok:true}};
    await h.s.driveSyncFetch('/mock');assert.equal(n,2);assert.equal(h.s.driveSyncLoadSessionToken().access_token,'new');
  });
  await test('401 invalidates current token; ordinary network failures keep it',async()=>{
    const h=harness();h.save();h.s.fetch=async()=>{throw new Error('offline')};await assert.rejects(h.s.driveSyncFetch('/mock'),/offline/);assert.ok(h.s.driveSyncHasToken());
    h.s.fetch=async()=>({status:401,ok:false});await assert.rejects(h.s.driveSyncFetch('/mock'),/갱신/);assert.equal(h.s.driveSyncHasToken(),false);
  });
  await test('network timeout releases a stalled fetch and preserves authentication',async()=>{
    const h=harness();h.save();h.s.fetch=(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));
    const p=h.s.driveSyncFetch('/mock');[...h.timers.values()].find(t=>t.ms===20000).fn();await assert.rejects(p,/응답이 늦어/);assert.ok(h.s.driveSyncHasToken());
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
