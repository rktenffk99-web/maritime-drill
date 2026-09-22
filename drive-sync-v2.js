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
    return result;
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

  // Replace the v5.08 hooks before driveSyncInit() runs.
  driveSyncInstallStorageHooks=function(){
    if(driveSyncOriginalSetItem) return;
    driveSyncOriginalSetItem=Storage.prototype.setItem;
    driveSyncOriginalRemoveItem=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(key,value){
      const k=String(key);
      let oldValue=null;
      try{if(this===localStorage) oldValue=this.getItem(k);}catch(e){}
      const result=driveSyncOriginalSetItem.call(this,key,value);
      try{
        if(this===localStorage && k!==DRIVE_SYNC_STATE_KEY && isManagedStorageKey(k) && oldValue!==String(value)){
          mdSyncTouchKey(k,oldValue,String(value),false);
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
  function mdSyncChoose(localValue,remoteValue,path,localMeta,remoteMeta,localFallback,remoteFallback,pathParts){
    const leaf=pathParts&&pathParts.length?String(pathParts[pathParts.length-1]):'';
    if(MD_SYNC_MONOTONIC_NUMBERS.has(leaf) && typeof localValue==='number' && typeof remoteValue==='number') return Math.max(localValue,remoteValue);
    const lt=mdSyncPathTime(localMeta,path,localFallback),rt=mdSyncPathTime(remoteMeta,path,remoteFallback);
    if(lt>rt) return localValue;
    if(rt>lt) return remoteValue;
    return mdSyncStable(localValue)>=mdSyncStable(remoteValue)?localValue:remoteValue;
  }
  function mdSyncMergeNode(localValue,remoteValue,pathParts,localMeta,remoteMeta,localFallback,remoteFallback){
    if(mdSyncSame(localValue,remoteValue)) return localValue;
    const path=mdSyncPath(pathParts);
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
          if(rr&&rr.deleted&&mdSyncRecordTime(rr,remoteObjectFallback)>mdSyncPathTime(localMeta,childPath,localObjectFallback)) continue;
          out[key]=localValue[key];
        }else if(remoteHas){
          if(lr&&lr.deleted&&mdSyncRecordTime(lr,localObjectFallback)>mdSyncPathTime(remoteMeta,childPath,remoteObjectFallback)) continue;
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
    return out;
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
      const mergedMeta=mdSyncMergeKeyMeta(lm,rm,localFallback,remoteFallback);
      itemMeta[key]=mergedMeta;
      if(localHas&&remoteHas){
        if(['md_pass_plan_session_checkpoint_v2','md_past_progress_v1','md_past_progress_meta_v1'].includes(key)){
          items[key]=mdSyncChoose(localItems[key],remoteItems[key],'',lm,rm,localFallback,remoteFallback,[]);continue;
        }
        if(localItems[key]===remoteItems[key]){items[key]=localItems[key];continue}
        const lp=mdSyncParse(localItems[key]),rp=mdSyncParse(remoteItems[key]);
        if(lp.json&&rp.json&&mdSyncIsPlainObject(lp.value)&&mdSyncIsPlainObject(rp.value)){
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

  window.__mdDriveSyncV2={mergeSnapshots:mdSyncMergeSnapshots,diff:mdSyncDiff,stable:mdSyncStable};
})();
