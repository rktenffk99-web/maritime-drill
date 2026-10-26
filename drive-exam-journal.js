// Immutable Drive journal for exam versions and terminal deletion markers.
// Concurrent devices never PATCH the same exam file; the aggregate is a cache.
(function(global){
  'use strict';
  const sessions=global.__mdExamSessions;if(!sessions)return;
  const MARKER='maritime-drill-exam-v3',cache=new Map(),known=new Set();
  let discovered={},deletions={},discoveryVersion=null;
  const generation=()=>global.__mdDriveAuthGeneration?.()||0;
  const check=version=>{if(generation()!==version)throw new Error('Google 연결이 변경되어 시험 동기화를 중단했습니다.');};
  const originalFind=driveSyncFindRemoteFile,originalDownload=driveSyncDownloadPayload;
  const originalCreate=driveSyncCreateRemote,originalUpload=driveSyncUploadRemote;
  function add(items,key,raw){
    const record=JSON.parse(raw);
    if(!sessions.valid(record)||key!==sessions.PREFIX+record.meta.id)throw new Error('Drive 시험 저장본의 식별 정보가 올바르지 않습니다.');
    items[key]=JSON.stringify(items[key]?sessions.merge(JSON.parse(items[key]),record):sessions.compact(record));
  }
  function addDeletes(target,source){
    for(const [key,meta] of Object.entries(source||{}))if(key.startsWith(sessions.PREFIX)&&meta?.deleted===true){
      // Attempt IDs are never reused. Deletion cannot be undone by stale data.
      if(!target[key]||String(meta.updatedAt||'')>String(target[key].updatedAt||''))target[key]={updatedAt:meta.updatedAt,deleted:true,fields:{},history:{}};
    }
  }
  async function discover(){
    const version=generation();
    let pageToken='',items={},removed={};known.clear();
    do{
      const params=new URLSearchParams({spaces:'appDataFolder',pageSize:'100',q:"trashed = false and appProperties has { key='kind' and value='"+MARKER+"' }",fields:'nextPageToken,files(id,name)',...(pageToken?{pageToken}:{})});
      const response=await driveSyncFetch('https://www.googleapis.com/drive/v3/files?'+params),data=await response.json();
      check(version);
      for(const file of data.files||[]){
        let payload=cache.get(file.id);
        if(!payload){payload=await originalDownload(file.id);cache.set(file.id,payload);}
        check(version);addDeletes(removed,payload.itemMeta);
        for(const [key,raw] of Object.entries(payload.items||{})){
          if(!key.startsWith(sessions.PREFIX))throw new Error('Drive 시험 파일에 다른 종류의 기록이 있습니다.');
          add(items,key,raw);
          for(const headId of Object.keys(JSON.parse(raw).heads))known.add(key+'|'+headId);
        }
      }
      pageToken=data.nextPageToken||'';
    }while(pageToken);
    for(const key of Object.keys(removed)){delete items[key];known.add(key+'|deleted');}
    check(version);discovered=items;deletions=removed;discoveryVersion=version;
  }
  async function post(identity,bodyPayload,version){
    check(version);if(known.has(identity))return;
    const metadata={name:MARKER+'-'+global.crypto.randomUUID()+'.json',parents:['appDataFolder'],mimeType:'application/json',appProperties:{kind:MARKER}};
    const boundary='md_exam_'+global.crypto.randomUUID();
    const body=['--'+boundary,'Content-Type: application/json; charset=UTF-8','',JSON.stringify(metadata),'--'+boundary,'Content-Type: application/json; charset=UTF-8','',JSON.stringify(bodyPayload),'--'+boundary+'--',''].join('\r\n');
    const response=await driveSyncFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    const file=await response.json();if(!file.id)throw new Error('Drive 시험 파일 저장 실패');
    check(version);cache.set(file.id,bodyPayload);known.add(identity);
  }
  async function publish(payload){
    const version=generation(),removed={};addDeletes(removed,payload.itemMeta);
    const envelope={app:'Maritime Drill',schemaVersion:BACKUP_SCHEMA_VERSION,appVersion:APP_VERSION};
    // Publish deletions first. A stale aggregate PATCH cannot erase them.
    for(const [key,meta] of Object.entries(removed))await post(key+'|deleted',{...envelope,items:{},itemMeta:{[key]:meta}},version);
    for(const [key,raw] of Object.entries(payload.items||{})){
      if(!key.startsWith(sessions.PREFIX)||removed[key]||deletions[key])continue;
      const record=JSON.parse(raw);
      if(!sessions.valid(record))throw new Error('시험 저장본 검증 실패');
      for(const [headId,head] of Object.entries(sessions.prune(record.heads))){
        const one=sessions.compact({schema:3,meta:record.meta,heads:{[headId]:head}});
        await post(key+'|'+headId,{...envelope,items:{[key]:JSON.stringify(one)}},version);
      }
    }
  }
  driveSyncFindRemoteFile=async function(){await discover();return originalFind();};
  driveSyncDownloadPayload=async function(id){
    const payload=await originalDownload(id),items={...payload.items},itemMeta={...payload.itemMeta},removed={};
    addDeletes(removed,itemMeta);addDeletes(removed,deletions);
    for(const [key,raw] of Object.entries(discovered))if(!removed[key])add(items,key,raw);
    for(const [key,meta] of Object.entries(removed)){delete items[key];itemMeta[key]=meta;}
    return {...payload,items,itemMeta};
  };
  driveSyncCreateRemote=async function(payload){await publish(payload);return originalCreate(payload);};
  driveSyncUploadRemote=async function(id,payload){await publish(payload);return originalUpload(id,payload);};
  global.__mdDriveExamJournal={discover,publish,
    snapshot(){
      if(discoveryVersion===null)throw new Error('Drive 시험 기록 확인이 아직 끝나지 않았습니다.');
      check(discoveryVersion);
      return {items:{...discovered},itemMeta:JSON.parse(JSON.stringify(deletions))};
    }
  };
})(window);
