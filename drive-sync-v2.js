// ── v5.09: Google Drive cross-device merge sync ──
// v5.08 compared one whole-browser timestamp and replaced the complete snapshot.
// This patch keeps per-field modification metadata and merges JSON objects recursively,
// so independent progress made on a notebook and a phone converges instead of overwriting.
(function(){
  'use strict';
  if(typeof driveSyncOnce!=='function' || typeof driveSyncLoadState!=='function' || typeof isManagedStorageKey!=='function') return;

  const SYNC_V2_MAX_FIELD_META=30000;

  function mdSyncIsPlainObject(value){
    return !!value && typeof value==='object' && !Array.isArray(value);
  }
  function mdSyncParse(raw){
    if(typeof raw!=='string') return {json:false,value:raw};
    try{return {json:true,value:JSON.parse(raw)}}catch(e){return {json:false,value:raw}}
  }
  function mdSyncStable(value){
    if(value===undefined) return 'undefined';
    if(value===null || typeof value!=='object') return JSON.stringify(value);
    if(Array.isArray(value)) return '['+value.map(mdSyncStable).join(',')+']';
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+mdSyncStable(value[k])).join(',')+'}';
  }
  function mdSyncSame(a,b){
    if(a===b) return true;
    return mdSyncStable(a)===mdSyncStable(b);
  }
  function mdSyncPath(parts){
    return parts.map(part=>encodeURIComponent(String(part))).join('/');
  }
  function mdSyncRecordTime(record,fallback){
    const raw=record&&record.updatedAt;
    const n=Date.parse(raw||fallback||'');
    return Number.isFinite(n)?n:0;
  }
  function mdSyncNewRecord(now,deleted){
    return {updatedAt:now,deleted:!!deleted};
  }
  function mdSyncNormalizeKeyMeta(meta){
    const result=mdSyncIsPlainObject(meta)?Object.assign({},meta):{};
    result.fields=mdSyncIsPlainObject(result.fields)?Object.assign({},result.fields):{};
    result.history=mdSyncIsPlainObject(result.history)?Object.assign({},result.history):{};
    return result;
  }
  function mdSyncGeneration(meta){
    const generation=meta&&meta.generation;
    return mdSyncIsPlainObject(generation)&&typeof generation.id==='string'&&mdSyncRecordTime(generation)>0?generation:null;
  }
  function mdSyncCompareGenerations(localMeta,remoteMeta){
    const local=mdSyncGeneration(localMeta),remote=mdSyncGeneration(remoteMeta);
    if(!local&&!remote)return 0;
    if(!local)return -1;
    if(!remote)return 1;
    const delta=mdSyncRecordTime(local)-mdSyncRecordTime(remote);
    if(delta)return delta>0?1:-1;
    const left=mdSyncStable(local),right=mdSyncStable(remote);
    return left===right?0:left>right?1:-1;
  }
  function mdSyncNewGeneration(now,previousMeta){
    const id=typeof driveSyncNewDeviceId==='function'?driveSyncNewDeviceId():
      Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    const previous=mdSyncRecordTime(mdSyncGeneration(previousMeta));
    return {updatedAt:new Date(Math.max(Date.parse(now)||0,previous+1)).toISOString(),id};
  }
  function mdSyncIsFocusHistoryKey(key){return /^md_focus_history_/.test(key)}
  function mdSyncHistorySessionId(entry){
    if(!mdSyncIsPlainObject(entry))return 'legacy:'+mdSyncStable(entry);
    if(typeof entry.sessionId==='string'&&entry.sessionId)return entry.sessionId;
    // Old records have no immutable ID. Timestamp, subject and question IDs
    // distinguish independent sets without relying on conflicting Day numbers.
    const ids=Array.isArray(entry.ids)?entry.ids.map(String).sort():[];
    return 'legacy:'+mdSyncStable([entry.ts,entry.subjectId||'',ids]);
  }
  function mdSyncHistoryId(entry){return 'session:'+mdSyncHistorySessionId(entry)}
  function mdSyncNormalizeHistoryWrite(key,oldRaw,newRaw){
    if(!mdSyncIsFocusHistoryKey(key)||driveSyncApplyingRemote)return newRaw;
    const oldParsed=mdSyncParse(oldRaw),nextParsed=mdSyncParse(newRaw);
    if(!nextParsed.json||!Array.isArray(nextParsed.value))return newRaw;
    const previous=Array.isArray(oldParsed.value)?oldParsed.value:[];
    let changed=false;
    const entries=nextParsed.value.map(entry=>{
      if(!mdSyncIsPlainObject(entry)||typeof entry.sessionId==='string'&&entry.sessionId)return entry;
      const ids=mdSyncStable(Array.isArray(entry.ids)?entry.ids.map(String).sort():[]);
      // A legacy replay updates ts but retains Day and the original question
      // set. Promote that existing identity instead of creating a second set.
      const candidates=previous.filter(candidate=>mdSyncIsPlainObject(candidate)&&
        (candidate.subjectId||'')===(entry.subjectId||'')&&
        mdSyncStable(Array.isArray(candidate.ids)?candidate.ids.map(String).sort():[])===ids);
      const exact=candidates.find(candidate=>candidate.ts===entry.ts);
      const replay=entry.dayNum===undefined?[]:candidates.filter(candidate=>candidate.dayNum===entry.dayNum);
      // Different devices can independently use the same Day number and
      // question set. Preserve unchanged timestamps first, and only infer a
      // replay identity when the old session is unambiguous.
      const prior=exact||(replay.length===1?replay[0]:null);
      changed=true;return Object.assign({},entry,{sessionId:mdSyncHistorySessionId(prior||entry)});
    });
    return changed?JSON.stringify(entries):newRaw;
  }
  function mdSyncTouchHistory(oldValue,newValue,meta,now){
    if(!Array.isArray(newValue))return;
    const previous=new Map((Array.isArray(oldValue)?oldValue:[]).map(entry=>[mdSyncHistoryId(entry),entry]));
    const next=new Map(newValue.map(entry=>[mdSyncHistoryId(entry),entry]));
    for(const id of previous.keys())if(!next.has(id))meta.history[id]=mdSyncNewRecord(now,true);
    for(const [id,entry] of next)if(!previous.has(id)||!mdSyncSame(previous.get(id),entry))meta.history[id]=mdSyncNewRecord(now,false);
    meta.history=mdSyncTrimFields(meta.history);
  }
  function mdSyncTrimFields(fields){
    const keys=Object.keys(fields||{});
    if(keys.length<=SYNC_V2_MAX_FIELD_META) return fields||{};
    keys.sort((a,b)=>mdSyncRecordTime(fields[b])-mdSyncRecordTime(fields[a]));
    const kept={};
    for(const key of keys.slice(0,SYNC_V2_MAX_FIELD_META)) kept[key]=fields[key];
    return kept;
  }
  function mdSyncDiff(oldValue,newValue,path,fields,now){
    if(mdSyncSame(oldValue,newValue)) return;
    const oldObj=mdSyncIsPlainObject(oldValue),newObj=mdSyncIsPlainObject(newValue);
    if(oldObj&&newObj){
      const keys=new Set([...Object.keys(oldValue),...Object.keys(newValue)]);
      for(const key of keys){
        const child=path.concat(key),p=mdSyncPath(child);
        const oldHas=Object.prototype.hasOwnProperty.call(oldValue,key);
        const newHas=Object.prototype.hasOwnProperty.call(newValue,key);
        if(!newHas){ fields[p]=mdSyncNewRecord(now,true); continue; }
        if(!oldHas){
          if(mdSyncIsPlainObject(newValue[key])) mdSyncDiff({},newValue[key],child,fields,now);
          else fields[p]=mdSyncNewRecord(now,false);
          continue;
        }
        mdSyncDiff(oldValue[key],newValue[key],child,fields,now);
      }
      return;
    }
    fields[mdSyncPath(path)]=mdSyncNewRecord(now,false);
  }
  function mdSyncTouchKey(key,oldRaw,newRaw,deleted){
    if(driveSyncApplyingRemote) return;
    const state=driveSyncLoadState();
    const now=driveSyncNowIso();
    const itemMeta=mdSyncIsPlainObject(state.itemMeta)?Object.assign({},state.itemMeta):{};
    const keyMeta=mdSyncNormalizeKeyMeta(itemMeta[key]);
    keyMeta.updatedAt=now;
    keyMeta.deleted=!!deleted;
    if(deleted){
      keyMeta.fields={};
    }else{
      const oldParsed=mdSyncParse(oldRaw),newParsed=mdSyncParse(newRaw);
      if(mdSyncIsFocusHistoryKey(key)&&newParsed.json)mdSyncTouchHistory(oldParsed.value,newParsed.value,keyMeta,now);
      if(oldParsed.json&&newParsed.json){
        mdSyncDiff(oldParsed.value,newParsed.value,[],keyMeta.fields,now);
      }else if(oldRaw!==newRaw){
        keyMeta.fields['']=mdSyncNewRecord(now,false);
      }
      keyMeta.fields=mdSyncTrimFields(keyMeta.fields);
    }
    itemMeta[key]=keyMeta;
    state.itemMeta=itemMeta;
    state.localUpdatedAt=now;
    state.revision=(Number(state.revision)||0)+1;
    driveSyncSaveState(state);
    driveSyncRefreshPanel();
  }
  function mdSyncResetKey(key,value,label){
    const k=String(key),raw=String(value);
    if(!isManagedStorageKey(k))return false;
    const before=driveSyncLoadState(),state=Object.assign({},before),now=driveSyncNowIso();
    state.itemMeta=Object.assign({},before.itemMeta||{});
    state.itemMeta[k]={updatedAt:now,deleted:false,generation:mdSyncNewGeneration(now,state.itemMeta[k]),fields:{'':mdSyncNewRecord(now,false)},history:{}};
    state.localUpdatedAt=now;state.revision=(Number(state.revision)||0)+1;
    // Save the reset generation first. A failed metadata write must leave the
    // old learning records intact. Neither write yields to this tab's sync loop.
    if(!driveSyncSaveState(state)){
      if(typeof showStorageWarning==='function')showStorageWarning(label||'학습 진도 초기화',new Error('초기화 상태를 저장하지 못했습니다.'));
      return false;
    }
    try{
      const set=driveSyncOriginalSetItem||Storage.prototype.setItem;
      set.call(localStorage,k,raw);
    }catch(error){
      driveSyncSaveState(before);
      if(typeof showStorageWarning==='function')showStorageWarning(label||'학습 진도 초기화',error);
      return false;
    }
    driveSyncRefreshPanel();return true;
  }

  // Replace the v5.08 hooks before driveSyncInit() runs.
  driveSyncInstallStorageHooks=function(){
    if(driveSyncOriginalSetItem) return;
    driveSyncOriginalSetItem=Storage.prototype.setItem;
    driveSyncOriginalRemoveItem=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(key,value){
      const k=String(key);
      let oldValue=null;
      try{if(this===localStorage) oldValue=this.getItem(k);}catch(e){}
      const nextValue=this===localStorage?mdSyncNormalizeHistoryWrite(k,oldValue,String(value)):value;
      const result=driveSyncOriginalSetItem.call(this,key,nextValue);
      try{
        if(this===localStorage && k!==DRIVE_SYNC_STATE_KEY && isManagedStorageKey(k) && oldValue!==String(nextValue)){
          mdSyncTouchKey(k,oldValue,String(nextValue),false);
        }
      }catch(e){console.warn('[sync-v2] change metadata failed',e)}
      return result;
    };
    Storage.prototype.removeItem=function(key){
      const k=String(key);
      let oldValue=null;
      try{if(this===localStorage) oldValue=this.getItem(k);}catch(e){}
      const result=driveSyncOriginalRemoveItem.call(this,key);
      try{
        if(this===localStorage && k!==DRIVE_SYNC_STATE_KEY && isManagedStorageKey(k) && oldValue!==null){
          mdSyncTouchKey(k,oldValue,null,true);
        }
      }catch(e){console.warn('[sync-v2] deletion metadata failed',e)}
      return result;
    };
  };

  function mdSyncMergeRecord(localRecord,remoteRecord,localFallback,remoteFallback){
    if(!localRecord) return remoteRecord?Object.assign({},remoteRecord):null;
    if(!remoteRecord) return Object.assign({},localRecord);
    const lt=mdSyncRecordTime(localRecord,localFallback),rt=mdSyncRecordTime(remoteRecord,remoteFallback);
    if(lt>rt) return Object.assign({},localRecord);
    if(rt>lt) return Object.assign({},remoteRecord);
    return mdSyncStable(localRecord)>=mdSyncStable(remoteRecord)?Object.assign({},localRecord):Object.assign({},remoteRecord);
  }
  function mdSyncPathRecord(meta,path){
    return meta&&meta.fields&&meta.fields[path]||null;
  }
  function mdSyncPathTime(meta,path,fallback){
    const record=mdSyncPathRecord(meta,path);
    if(record) return mdSyncRecordTime(record,fallback);
    return mdSyncRecordTime(meta,fallback);
  }
  function mdSyncBranchTime(meta,path,value,fallback){
    let latest=0;
    for(const [field,record] of Object.entries(meta&&meta.fields||{})){
      // A branch clock includes its own changes, never a later edit to a
      // different question stored under the same localStorage key.
      if(field===path||field.startsWith(path+'/'))latest=Math.max(latest,mdSyncRecordTime(record));
    }
    if(latest)return latest;
    const ancestors=path.split('/');
    while(ancestors.length){
      ancestors.pop();const record=mdSyncPathRecord(meta,ancestors.join('/'));
      if(record&&!record.deleted)return mdSyncRecordTime(record,fallback);
    }
    const valueTime=mdSyncValueTimestamp(value,null);
    if(valueTime)return valueTime;
    // Once individual fields are tracked, an unrelated field's clock cannot
    // supply a timestamp for this unmodified legacy branch.
    return Object.keys(meta&&meta.fields||{}).length?0:mdSyncValueTimestamp(value,fallback);
  }
  function mdSyncValueTimestamp(value,fallback){
    let best=0,found=false;
    if(mdSyncIsPlainObject(value)){
      const candidates=['updatedAt','savedAt','at','lastStudied','lastDate','lastSureDate','lastWrongDate','sameDayConfirmedDate','todayWrongReviewDate','lastRecoveryDate','recoveryStartDate','firstPassDate','firstStudied','revision'];
      for(const key of candidates){
        const raw=value[key];
        if(raw===null||raw===undefined||raw==='legacy') continue;
        let n=0;
        if(typeof raw==='number'&&Number.isFinite(raw)) n=raw>1e12?raw:(raw>1e9?raw*1000:0);
        else{const parsed=Date.parse(String(raw));if(Number.isFinite(parsed)) n=parsed}
        if(n>0){found=true;if(n>best) best=n}
      }
    }
    if(found) return best;
    const fallbackTime=Date.parse(fallback||'');
    return Number.isFinite(fallbackTime)?fallbackTime:0;
  }
  const MD_SYNC_MONOTONIC_NUMBERS=new Set(['attempts','correct','wrong','unsure','masteryReviews','tries']);
  function mdSyncCounterNumber(value){
    if(typeof value!=='number'&&typeof value!=='string')return null;
    if(typeof value==='string'&&(!value.trim()||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())))return null;
    const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
  }
  function mdSyncChoose(localValue,remoteValue,path,localMeta,remoteMeta,localFallback,remoteFallback,pathParts){
    const leaf=pathParts&&pathParts.length?String(pathParts[pathParts.length-1]):'';
    if(MD_SYNC_MONOTONIC_NUMBERS.has(leaf)){
      const local=mdSyncCounterNumber(localValue),remote=mdSyncCounterNumber(remoteValue);
      if(local!==null||remote!==null)return Math.max(local===null?0:local,remote===null?0:remote);
    }
    const lt=mdSyncPathTime(localMeta,path,localFallback),rt=mdSyncPathTime(remoteMeta,path,remoteFallback);
    if(lt>rt) return localValue;
    if(rt>lt) return remoteValue;
    return mdSyncStable(localValue)>=mdSyncStable(remoteValue)?localValue:remoteValue;
  }
  function mdSyncMergeNode(localValue,remoteValue,pathParts,localMeta,remoteMeta,localFallback,remoteFallback){
    if(mdSyncSame(localValue,remoteValue)) return localValue;
    const path=mdSyncPath(pathParts);
    const localDeletion=mdSyncPathRecord(localMeta,path),remoteDeletion=mdSyncPathRecord(remoteMeta,path);
    // An object deleted and then recreated has a new subtree. Do not union
    // fields or lifetime counters from a snapshot preceding that deletion.
    if(localDeletion&&localDeletion.deleted&&mdSyncRecordTime(localDeletion)>mdSyncBranchTime(remoteMeta,path,remoteValue,remoteFallback))return localValue;
    if(remoteDeletion&&remoteDeletion.deleted&&mdSyncRecordTime(remoteDeletion)>mdSyncBranchTime(localMeta,path,localValue,localFallback))return remoteValue;
    if(mdSyncIsPlainObject(localValue)&&mdSyncIsPlainObject(remoteValue)){
      const out={};
      const localObjectFallback=new Date(mdSyncValueTimestamp(localValue,localFallback)||0).toISOString();
      const remoteObjectFallback=new Date(mdSyncValueTimestamp(remoteValue,remoteFallback)||0).toISOString();
      const keys=new Set([...Object.keys(localValue),...Object.keys(remoteValue)]);
      for(const key of keys){
        const childParts=pathParts.concat(key),childPath=mdSyncPath(childParts);
        const localHas=Object.prototype.hasOwnProperty.call(localValue,key);
        const remoteHas=Object.prototype.hasOwnProperty.call(remoteValue,key);
        const lr=mdSyncPathRecord(localMeta,childPath),rr=mdSyncPathRecord(remoteMeta,childPath);
        if(localHas&&remoteHas){
          out[key]=mdSyncMergeNode(localValue[key],remoteValue[key],childParts,localMeta,remoteMeta,localObjectFallback,remoteObjectFallback);
        }else if(localHas){
          if(rr&&rr.deleted&&mdSyncRecordTime(rr,remoteObjectFallback)>=mdSyncBranchTime(localMeta,childPath,localValue[key],localObjectFallback)) continue;
          out[key]=localValue[key];
        }else if(remoteHas){
          if(lr&&lr.deleted&&mdSyncRecordTime(lr,localObjectFallback)>=mdSyncBranchTime(remoteMeta,childPath,remoteValue[key],remoteObjectFallback)) continue;
          out[key]=remoteValue[key];
        }
      }
      if(window.__mdLearningIntegrity)window.__mdLearningIntegrity.mergeCounters(localValue,remoteValue,out);
      return out;
    }
    return mdSyncChoose(localValue,remoteValue,path,localMeta,remoteMeta,localFallback,remoteFallback,pathParts);
  }
  function mdSyncMergeKeyMeta(localMeta,remoteMeta,localFallback,remoteFallback){
    const l=mdSyncNormalizeKeyMeta(localMeta),r=mdSyncNormalizeKeyMeta(remoteMeta);
    const out=mdSyncMergeRecord(l,r,localFallback,remoteFallback)||{};
    out.fields={};
    const paths=new Set([...Object.keys(l.fields||{}),...Object.keys(r.fields||{})]);
    for(const path of paths){
      const rec=mdSyncMergeRecord(l.fields[path],r.fields[path],localFallback,remoteFallback);
      if(rec) out.fields[path]=rec;
    }
    out.fields=mdSyncTrimFields(out.fields);
    out.history={};
    for(const id of new Set([...Object.keys(l.history),...Object.keys(r.history)])){
      const record=mdSyncMergeRecord(l.history[id],r.history[id],localFallback,remoteFallback);
      if(record)out.history[id]=record;
    }
    out.history=mdSyncTrimFields(out.history);
    const generation=mdSyncGeneration(l)||mdSyncGeneration(r);
    if(generation)out.generation=Object.assign({},generation);
    return out;
  }
  function mdSyncMergeHistory(local,remote,localMeta,remoteMeta,mergedMeta){
    const entries=new Map();
    const time=(entry,meta)=>mdSyncRecordTime(meta.history[mdSyncHistoryId(entry)],null)||Number(entry&&entry.ts)||0;
    for(const [source,meta] of [[local,localMeta],[remote,remoteMeta]])for(const entry of source){
      const id=mdSyncHistoryId(entry),updatedAt=time(entry,meta),deleted=mergedMeta.history[id];
      if(deleted&&deleted.deleted&&mdSyncRecordTime(deleted)>=updatedAt)continue;
      const current=entries.get(id);
      if(!current||updatedAt>current.updatedAt||(updatedAt===current.updatedAt&&mdSyncStable(entry)>mdSyncStable(current.entry)))entries.set(id,{entry,updatedAt});
    }
    return [...entries.values()].sort((a,b)=>{
      const delta=(Number(b.entry&&b.entry.ts)||0)-(Number(a.entry&&a.entry.ts)||0);
      if(delta)return delta;
      const left=mdSyncStable(a.entry),right=mdSyncStable(b.entry);
      return left===right?0:left>right?-1:1;
    }).slice(0,100).map(item=>item.entry);
  }
  function mdSyncMergeSnapshots(localItems,remoteItems,localMetaMap,remoteMetaMap,localFallback,remoteFallback){
    if(window.__mdDailyStorage){
      localItems=window.__mdDailyStorage.compactItems(localItems);
      remoteItems=window.__mdDailyStorage.compactItems(remoteItems);
    }
    const items={},itemMeta={};
    const keys=new Set([
      ...Object.keys(localItems||{}),...Object.keys(remoteItems||{}),
      ...Object.keys(localMetaMap||{}),...Object.keys(remoteMetaMap||{})
    ]);
    for(const key of keys){
      if(!isManagedStorageKey(key)) continue;
      const localHas=Object.prototype.hasOwnProperty.call(localItems||{},key);
      const remoteHas=Object.prototype.hasOwnProperty.call(remoteItems||{},key);
      const lm=mdSyncNormalizeKeyMeta((localMetaMap||{})[key]);
      const rm=mdSyncNormalizeKeyMeta((remoteMetaMap||{})[key]);
      const generationOrder=mdSyncCompareGenerations(lm,rm);
      if(generationOrder){
        // An offline old-generation client may keep editing, but its clocks
        // cannot undo a later explicit reset or reintroduce old counters.
        const newer=generationOrder>0?lm:rm,has=generationOrder>0?localHas:remoteHas;
        itemMeta[key]=newer;
        if(has)items[key]=generationOrder>0?localItems[key]:remoteItems[key];
        continue;
      }
      const mergedMeta=mdSyncMergeKeyMeta(lm,rm,localFallback,remoteFallback);
      itemMeta[key]=mergedMeta;
      if(localHas&&remoteHas){
        if(['md_pass_plan_session_checkpoint_v2','md_past_progress_v1','md_past_progress_meta_v1'].includes(key)){
          items[key]=mdSyncChoose(localItems[key],remoteItems[key],'',lm,rm,localFallback,remoteFallback,[]);continue;
        }
        if(localItems[key]===remoteItems[key]){items[key]=localItems[key];continue}
        const lp=mdSyncParse(localItems[key]),rp=mdSyncParse(remoteItems[key]);
        if(mdSyncIsFocusHistoryKey(key)&&lp.json&&rp.json&&Array.isArray(lp.value)&&Array.isArray(rp.value)){
          items[key]=JSON.stringify(mdSyncMergeHistory(lp.value,rp.value,lm,rm,mergedMeta));
        }else if(lp.json&&rp.json&&mdSyncIsPlainObject(lp.value)&&mdSyncIsPlainObject(rp.value)){
          const merged=mdSyncMergeNode(lp.value,rp.value,[],lm,rm,localFallback,remoteFallback);
          items[key]=JSON.stringify(merged);
        }else{
          items[key]=mdSyncChoose(localItems[key],remoteItems[key],'',lm,rm,localFallback,remoteFallback,[]);
        }
        continue;
      }
      if(localHas){
        const remoteDeleted=rm.deleted===true;
        if(remoteDeleted&&mdSyncRecordTime(rm,remoteFallback)>mdSyncRecordTime(lm,localFallback)) continue;
        items[key]=localItems[key];
        continue;
      }
      if(remoteHas){
        const localDeleted=lm.deleted===true;
        if(localDeleted&&mdSyncRecordTime(lm,localFallback)>mdSyncRecordTime(rm,remoteFallback)) continue;
        items[key]=remoteItems[key];
      }
    }
    for(const key of Object.keys(itemMeta)){
      const meta=itemMeta[key];
      if(!Object.prototype.hasOwnProperty.call(items,key) && !meta.deleted && !Object.keys(meta.fields||{}).some(p=>meta.fields[p]?.deleted)) delete itemMeta[key];
    }
    // Unioning two cache histories may exceed the per-device retention bound.
    return {items:window.__mdDailyStorage?window.__mdDailyStorage.compactItems(items):items,itemMeta};
  }
  function mdSyncContentSignature(items,itemMeta){
    return mdSyncStable({items:items||{},itemMeta:itemMeta||{}});
  }
  function mdSyncApplyMerged(merged,state){
    const before=collectBackupItems();
    if(!createAutomaticRestorePoint('before-drive-merge-sync')){
      throw new Error('현재 학습 기록의 복구 지점을 저장하지 못해 병합을 중단했습니다.');
    }
    driveSyncApplyingRemote=true;
    try{
      applyBackupSnapshot(Object.entries(merged.items),'Drive 병합 동기화');
      if(mdSyncStable(collectBackupItems())!==mdSyncStable(merged.items)){
        applyBackupSnapshot(Object.entries(before),'Drive 병합 실패 복구');
        throw new Error('병합 저장에 실패했습니다. 자동 복구 지점을 확인하세요.');
      }
    }finally{driveSyncApplyingRemote=false}
    state.itemMeta=merged.itemMeta;
  }

  // v5.10: capture only AFTER downloads, and never apply a stale snapshot
  // after upload/create awaits. Incoming data is deferred during active study
  // so a reload cannot interrupt an unsaved answer or stale in-memory session.
  function mdSyncReadLocal(){
    const state=driveSyncLoadState(),items=collectBackupItems();
    const itemMeta=mdSyncIsPlainObject(state.itemMeta)?state.itemMeta:{};
    return {state,items,itemMeta,signature:mdSyncContentSignature(items,itemMeta)};
  }
  function mdSyncStudyActive(){
    return typeof currentMode==='string' &&
      ['study','mock','focus','past','review','pass-plan-session'].includes(currentMode);
  }
  function mdSyncConnectionVersion(){
    return typeof window.__mdDriveAuthGeneration==='function'?window.__mdDriveAuthGeneration():0;
  }
  function mdSyncFinish(local,merged,fileId,remoteUpdatedAt,revision,showNotice,message,connectionVersion){
    const latest=mdSyncReadLocal(),current=latest.state;
    // A disconnect during a network request must not be undone by this result.
    if(!current.enabled||connectionVersion!==mdSyncConnectionVersion())return;
    const changedDuringRequest=latest.signature!==local.signature ||
      Number(current.revision)!==Number(local.state.revision);
    const itemsChanged=mdSyncStable(latest.items)!==mdSyncStable(merged.items);
    const pending=changedDuringRequest || (itemsChanged&&mdSyncStudyActive());
    if(!pending){
      if(itemsChanged)mdSyncApplyMerged(merged,current);
      current.itemMeta=merged.itemMeta;
      current.lastSyncedAt=driveSyncNowIso();
      current.localUpdatedAt=remoteUpdatedAt||current.localUpdatedAt;
    }
    // When pending, keep the LIVE local timestamps, field metadata and values.
    // The existing polling loop will merge them on the next sync.
    current.remoteFileId=fileId;
    current.remoteUpdatedAt=remoteUpdatedAt||current.remoteUpdatedAt;
    current.revision=Math.max(Number(current.revision)||0,Number(revision)||0);
    if(!driveSyncSaveState(current))throw new Error('동기화 상태를 저장하지 못했습니다.');
    if(showNotice)backupNotice(pending
      ?'새 학습 기록 또는 진행 중인 학습을 유지했습니다. 다음 동기화에서 병합을 다시 확인합니다.'
      :message);
    // No delayed reload: no 250 ms window in which a new answer can be lost.
    // Metadata-only merges do not need to reload the application.
    if(itemsChanged&&!pending)location.reload();
  }
  function mdSyncBuildV2Payload(state,items,itemMeta,updatedAt,revision){
    return {
      app:'Maritime Drill',
      schemaVersion:BACKUP_SCHEMA_VERSION,
      syncSchemaVersion:2,
      appVersion:APP_VERSION,
      updatedAt,
      revision:Number(revision)||0,
      deviceId:state.deviceId,
      items:items||collectBackupItems(),
      itemMeta:itemMeta||state.itemMeta||{}
    };
  }

  driveSyncOnce=async function({interactive=false,showNotice=false}={}){
    if(driveSyncBusy) return;
    const state=driveSyncLoadState();
    if(!state.enabled&&!interactive) return;
    if(!navigator.onLine){
      driveSyncLastError='';driveSyncRefreshPanel();
      if(showNotice) backupNotice('인터넷이 없어 로컬에 저장했습니다. 연결되면 다시 동기화할 수 있습니다.');
      return;
    }
    driveSyncBusy=true;driveSyncLastError='';driveSyncRefreshPanel();
    try{
      if(!driveSyncHasToken()){
        if(!interactive) throw new Error('Google Drive 연결 갱신이 필요합니다.');
        await driveSyncRequestToken(true);
      }
      if(interactive&&!state.enabled){
        const connected=driveSyncLoadState();connected.enabled=true;
        if(!driveSyncSaveState(connected))throw new Error('동기화 상태를 저장하지 못했습니다.');
      }
      const connectionVersion=mdSyncConnectionVersion();
      const file=await driveSyncFindRemoteFile();
      if(!driveSyncLoadState().enabled||connectionVersion!==mdSyncConnectionVersion())return;
      if(!file){
        const local=mdSyncReadLocal(),now=driveSyncNowIso();
        const revision=Math.max(1,(Number(local.state.revision)||0)+1);
        const payload=mdSyncBuildV2Payload(local.state,local.items,local.itemMeta,now,revision);
        const fileId=await driveSyncCreateRemote(payload);
        mdSyncFinish(local,{items:local.items,itemMeta:local.itemMeta},fileId,now,revision,showNotice,
          '현재 학습 진도를 Google Drive에 처음 저장했습니다.',connectionVersion);
        return;
      }

      const remote=await driveSyncDownloadPayload(file.id);
      // Do not use a snapshot taken before this await: the learner may have
      // answered more questions while the download was in flight.
      const local=mdSyncReadLocal();
      if(!local.state.enabled||connectionVersion!==mdSyncConnectionVersion())return;
      const remoteItems=remote.items||{};
      const remoteMeta=mdSyncIsPlainObject(remote.itemMeta)?remote.itemMeta:{};
      const localFallback=local.state.localUpdatedAt||local.state.lastSyncedAt||null;
      const remoteFallback=remote.updatedAt||file.modifiedTime||null;
      const merged=mdSyncMergeSnapshots(local.items,remoteItems,local.itemMeta,remoteMeta,localFallback,remoteFallback);
      const localChanged=local.signature!==mdSyncContentSignature(merged.items,merged.itemMeta);
      const remoteChanged=mdSyncContentSignature(remoteItems,remoteMeta)!==mdSyncContentSignature(merged.items,merged.itemMeta);
      let revision=Math.max(Number(local.state.revision)||0,Number(remote.revision)||0);
      let remoteUpdatedAt=remote.updatedAt||file.modifiedTime||local.state.remoteUpdatedAt||null;
      if(remoteChanged){
        const now=driveSyncNowIso();revision++;
        const payload=mdSyncBuildV2Payload(local.state,merged.items,merged.itemMeta,now,revision);
        const meta=await driveSyncUploadRemote(file.id,payload);
        remoteUpdatedAt=(meta&&meta.modifiedTime)||now;
      }
      // Applying incoming data BEFORE uploading would leave the running UI
      // holding stale objects while the user continues studying. Apply last,
      // only if both local content and modification metadata still match.
      const message=localChanged&&remoteChanged
        ?'노트북·휴대폰의 변경 내용을 병합해 Google Drive에 저장했습니다.'
        :localChanged?'다른 기기의 변경 내용을 이 기기에 병합했습니다.'
        :remoteChanged?'이 기기의 변경 내용을 Google Drive에 병합했습니다.'
        :'Google Drive와 진도가 이미 같습니다.';
      mdSyncFinish(local,merged,file.id,remoteUpdatedAt,revision,showNotice,message,connectionVersion);
    }catch(error){
      const msg=(error&&error.message)||String(error);
      driveSyncLastError=msg;
      // driveSyncFetch invalidates only the credential that actually failed.
      // Clearing here could erase a newer token obtained by another tab.
      console.warn('[v5.10] Drive 병합 동기화 실패',error);
      if(showNotice) alert('Google Drive 동기화 실패: '+msg);
    }finally{
      driveSyncBusy=false;driveSyncRefreshPanel();
    }
  };

  window.__mdDriveSyncV2={mergeSnapshots:mdSyncMergeSnapshots,diff:mdSyncDiff,stable:mdSyncStable,resetKey:mdSyncResetKey,historySessionId:mdSyncHistorySessionId};
})();
