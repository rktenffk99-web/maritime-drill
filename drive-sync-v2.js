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
    return {items,itemMeta};
  }
  function mdSyncContentSignature(items,itemMeta){
    return mdSyncStable({items:items||{},itemMeta:itemMeta||{}});
  }
  function mdSyncApplyMerged(merged,state){
    createAutomaticRestorePoint('before-drive-merge-sync');
    driveSyncApplyingRemote=true;
    try{applyBackupSnapshot(Object.entries(merged.items),'Drive 병합 동기화')}
    finally{driveSyncApplyingRemote=false}
    state.itemMeta=merged.itemMeta;
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
      let file=await driveSyncFindRemoteFile();
      let current=driveSyncLoadState();
      const localItems=collectBackupItems();
      const localMeta=mdSyncIsPlainObject(current.itemMeta)?current.itemMeta:{};
      if(!file){
        const now=driveSyncNowIso();
        const revision=Math.max(1,(Number(current.revision)||0)+1);
        const payload=mdSyncBuildV2Payload(current,localItems,localMeta,now,revision);
        const fileId=await driveSyncCreateRemote(payload);
        current.remoteFileId=fileId;current.lastSyncedAt=now;current.remoteUpdatedAt=now;
        current.localUpdatedAt=now;current.revision=revision;current.enabled=true;current.itemMeta=localMeta;
        driveSyncSaveState(current);
        if(showNotice) backupNotice('현재 학습 진도를 Google Drive에 처음 저장했습니다.');
        return;
      }

      const remote=await driveSyncDownloadPayload(file.id);
      const remoteItems=remote.items||{};
      const remoteMeta=mdSyncIsPlainObject(remote.itemMeta)?remote.itemMeta:{};
      const localFallback=current.localUpdatedAt||current.lastSyncedAt||null;
      const remoteFallback=remote.updatedAt||file.modifiedTime||null;
      const merged=mdSyncMergeSnapshots(localItems,remoteItems,localMeta,remoteMeta,localFallback,remoteFallback);
      const localChanged=mdSyncContentSignature(localItems,localMeta)!==mdSyncContentSignature(merged.items,merged.itemMeta);
      const remoteChanged=mdSyncContentSignature(remoteItems,remoteMeta)!==mdSyncContentSignature(merged.items,merged.itemMeta);

      if(localChanged) mdSyncApplyMerged(merged,current);
      else current.itemMeta=merged.itemMeta;

      if(remoteChanged){
        const now=driveSyncNowIso();
        const revision=Math.max(Number(current.revision)||0,Number(remote.revision)||0)+1;
        const payload=mdSyncBuildV2Payload(current,merged.items,merged.itemMeta,now,revision);
        const meta=await driveSyncUploadRemote(file.id,payload);
        current.localUpdatedAt=now;current.revision=revision;
        current.remoteUpdatedAt=(meta&&meta.modifiedTime)||now;
      }else{
        current.localUpdatedAt=remote.updatedAt||current.localUpdatedAt||file.modifiedTime||driveSyncNowIso();
        current.revision=Math.max(Number(current.revision)||0,Number(remote.revision)||0);
        current.remoteUpdatedAt=file.modifiedTime||remote.updatedAt||current.remoteUpdatedAt||null;
      }
      current.remoteFileId=file.id;current.lastSyncedAt=driveSyncNowIso();current.enabled=true;current.itemMeta=merged.itemMeta;
      driveSyncSaveState(current);
      if(showNotice){
        if(localChanged&&remoteChanged) backupNotice('노트북·휴대폰의 변경 내용을 병합해 Google Drive에 저장했습니다.');
        else if(localChanged) backupNotice('다른 기기의 변경 내용을 이 기기에 병합했습니다.');
        else if(remoteChanged) backupNotice('이 기기의 변경 내용을 Google Drive에 병합했습니다.');
        else backupNotice('Google Drive와 진도가 이미 같습니다.');
      }
      if(localChanged) setTimeout(()=>location.reload(),250);
    }catch(error){
      const msg=(error&&error.message)||String(error);
      driveSyncLastError=msg;
      if(/연결.*필요|401|invalid_token/i.test(msg)) driveSyncClearSessionToken();
      console.warn('[v5.09] Drive 병합 동기화 실패',error);
      if(showNotice) alert('Google Drive 동기화 실패: '+msg);
    }finally{
      driveSyncBusy=false;driveSyncRefreshPanel();
    }
  };

  window.__mdDriveSyncV2={mergeSnapshots:mdSyncMergeSnapshots,diff:mdSyncDiff,stable:mdSyncStable};
})();
