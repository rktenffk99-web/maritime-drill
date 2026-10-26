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
  await test('per-key reads expand only the edited key and header reads omit field metadata',()=>{
    const state=sample(),key='md_past_checkpoint_v2';state.itemMeta[key]={fields:{'state/idx':{updatedAt:'2026-10-22',deleted:false}},custom:'keep'};
    const h=harness(state),before=JSON.parse(h.raw()),loaded=h.api.loadForKey(key),header=h.api.loadHeader();
    assert.deepEqual(plain(loaded.itemMeta[PROGRESS]),before.itemMeta[PROGRESS]);assert.ok(loaded.itemMeta[PROGRESS].fields[h.api.MARKER]);
    assert.deepEqual(plain(loaded.itemMeta[key]),state.itemMeta[key]);assert.equal(header.itemMeta,undefined);assert.equal(header.enabled,state.enabled);assert.equal(header.revision,state.revision);assert.deepEqual(plain(header.extraSetting),state.extraSetting);
    loaded.itemMeta[key].fields['state/idx']={updatedAt:'2026-10-23',deleted:false};loaded.revision++;
    assert.equal(h.api.saveForKey(loaded,key),true);assert.deepEqual(JSON.parse(h.raw()).itemMeta[PROGRESS],before.itemMeta[PROGRESS]);
    state.itemMeta[key].fields['state/idx']=plain(loaded.itemMeta[key].fields['state/idx']);state.revision++;assert.deepEqual(plain(h.load()),state);
  });
  await test('per-key writes preserve old flat tuples, unknown records and older-tab raw siblings',()=>{
    const h=harness(sample()),key='md_past_progress_v1',raw=JSON.parse(h.raw()),first=Object.keys(sample().itemMeta[PROGRESS].fields)[0];
    raw.itemMeta[PROGRESS].fields[first]={updatedAt:'2026-10-23T00:00:00Z',deleted:true,reason:'old tab'};
    raw.itemMeta[PROGRESS].fields['new/path']=null;
    raw.itemMeta.oldFormat={fields:{[h.api.MARKER]:[['q','a','b'],['2026-10-22'],[[[0,1],0,1],[[0,2],{unknown:['retained']}]]],'q/a':{updatedAt:'2026-10-24',deleted:false}},unknown:{keep:true}};
    raw.itemMeta[key]={fields:{'state/idx':{updatedAt:'2026-10-22',deleted:false}}};h.storage.setItem(STATE,JSON.stringify(raw));
    const loaded=h.api.loadForKey(key);loaded.itemMeta[key].fields['state/idx'].updatedAt='2026-10-25';
    assert.equal(h.api.saveForKey(loaded,key),true);const saved=JSON.parse(h.raw());
    assert.deepEqual(saved.itemMeta[PROGRESS],raw.itemMeta[PROGRESS]);assert.deepEqual(saved.itemMeta.oldFormat,raw.itemMeta.oldFormat);
    const target=h.api.loadForKey(PROGRESS);assert.deepEqual(plain(target.itemMeta[PROGRESS].fields[first]),raw.itemMeta[PROGRESS].fields[first]);assert.equal(target.itemMeta[PROGRESS].fields['new/path'],null);
    const expected=plain(h.api.decode(saved));assert.equal(h.api.saveForKey(target,PROGRESS),true);assert.deepEqual(plain(h.load()),expected);
  });
  await test('per-key reads see another tab latest clocks without a stale cache',()=>{
    const h=harness(sample()),key='md_past_checkpoint_v2';h.api.loadForKey(key);h.api.loadHeader();
    const latest=JSON.parse(h.raw());latest.revision=42;latest.enabled=false;latest.remoteFileId='other-tab-file';latest.itemMeta[PROGRESS].history.other={updatedAt:'2026-10-24',deleted:true};
    latest.itemMeta[key]={fields:{'':{updatedAt:'2026-10-24',deleted:false}}};h.storage.setItem(STATE,JSON.stringify(latest));
    const loaded=h.api.loadForKey(key);assert.equal(loaded.revision,42);assert.equal(h.api.loadHeader().enabled,false);loaded.itemMeta[key].fields.idx={updatedAt:'2026-10-25',deleted:false};
    assert.equal(h.api.saveForKey(loaded,key),true);const saved=JSON.parse(h.raw());assert.equal(saved.remoteFileId,'other-tab-file');assert.deepEqual(saved.itemMeta[PROGRESS],latest.itemMeta[PROGRESS]);
  });
  await test('every malformed packed shape in an unrelated key blocks header and per-key saves',()=>{
    const badEncodings=[null,[],[['p'],[],{}],[[1],[],[]],[['p'],[1],[]],[['p'],[],[{}]],[['p'],[],[[[0]]]],[['p'],[],[[[1],{}]]],[['p'],[],[[[0.5],{}]]],[['p'],[],[[[0],0,0]]],[['p'],['t'],[[[0],0,2]]],[['p'],['t'],[[[0],0,0,null]]],[['p'],['t'],[[[0],0,0,[1]]]]];
    for(const encoded of badEncodings){
      const h=harness(sample()),good=h.raw(),raw=JSON.parse(good),progress=h.storage.getItem(PROGRESS),key='md_past_checkpoint_v2';raw.itemMeta[PROGRESS].fields[h.api.MARKER]=encoded;h.storage.setItem(STATE,JSON.stringify(raw));
      const before=h.raw(),header=h.api.loadHeader(),loaded=h.api.loadForKey(key);assert.equal(header.enabled,false);assert.equal(loaded.enabled,false);assert.match(h.s.driveSyncLastError,/기존 기록/);
      assert.equal(h.api.saveForKey(loaded,key),false);assert.equal(h.save(sample()),false);assert.equal(h.raw(),before);assert.equal(h.storage.getItem(PROGRESS),progress);
      h.storage.setItem(STATE,good);assert.equal(h.api.loadHeader().enabled,true);assert.equal(h.api.saveForKey(loaded,key),false);assert.equal(h.api.saveForKey(h.api.loadForKey(key),key),true);
    }
  });
  await test('per-key write failures retain all stored bytes and can retry after recovery',()=>{
    const h=harness(sample()),before=h.raw(),progress=h.storage.getItem(PROGRESS),loaded=h.api.loadForKey(PROGRESS);loaded.revision++;loaded.itemMeta[PROGRESS].fields['retry/path']={updatedAt:'2026-10-24',deleted:true};
    h.storage.fail=true;assert.equal(h.api.saveForKey(loaded,PROGRESS),false);assert.equal(h.raw(),before);assert.equal(h.storage.getItem(PROGRESS),progress);
    h.storage.fail=false;assert.equal(h.api.saveForKey(loaded,PROGRESS),true);assert.equal(h.load().itemMeta[PROGRESS].fields['retry/path'].deleted,true);
  });
  await test('local storage hooks persist edits and tombstones immediately without decoding unrelated keys',()=>{
    const state=sample(),key='md_past_checkpoint_v2',h=harness(state),other=JSON.parse(h.raw()).itemMeta[PROGRESS];h.storage.setItem(key,'{"state":{"idx":0,"old":true}}');vm.runInContext(sync,h.s);h.s.driveSyncInstallStorageHooks();
    h.s.driveSyncLoadState=()=>{throw new Error('local key edit must not fully decode state')};h.s.driveSyncSaveState=()=>{throw new Error('local key edit must not fully encode state')};
    h.storage.setItem(key,'{"state":{"idx":1}}');let saved=JSON.parse(h.raw());assert.equal(saved.revision,state.revision+1);assert.deepEqual(saved.itemMeta[PROGRESS],other);assert.equal(saved.itemMeta[key].fields['state/old'].deleted,true);assert.equal(saved.itemMeta[key].fields['state/idx'].deleted,false);assert.equal(saved.itemMeta[key].updatedAt,'2026-10-22T01:00:00Z');assert.equal(h.storage.getItem(key),'{"state":{"idx":1}}');
    h.storage.removeItem(key);saved=JSON.parse(h.raw());assert.equal(saved.revision,state.revision+2);assert.equal(saved.itemMeta[key].deleted,true);assert.deepEqual(saved.itemMeta[key].fields,{});assert.deepEqual(saved.itemMeta[PROGRESS],other);assert.equal(h.storage.getItem(key),null);
  });
  await test('remote sync after a per-key local edit still uploads fully expanded clocks',async()=>{
    const h=harness(sample()),key='md_past_checkpoint_v2';vm.runInContext(sync,h.s);h.s.driveSyncInstallStorageHooks();h.storage.setItem(key,'{"state":{"idx":1}}');const expected=plain(h.load().itemMeta);await h.s.driveSyncOnce();
    assert.ok(h.uploaded);assert.deepEqual(h.uploaded.itemMeta,expected);assert.equal(JSON.stringify(h.uploaded).includes('md-fields-v1'),false);assert.equal(h.uploaded.items[key],'{"state":{"idx":1}}');
  });
  await test('remote sync payloads use expanded metadata and exclude the local state key',async()=>{
    const state=sample(),h=harness(state);vm.runInContext(sync,h.s);await h.s.driveSyncOnce();assert.ok(h.uploaded);assert.equal(h.uploaded.items[STATE],undefined);assert.equal(h.uploaded.itemMeta[PROGRESS].fields[h.api.MARKER],undefined);assert.deepEqual(h.uploaded.itemMeta,state.itemMeta);assert.ok(JSON.parse(h.raw()).itemMeta[PROGRESS].fields[h.api.MARKER]);
  });
  await test('thirty thousand field clocks save at least seventy percent of UTF-16 storage',()=>{
    const state=sample(30000,37),h=harness(),expanded=JSON.stringify(state),packed=JSON.stringify(h.api.encode(state));assert.deepEqual(plain(h.api.decode(JSON.parse(packed))),state);assert.ok(packed.length<expanded.length*.30,`packed=${packed.length*2}, expanded=${expanded.length*2}`);console.log('STATE BUDGET '+JSON.stringify({fields:30000,expandedUTF16Bytes:expanded.length*2,packedUTF16Bytes:packed.length*2,reductionPercent:100*(1-packed.length/expanded.length)}));
  });
  console.log(`Drive local state codec v5.22: PASS (${passed} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
