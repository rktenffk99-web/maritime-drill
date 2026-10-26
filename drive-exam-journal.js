// Immutable Drive journal for exam versions. Concurrent devices never PATCH
// the same exam file. The older aggregate backup remains a compatible cache.
(function(global){
  'use strict';
  const sessions=global.__mdExamSessions;if(!sessions)return;
  const MARKER='maritime-drill-exam-v3',cache=new Map(),known=new Set();
  let discovered={};
  const generation=()=>global.__mdDriveAuthGeneration?.()||0;
  const check=version=>{if(generation()!==version)throw new Error('Google 연결이 변경되어 시험 동기화를 중단했습니다.');};
  const originalFind=driveSyncFindRemoteFile,originalDownload=driveSyncDownloadPayload;
  const originalCreate=driveSyncCreateRemote,originalUpload=driveSyncUploadRemote;
  function add(items,key,raw){
    const record=JSON.parse(raw);
    if(!sessions.valid(record)||key!==sessions.PREFIX+record.meta.id)throw new Error('Drive 시험 저장본의 식별 정보가 올바르지 않습니다.');
    items[key]=items[key]?JSON.stringify(sessions.merge(JSON.parse(items[key]),record)):raw;
  }
  async function discover(){
    const version=generation();
    let pageToken='',items={};known.clear();
    do{
      const params=new URLSearchParams({spaces:'appDataFolder',pageSize:'100',q:"trashed = false and appProperties has { key='kind' and value='"+MARKER+"' }",fields:'nextPageToken,files(id,name)',...(pageToken?{pageToken}:{})});
      const response=await driveSyncFetch('https://www.googleapis.com/drive/v3/files?'+params),data=await response.json();
      check(version);
      for(const file of data.files||[]){
        let payload=cache.get(file.id);
        if(!payload){payload=await originalDownload(file.id);cache.set(file.id,payload);}
        check(version);
        for(const [key,raw] of Object.entries(payload.items||{})){
          if(!key.startsWith(sessions.PREFIX))throw new Error('Drive 시험 파일에 다른 종류의 기록이 있습니다.');
          add(items,key,raw);
          for(const headId of Object.keys(JSON.parse(raw).heads))known.add(key+'|'+headId);
        }
      }
      pageToken=data.nextPageToken||'';
    }while(pageToken);
    check(version);discovered=items;
  }
  async function publish(payload){
    const version=generation();
    // One immutable file per causal head, uploaded only after an answer changed.
    // A failed/unknown POST may be retried as a duplicate; union is idempotent.
    for(const [key,raw] of Object.entries(payload.items||{})){
      if(!key.startsWith(sessions.PREFIX))continue;
      const record=JSON.parse(raw);
      if(!sessions.valid(record))throw new Error('시험 저장본 검증 실패');
      for(const [headId,head] of Object.entries(sessions.prune(record.heads))){
        check(version);
        if(known.has(key+'|'+headId))continue;
        const one={schema:3,meta:record.meta,heads:{[headId]:head}};
        const metadata={name:MARKER+'-'+headId+'.json',parents:['appDataFolder'],mimeType:'application/json',appProperties:{kind:MARKER}};
        const bodyPayload={app:'Maritime Drill',schemaVersion:BACKUP_SCHEMA_VERSION,appVersion:APP_VERSION,items:{[key]:JSON.stringify(one)}};
        const boundary='md_exam_'+global.crypto.randomUUID();
        const body=['--'+boundary,'Content-Type: application/json; charset=UTF-8','',JSON.stringify(metadata),'--'+boundary,'Content-Type: application/json; charset=UTF-8','',JSON.stringify(bodyPayload),'--'+boundary+'--',''].join('\r\n');
        const response=await driveSyncFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
        const file=await response.json();if(!file.id)throw new Error('Drive 시험 파일 저장 실패');
        check(version);cache.set(file.id,bodyPayload);known.add(key+'|'+headId);
      }
    }
  }
  driveSyncFindRemoteFile=async function(){await discover();return originalFind();};
  driveSyncDownloadPayload=async function(id){
    const payload=await originalDownload(id),items={...payload.items};
    for(const [key,raw] of Object.entries(discovered))add(items,key,raw);
    return {...payload,items};
  };
  driveSyncCreateRemote=async function(payload){await publish(payload);return originalCreate(payload);};
  driveSyncUploadRemote=async function(id,payload){await publish(payload);return originalUpload(id,payload);};
  global.__mdDriveExamJournal={discover,publish};
})(window);
