'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..'),STATE='md_drive_sync_state_v1',PROGRESS='md_nav23_pass_progress_v1';
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const base=html.slice(html.indexOf('function driveSyncDefaultState(){'),html.indexOf('function driveSyncTouchLocal(){'));
const codec=fs.readFileSync(path.join(ROOT,'drive-state-codec.js'),'utf8'),sync=fs.readFileSync(path.join(ROOT,'drive-sync-v2.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function sample(count=120,fieldsPerQuestion=6){
  const fields={};for(let i=0;i<count;i++)fields['navi2%7Cq-'+Math.floor(i/fieldsPerQuestion)+'/field-'+i%fieldsPerQuestion]={updatedAt:new Date(Date.parse('2026-10-22T00:00:00Z')+Math.floor(i/fieldsPerQuestion)*1000).toISOString(),deleted:i%11===0};
  return {enabled:true,deviceId:'device-a',revision:7,localUpdatedAt:'2026-10-22T00:00:00Z',remoteFileId:'old-file',lastSyncedAt:null,remoteUpdatedAt:null,extraSetting:{retained:true},itemMeta:{[PROGRESS]:{updatedAt:'2026-10-22T00:00:00Z',deleted:false,generation:{id:'reset-id',updatedAt:'2026-10-01T00:00:00Z'},fields,history:{'session:old':{updatedAt:'2026-10-01T00:00:00Z',deleted:true}},extraMeta:'preserved'}}};
}
function harness(initial,options={}){
  class Storage{
    constructor(){this.data=new Map();this.fail=false}
    get length(){return this.data.size}
    key(i){return [...this.data.keys()][i]??null}
    getItem(key){return this.data.get(key)??null}
    setItem(key,value){if(this.fail)throw new Error('QuotaExceededError');this.data.set(String(key),String(value))}
    removeItem(key){this.data.delete(key)}
  }
  const localStorage=new Storage();if(initial)localStorage.setItem(STATE,JSON.stringify(initial));localStorage.setItem(PROGRESS,'{"q1":{"correct":1}}');localStorage.fail=!!options.failBeforeCodec;
  const s={window:null,console:{warn(){}},Storage,localStorage,Date,JSON,Math,Object,Array,Set,Map,encodeURIComponent,
    DRIVE_SYNC_STATE_KEY:STATE,driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,
    driveSyncNewDeviceId:()=> 'default-device',driveSyncLastError:'',driveSyncOnce(){},driveSyncInstallStorageHooks(){},
    driveSyncNowIso:()=> '2026-10-22T01:00:00Z',driveSyncRefreshPanel(){},driveSyncBusy:false,
    isManagedStorageKey:key=>key.startsWith('md_')&&key!==STATE,
    collectBackupItems:()=>Object.fromEntries([...localStorage.data].filter(([key])=>key.startsWith('md_')&&key!==STATE)),
    navigator:{onLine:true},currentMode:'home',location:{reload(){}},driveSyncHasToken:()=>true,driveSyncRequestToken:async()=>{},
    driveSyncFindRemoteFile:async()=>null,driveSyncCreateRemote:async payload=>{h.uploaded=plain(payload);return 'new-file'},
    backupNotice(){},alert(){},BACKUP_SCHEMA_VERSION:1,APP_VERSION:'5.22'};
  s.window=s;vm.createContext(s);vm.runInContext(base,s);vm.runInContext(codec,s);
  const h={s,storage:localStorage,api:s.__mdDriveStateCodec,load:()=>s.driveSyncLoadState(),save:value=>s.driveSyncSaveState(value),raw:()=>localStorage.getItem(STATE)};
  return h;
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
(async()=>{
  await test('startup migration packs only local field clocks and decodes the exact original state',()=>{
    const state=sample(),h=harness(state),raw=JSON.parse(h.raw());assert.equal(raw.enabled,true);assert.equal(raw.deviceId,state.deviceId);assert.equal(raw.remoteFileId,state.remoteFileId);assert.ok(raw.itemMeta[PROGRESS].fields[h.api.MARKER]);assert.deepEqual(plain(h.load()),state);
  });
  await test('small states stay expanded when packing would add overhead',()=>{
    const state=sample(2),h=harness(state);assert.deepEqual(JSON.parse(h.raw()),state);assert.deepEqual(plain(h.load()),state);
  });
  await test('unknown record shapes, extra fields, roots and deletion clocks round-trip without mutation',()=>{
    const state=sample();Object.assign(state.itemMeta[PROGRESS].fields,{'':{updatedAt:'odd-date',deleted:false,extra:'must stay'},'q/null':null,'q/scalar':17,'q/array':['legacy'],'q/extra':{updatedAt:'2026-10-22',deleted:true,reason:'keep'}});state.itemMeta.other={custom:['unchanged'],fields:null};
    const h=harness(),before=JSON.stringify(state),packed=h.api.encode(state),decoded=h.api.decode(packed);assert.deepEqual(plain(decoded),state);assert.equal(JSON.stringify(state),before);assert.deepEqual(plain(h.api.decode(h.api.encode(decoded))),state);
  });
  await test('original flat version-one tuples remain readable beside raw extra-shaped records',()=>{
    const h=harness(),fields={[h.api.MARKER]:[['q','mastered','note'],['2026-10-22T00:00:00Z'],[[[0,1],0,1],[[0,2],{updatedAt:'custom',deleted:false,reason:'retained'}]]]};
    assert.deepEqual(plain(h.api.decodeFields(fields)),{'q/mastered':{updatedAt:'2026-10-22T00:00:00Z',deleted:true},'q/note':{updatedAt:'custom',deleted:false,reason:'retained'}});
  });
  await test('grouped rows keep each parent clock and deletion flag without changing unknown records',()=>{
    const state=sample(150),h=harness(),fields=state.itemMeta[PROGRESS].fields,first=Object.keys(fields).slice(0,6);for(const key of first)fields[key].deleted=true;fields['q/extras']={updatedAt:'2026-10-22',deleted:false,note:'exact'};
    const packed=h.api.encode(state),rows=packed.itemMeta[PROGRESS].fields[h.api.MARKER][2];assert.ok(rows.some(row=>row.length===4));assert.deepEqual(plain(h.api.decode(packed)),state);
  });
  await test('raw path overlays from an older tab survive with per-field clock and deletion ordering',()=>{
    const state=sample(),h=harness(state),raw=JSON.parse(h.raw()),fields=raw.itemMeta[PROGRESS].fields;
    const first=Object.keys(state.itemMeta[PROGRESS].fields)[0],second=Object.keys(state.itemMeta[PROGRESS].fields)[1];
    fields[first]={updatedAt:'2026-10-23T00:00:00Z',deleted:true};fields[second]={updatedAt:'2026-01-01T00:00:00Z',deleted:false};fields['new/path']={updatedAt:'2026-10-24T00:00:00Z',deleted:false};h.storage.setItem(STATE,JSON.stringify(raw));
    const loaded=h.load();assert.deepEqual(plain(loaded.itemMeta[PROGRESS].fields[first]),fields[first]);assert.deepEqual(plain(loaded.itemMeta[PROGRESS].fields[second]),state.itemMeta[PROGRESS].fields[second]);assert.deepEqual(plain(loaded.itemMeta[PROGRESS].fields['new/path']),fields['new/path']);assert.equal(h.save(loaded),true);assert.deepEqual(plain(h.load()),plain(loaded));
  });
  await test('reserved raw path names round-trip as own metadata without changing the object prototype',()=>{
    const h=harness(sample()),raw=JSON.parse(h.raw()),record={updatedAt:'2026-10-23T00:00:00Z',deleted:false,polluted:true};Object.defineProperty(raw.itemMeta[PROGRESS].fields,'__proto__',{value:record,enumerable:true});h.storage.setItem(STATE,JSON.stringify(raw));const fields=h.load().itemMeta[PROGRESS].fields;assert.equal(Object.prototype.hasOwnProperty.call(fields,'__proto__'),true);assert.deepEqual(plain(fields.__proto__),record);assert.equal(fields.polluted,undefined);assert.equal(h.save(h.load()),true);assert.deepEqual(plain(h.load().itemMeta[PROGRESS].fields.__proto__),record);
  });
  await test('failed state writes and failed migration leave every existing stored byte intact',()=>{
    const h=harness(sample()),before=h.raw(),progress=h.storage.getItem(PROGRESS);h.storage.fail=true;const next=h.load();next.revision++;assert.equal(h.save(next),false);assert.equal(h.raw(),before);assert.equal(h.storage.getItem(PROGRESS),progress);
    const state=sample(),blocked=harness(state,{failBeforeCodec:true});assert.equal(blocked.raw(),JSON.stringify(state));assert.deepEqual(plain(blocked.load()),state);assert.equal(blocked.storage.getItem(PROGRESS),'{"q1":{"correct":1}}');
  });
  await test('invalid packed clocks block overwriting the original state and preserve learning progress',()=>{
    const h=harness(sample()),raw=JSON.parse(h.raw()),progress=h.storage.getItem(PROGRESS);raw.itemMeta[PROGRESS].fields[h.api.MARKER]=[['part'],['2026-10-22'],[[[99],0,0]]];h.storage.setItem(STATE,JSON.stringify(raw));const before=h.raw(),loaded=h.load();assert.equal(loaded.enabled,false);assert.match(h.s.driveSyncLastError,/기존 기록/);assert.equal(h.save(loaded),false);assert.equal(h.raw(),before);assert.equal(h.storage.getItem(PROGRESS),progress);
  });
  await test('remote sync payloads use expanded metadata and exclude the local state key',async()=>{
    const state=sample(),h=harness(state);vm.runInContext(sync,h.s);await h.s.driveSyncOnce();assert.ok(h.uploaded);assert.equal(h.uploaded.items[STATE],undefined);assert.equal(h.uploaded.itemMeta[PROGRESS].fields[h.api.MARKER],undefined);assert.deepEqual(h.uploaded.itemMeta,state.itemMeta);assert.ok(JSON.parse(h.raw()).itemMeta[PROGRESS].fields[h.api.MARKER]);
  });
  await test('thirty thousand field clocks save at least seventy percent of UTF-16 storage',()=>{
    const state=sample(30000,37),h=harness(),expanded=JSON.stringify(state),packed=JSON.stringify(h.api.encode(state));assert.deepEqual(plain(h.api.decode(JSON.parse(packed))),state);assert.ok(packed.length<expanded.length*.30,`packed=${packed.length*2}, expanded=${expanded.length*2}`);console.log('STATE BUDGET '+JSON.stringify({fields:30000,expandedUTF16Bytes:expanded.length*2,packedUTF16Bytes:packed.length*2,reductionPercent:100*(1-packed.length/expanded.length)}));
  });
  console.log(`Drive local state codec v5.22: PASS (${passed} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
