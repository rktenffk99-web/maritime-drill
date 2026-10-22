'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ROOT=path.join(__dirname,'..'),STATE='md_drive_sync_state_v1',KEY='md_progress';
const html=fs.readFileSync(process.env.MD_DRIVE_TEST_INDEX||path.join(ROOT,'index.html'),'utf8');
const source=html.slice(html.indexOf('async function driveSyncFindRemoteFile(){'),html.indexOf('function driveSyncTime('));
const copy=value=>JSON.parse(JSON.stringify(value));
function harness(options={}){
  class Storage{
    constructor(){this.data=new Map()}
    get length(){return this.data.size}
    key(i){return [...this.data.keys()][i]||null}
    getItem(key){return this.data.has(key)?this.data.get(key):null}
    setItem(key,value){this.data.set(String(key),String(value))}
    removeItem(key){this.data.delete(String(key))}
  }
  const storage=new Storage(),files=options.files||new Map(),requests=[],calls={create:0,upload:0,apply:0,reload:0,list:0};
  let now=Date.parse('2026-10-22T00:00:00Z'),serial=0;
  const iso=()=>new Date(++now).toISOString();
  const load=()=>JSON.parse(storage.getItem(STATE));
  const save=state=>{storage.setItem(STATE,JSON.stringify(state));return true};
  const collect=()=>Object.fromEntries([...storage.data].filter(([key])=>key!==STATE&&key.startsWith('md_')));
  storage.setItem(KEY,JSON.stringify({q1:{correct:3,note:'항해 학습 기록'}}));
  storage.setItem(STATE,JSON.stringify({enabled:true,deviceId:'device-a',revision:1,localUpdatedAt:iso(),itemMeta:{}}));
  const h={options,files,storage,requests,calls,load,save,collect,
    addFile(id,body,size){const file={id,name:'maritime-drill-sync.json',modifiedTime:iso(),body};if(size!==undefined)file.size=size;files.set(id,file);return file},
    write(id){const value=JSON.parse(storage.getItem(KEY));value[id]={correct:1};storage.setItem(KEY,JSON.stringify(value))},
    async sync(){await s.driveSyncOnce({showNotice:true})},
    progress(){return JSON.parse(storage.getItem(KEY))},
    payload(){return {app:'Maritime Drill',updatedAt:iso(),revision:1,items:copy(collect()),itemMeta:{}}}
  };
  const response=value=>({json:async()=>copy(value)});
  const s={window:null,Storage,localStorage:storage,navigator:{onLine:true},currentMode:'home',
    console:{warn(){}},Date,JSON,Math,Object,Array,Set,Map,URLSearchParams,encodeURIComponent,
    location:{reload(){calls.reload++}},driveSyncOnce(){},driveSyncInstallStorageHooks(){},
    driveSyncLoadState:load,driveSyncSaveState:save,driveSyncRefreshPanel(){},driveSyncNowIso:iso,
    isManagedStorageKey:key=>key!==STATE&&key.startsWith('md_'),collectBackupItems:collect,
    driveSyncOriginalSetItem:null,driveSyncOriginalRemoveItem:null,driveSyncApplyingRemote:false,
    DRIVE_SYNC_FILE:'maritime-drill-sync.json',DRIVE_SYNC_STATE_KEY:STATE,
    driveSyncBusy:false,driveSyncLastError:'',driveSyncHasToken:()=>true,driveSyncRequestToken:async()=>{},
    driveSyncClearSessionToken(){},backupNotice(){},alert(){},BACKUP_SCHEMA_VERSION:1,APP_VERSION:'test',
    createAutomaticRestorePoint(){return true},
    applyBackupSnapshot(entries){calls.apply++;for(const key of Object.keys(collect()))storage.removeItem(key);for(const [key,value] of entries)storage.setItem(key,value)},
    async driveSyncFetch(url,request={}){
      requests.push({url,...request});
      if(request.method==='POST'){
        calls.create++;
        assert.match(url,/\/upload\/drive\/v3\/files\?uploadType=multipart/);
        assert.match(request.headers['Content-Type'],/^multipart\/related; boundary=/);
        const boundary=request.headers['Content-Type'].split('boundary=')[1];
        assert.ok(request.body.includes(String.fromCharCode(13,10,13,10)), 'MIME part headers use actual CRLF bytes');
        const parts=request.body.split('--'+boundary).slice(1,-1);
        assert.equal(parts.length,2,'one metadata part and one complete payload part');
        const json=part=>JSON.parse(part.slice(part.indexOf('\r\n\r\n')+4).trim());
        const metadata=json(parts[0]),payload=json(parts[1]);
        assert.equal(metadata.name,s.DRIVE_SYNC_FILE);assert.deepEqual(metadata.parents,['appDataFolder']);
        assert.equal(payload.app,'Maritime Drill');
        if(options.onCreate)await options.onCreate(h);
        if(options.createFails)throw new Error('create network failure');
        const file=h.addFile('created-'+(options.devicePrefix?options.devicePrefix+'-':'')+(++serial),JSON.stringify(payload),String(Buffer.byteLength(JSON.stringify(payload))));
        if(options.lostCreateResponse)throw new Error('response lost after successful create');
        return response({id:file.id,modifiedTime:file.modifiedTime});
      }
      if(request.method==='PATCH'){
        calls.upload++;
        const id=decodeURIComponent(new URL(url).pathname.split('/').pop());
        const file=files.get(id);assert.ok(file,'upload target exists');
        file.body=request.body;file.size=String(Buffer.byteLength(file.body));file.modifiedTime=iso();
        return response({id,modifiedTime:file.modifiedTime});
      }
      if(url.includes('alt=media')){
        const id=decodeURIComponent(new URL(url).pathname.split('/').pop()),file=files.get(id),body=file.body;
        if(options.downloadFails)throw new Error('download network failure');
        if(options.onDownload)await options.onDownload(h);
        return {text:async()=>body,json:async()=>JSON.parse(body)};
      }
      calls.list++;if(options.onList)await options.onList(h,calls.list);
      const listed=[...files.values()].map(({body,...file})=>file);if(options.reverseListing)listed.reverse();
      return response({files:listed});
    }
  };
  s.window=s;vm.createContext(s);vm.runInContext(source,s,{filename:'index.html Drive API functions'});
  for(const file of ['daily-storage.js','learning-integrity.js','drive-sync-v2.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),s,{filename:file});
  s.driveSyncInstallStorageHooks();h.s=s;return h;
}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name)}
(async()=>{
  await test('first save creates metadata and Korean learning JSON in one multipart request',async()=>{
    const h=harness();await h.sync();assert.equal(h.calls.create,1);assert.equal(h.calls.upload,0);assert.equal(h.files.size,1);
    const remote=JSON.parse([...h.files.values()][0].body);assert.equal(JSON.parse(remote.items[KEY]).q1.note,'항해 학습 기록');assert.equal(h.s.driveSyncLastError,'');
  });
  await test('failed first create leaves no orphan; next sync succeeds without local changes',async()=>{
    const h=harness({createFails:true}),before=h.collect();await h.sync();assert.equal(h.files.size,0);assert.deepEqual(h.collect(),before);
    h.options.createFails=false;await h.sync();assert.equal(h.files.size,1);assert.deepEqual(h.collect(),before);assert.equal(h.s.driveSyncLastError,'');
  });
  await test('lost create response still leaves a readable complete file for the next sync',async()=>{
    const h=harness({lostCreateResponse:true});await h.sync();assert.equal(h.files.size,1);h.options.lostCreateResponse=false;await h.sync();
    assert.equal(h.calls.create,1);assert.equal(h.s.driveSyncLastError,'');assert.equal(h.progress().q1.correct,3);
  });
  await test('equal-time duplicate files choose the same canonical ID in either listing order',async()=>{
    const files=new Map(),a=harness({files}),b=harness({files,reverseListing:true}),payload=a.payload();
    const left=a.addFile('file-a',JSON.stringify(payload),'200'),right=a.addFile('file-b',JSON.stringify(payload),'200');right.modifiedTime=left.modifiedTime;
    assert.equal((await a.s.driveSyncFindRemoteFile()).id,'file-a');assert.equal((await b.s.driveSyncFindRemoteFile()).id,'file-a');
  });
  await test('two devices creating concurrently re-find one canonical file and converge on later polls',async()=>{
    const files=new Map(),a=harness({files,devicePrefix:'A'}),b=harness({files,devicePrefix:'B',reverseListing:true});a.write('deviceA');b.write('deviceB');
    await Promise.all([a.sync(),b.sync()]);assert.equal(files.size,2);assert.notEqual(a.load().remoteFileId,b.load().remoteFileId);
    await a.sync();await b.sync();await a.sync();await b.sync();
    assert.equal(a.load().remoteFileId,b.load().remoteFileId);assert.ok(a.progress().deviceA);assert.ok(a.progress().deviceB);assert.ok(b.progress().deviceA);assert.ok(b.progress().deviceB);
    const canonical=JSON.parse(files.get(a.load().remoteFileId).body);assert.ok(JSON.parse(canonical.items[KEY]).deviceA);assert.ok(JSON.parse(canonical.items[KEY]).deviceB);assert.equal(a.s.driveSyncLastError,'');assert.equal(b.s.driveSyncLastError,'');
  });
  await test('a confirmed zero-byte legacy file recovers through a new complete file',async()=>{
    const h=harness(),before=h.collect();h.addFile('legacy-empty','','0');await h.sync();
    assert.equal(h.calls.create,1);assert.equal(h.calls.upload,0);assert.equal(h.files.get('legacy-empty').body,'');
    assert.equal(h.load().remoteFileId,'created-1');assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
    await h.sync();assert.equal(h.calls.create,1);assert.equal(h.s.driveSyncLastError,'');
  });
  await test('an existing full snapshot is preferred over a newer zero-byte orphan',async()=>{
    const h=harness(),remote=h.payload();remote.items.md_other_device='"retained"';h.addFile('full',JSON.stringify(remote),'200');h.addFile('newer-empty','','0');
    await h.sync();assert.equal(h.calls.create,0);assert.equal(h.storage.getItem('md_other_device'),'"retained"');assert.equal(h.load().remoteFileId,'full');
  });
  await test('recovery rechecks candidates and merges a full file created during the empty download',async()=>{
    const h=harness({onDownload(h){if(h.files.has('other-device'))return;const payload=h.payload();payload.items.md_other_device='"preserved"';h.addFile('other-device',JSON.stringify(payload),'200')}});h.addFile('empty','','0');
    await h.sync();assert.equal(h.calls.create,0);assert.equal(h.storage.getItem('md_other_device'),'"preserved"');assert.equal(h.load().remoteFileId,'other-device');assert.equal(h.s.driveSyncLastError,'');
  });
  await test('recovery rechecks the same file if another device filled it during the empty download',async()=>{
    const h=harness({onDownload(h){const file=h.files.get('empty');if(file.size!=='0')return;const payload=h.payload();payload.items.md_other_device='"preserved"';file.body=JSON.stringify(payload);file.size=String(Buffer.byteLength(file.body))}});h.addFile('empty','','0');
    await h.sync();assert.equal(h.calls.create,0);assert.equal(h.storage.getItem('md_other_device'),'"preserved"');assert.equal(h.load().remoteFileId,'empty');assert.equal(h.s.driveSyncLastError,'');
  });
  await test('unknown-size and nonzero-size empty responses are never replaced',async()=>{
    for(const size of [undefined,'1',null,'invalid']){
      const h=harness(),before=h.collect();h.addFile('unknown','',size);await h.sync();assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.deepEqual(h.collect(),before);assert.match(h.s.driveSyncLastError,/비어/);
    }
  });
  await test('malformed nonempty content is preserved even if metadata claims zero bytes',async()=>{
    for(const body of ['{broken','null',' ','{"app":"other","items":{}}']){
      const h=harness(),before=h.collect();h.addFile('corrupt',body,'0');await h.sync();assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.equal(h.files.get('corrupt').body,body);assert.deepEqual(h.collect(),before);assert.ok(h.s.driveSyncLastError);
    }
  });
  await test('download failures are not mistaken for an empty-file recovery condition',async()=>{
    const h=harness({downloadFails:true}),before=h.collect();h.addFile('empty','','0');await h.sync();assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.deepEqual(h.collect(),before);assert.match(h.s.driveSyncLastError,/download network failure/);
  });
  await test('answers written while recovery creates a remote file survive and later converge',async()=>{
    const h=harness({onCreate:h=>h.write('duringCreate')});h.addFile('empty','','0');await h.sync();assert.ok(h.progress().duringCreate);assert.ok(h.load().itemMeta[KEY].fields['duringCreate/correct']);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
    h.options.onCreate=null;await h.sync();assert.ok(JSON.parse(JSON.parse(h.files.get('created-1').body).items[KEY]).duringCreate);
  });
  await test('disconnect during an empty download cancels recovery creation',async()=>{
    const h=harness({onDownload(h){const state=h.load();state.enabled=false;h.save(state)}});h.addFile('empty','','0');await h.sync();assert.equal(h.calls.create,0);assert.equal(h.load().enabled,false);assert.equal(h.calls.apply,0);
  });
  await test('disconnect during recovery creation cannot re-enable sync or apply stale data',async()=>{
    const h=harness({onCreate(h){const state=h.load();state.enabled=false;h.save(state)}}),before=h.collect();h.addFile('empty','','0');await h.sync();assert.equal(h.load().enabled,false);assert.deepEqual(h.collect(),before);assert.equal(h.calls.apply,0);assert.equal(h.calls.reload,0);
  });
  await test('disconnect during recovery candidate recheck cancels every subsequent write',async()=>{
    const h=harness({onList(h,count){if(count===2){const state=h.load();state.enabled=false;h.save(state)}}});h.addFile('empty','','0');await h.sync();assert.equal(h.calls.create,0);assert.equal(h.calls.upload,0);assert.equal(h.load().enabled,false);
  });
  await test('failed recovery creation preserves local data and succeeds on a later retry',async()=>{
    const h=harness({createFails:true}),before=h.collect();h.addFile('empty','','0');await h.sync();assert.equal(h.files.size,1);assert.deepEqual(h.collect(),before);
    h.options.createFails=false;await h.sync();assert.equal(h.files.size,2);assert.deepEqual(h.collect(),before);assert.equal(h.s.driveSyncLastError,'');
  });
  await test('new mastery fields and derived question keys survive a newer legacy snapshot',()=>{
    const h=harness(),key='md_nav23_pass_progress_v1',id='navi2|q-original~v-0123456789abcdef',modern={reviewScheduleVersion:1,reviewStage:3,reviewSuccessDate:'2026-10-22',reviewLapseDate:'2026-10-01',recentOutcomes:[{date:'2026-10-22',outcome:'sure',mode:'homework'}]};
    const local={[key]:JSON.stringify({[id]:modern})},remote={[key]:JSON.stringify({[id]:{attempts:1,correct:1,wrong:0,lastDate:'2026-10-23'},'navi2|q-original':{attempts:5,correct:5,wrong:0}})};
    const result=JSON.parse(h.s.__mdDriveSyncV2.mergeSnapshots(local,remote,{},{},'2026-10-22T00:00:00Z','2026-10-23T00:00:00Z').items[key]);
    for(const field of Object.keys(modern))assert.deepEqual(result[id][field],modern[field]);assert.equal(result[id].attempts,1);assert.equal(result['navi2|q-original'].attempts,5);
  });
  await test('a newer lapse keeps its stage zero and coherent dates instead of restoring older mastery',()=>{
    const h=harness(),key='md_nav23_pass_progress_v1',q='navi2|q-stage';
    const old={reviewScheduleVersion:1,reviewStage:4,reviewSuccessDate:'2026-10-21',reviewLapseDate:null,mastered:true,status:'mastered',dueDate:'2026-11-11',sameDayConfirmedDate:'2026-10-21'};
    const lapse={...old,reviewStage:0,reviewSuccessDate:null,reviewLapseDate:'2026-10-22',mastered:false,status:'weak',dueDate:'2026-10-22',sameDayConfirmedDate:null};
    const fields={};for(const field of Object.keys(lapse))fields[encodeURIComponent(q)+'/'+field]={updatedAt:'2026-10-22T02:00:00Z',deleted:false};
    const modernMeta={[key]:{updatedAt:'2026-10-22T02:00:00Z',fields}},a={[key]:JSON.stringify({[q]:lapse})},b={[key]:JSON.stringify({[q]:old})};
    const result=h.s.__mdPassProgressStorage.hydrate(JSON.parse(h.s.__mdDriveSyncV2.mergeSnapshots(a,b,modernMeta,{},'2026-10-22T02:00:00Z','2026-10-21T02:00:00Z').items[key]))[q];for(const field of Object.keys(lapse))assert.deepEqual(result[field],lapse[field]);
  });
  await test('identified concurrent evidence survives union while lifetime counters still add each device once',()=>{
    const h=harness(),key='md_nav23_pass_progress_v1',q='navi2|q-events',base={attempts:0,correct:0,wrong:0};
    const row=(device,outcome,hour)=>({_counterVersion:1,_counterBase:base,_counterComponents:{[device]:{correct:outcome==='sure'?1:0,wrong:outcome==='wrong'?1:0}},recentOutcomes:[{evidenceId:device+'|1',at:'2026-10-22T'+hour+':00:00Z',date:'2026-10-22',outcome,mode:device==='A'?'homework':'predictive-mock'}]});
    const a={[key]:JSON.stringify({[q]:row('A','sure','01')})},b={[key]:JSON.stringify({[q]:row('B','wrong','02')})};
    const merge=(a,b)=>h.s.__mdDriveSyncV2.mergeSnapshots(a,b,{},{},'2026-10-22T03:00:00Z','2026-10-22T03:00:00Z');
    const once=merge(a,b),reverse=merge(b,a),result=JSON.parse(once.items[key])[q];assert.deepEqual(JSON.parse(once.items[key]),JSON.parse(reverse.items[key]));assert.equal(result.attempts,2);assert.equal(result.correct,1);assert.equal(result.wrong,1);assert.equal(result.recentOutcomes.length,2);assert.deepEqual(result.recentOutcomes.map(e=>e.evidenceId),['A|1','B|1']);
    const twice=merge(once.items,b);assert.deepEqual(JSON.parse(twice.items[key]),JSON.parse(once.items[key]));assert.equal(JSON.parse(twice.items[key])[q].attempts,2);
  });
  await test('recent evidence union retains the latest twenty deterministically without mutating inputs',()=>{
    const h=harness(),key='md_other_evidence',q='navi2|q-window',entry=n=>({evidenceId:'event-'+String(n).padStart(2,'0'),at:new Date(Date.parse('2026-10-22T00:00:00Z')+n*1000).toISOString(),date:'2026-10-22',outcome:n%2?'sure':'wrong',mode:'homework'});
    const a={[key]:JSON.stringify({[q]:{recentOutcomes:Array.from({length:20},(_,i)=>entry(i))}})},b={[key]:JSON.stringify({[q]:{recentOutcomes:Array.from({length:20},(_,i)=>entry(i+10))}})},before=JSON.stringify([a,b]);
    const m=h.s.__mdDriveSyncV2.mergeSnapshots(a,b,{},{},'2026-10-22T01:00:00Z','2026-10-22T02:00:00Z'),events=JSON.parse(m.items[key])[q].recentOutcomes;
    assert.equal(events.length,20);assert.equal(events[0].evidenceId,'event-10');assert.equal(events[19].evidenceId,'event-29');assert.equal(JSON.stringify([a,b]),before);
    const reverse=h.s.__mdDriveSyncV2.mergeSnapshots(b,a,{},{},'2026-10-22T02:00:00Z','2026-10-22T01:00:00Z');assert.deepEqual(reverse.items,m.items);
  });
  await test('legacy evidence preserves the preferred sequence and modern evidence is added once',()=>{
    const h=harness(),key='md_nav23_pass_progress_v1',q='navi2|q-legacy-events',legacy={date:'2026-10-21',outcome:'sure',mode:'homework'},modern={evidenceId:'A|modern',at:'2026-10-22T01:00:00Z',date:'2026-10-22',outcome:'wrong',mode:'homework'};
    const a={[key]:JSON.stringify({[q]:{recentOutcomes:[legacy,modern]}})},b={[key]:JSON.stringify({[q]:{recentOutcomes:[legacy,legacy]}})};
    const m=h.s.__mdDriveSyncV2.mergeSnapshots(a,b,{},{},'2026-10-22T01:00:00Z','2026-10-22T02:00:00Z'),events=JSON.parse(m.items[key])[q].recentOutcomes;
    assert.equal(events.length,3);assert.deepEqual(events.slice(0,2),[legacy,legacy]);assert.deepEqual(events[2],modern);
  });
  await test('same-day legacy sequence retains numeric occurrence order beyond ten entries',()=>{
    const h=harness(),key='md_other_evidence',q='navi2|q-legacy-order',legacy=Array.from({length:12},(_,i)=>({date:'2026-10-21',outcome:i%2?'sure':'wrong',mode:'legacy-'+i})),modern={evidenceId:'new',at:'2026-10-22T01:00:00Z',date:'2026-10-22',outcome:'sure',mode:'homework'};
    const a={[key]:JSON.stringify({[q]:{recentOutcomes:[modern]}})},b={[key]:JSON.stringify({[q]:{recentOutcomes:legacy}})};
    const m=h.s.__mdDriveSyncV2.mergeSnapshots(a,b,{},{},'2026-10-22T01:00:00Z','2026-10-22T02:00:00Z');assert.deepEqual(JSON.parse(m.items[key])[q].recentOutcomes,[...legacy,modern]);
  });
  await test('sparse lapse defaults cannot resurrect older remote mastery during merge',()=>{
    const h=harness(),key='md_nav23_pass_progress_v1',q='navi2|q-sparse',sparse={_storage:1,reviewScheduleVersion:1,status:'weak',reviewLapseDate:'2026-10-22',lastDate:'2026-10-22',lastOutcome:'wrong'},old={reviewScheduleVersion:1,status:'mastered',mastered:true,reviewStage:4,reviewSuccessDate:'2026-10-21',reviewLapseDate:null};
    const fields={};for(const field of ['status','mastered','reviewStage','reviewSuccessDate','reviewLapseDate'])fields[encodeURIComponent(q)+'/'+field]={updatedAt:'2026-10-22T02:00:00Z',deleted:['mastered','reviewStage','reviewSuccessDate'].includes(field)};
    const m=h.s.__mdDriveSyncV2.mergeSnapshots({[key]:JSON.stringify({[q]:sparse})},{[key]:JSON.stringify({[q]:old})},{[key]:{updatedAt:'2026-10-22T02:00:00Z',fields}},{},'2026-10-22T02:00:00Z','2026-10-21T02:00:00Z');
    const saved=JSON.parse(m.items[key])[q],loaded=h.s.__mdPassProgressStorage.hydrate({[q]:saved})[q];assert.equal(saved._storage,1);assert.equal(saved.mastered,undefined);assert.equal(saved.reviewStage,undefined);assert.equal(loaded.mastered,false);assert.equal(loaded.reviewStage,0);assert.equal(loaded.reviewSuccessDate,null);assert.equal(loaded.reviewLapseDate,'2026-10-22');
  });
  console.log(`Drive recovery v5.22 tests: PASS (${count} cases)`);
})().catch(error=>{console.error(error);process.exitCode=1});
