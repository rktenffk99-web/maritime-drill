// Local-only encoding for Drive clocks. Full sync state and remote payloads use
// the original expanded shape; learning records are never stored in this key.
(function(global){
  'use strict';
  const MARKER='\u0000md-fields-v1',BLOCKED='_mdStateCodecReadBlocked';
  const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const stable=value=>{
    if(value===null||typeof value!=='object')return JSON.stringify(value);
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  };
  function prefer(a,b){
    const at=Date.parse(a&&a.updatedAt||'')||0,bt=Date.parse(b&&b.updatedAt||'')||0;
    if(at!==bt)return at>bt?a:b;
    return stable(a)>=stable(b)?a:b;
  }
  function decodeFields(fields,validateOnly=false){
    if(!plain(fields)||!own(fields,MARKER))return fields;
    const value=fields[MARKER];
    if(!Array.isArray(value)||value.length!==3)throw new Error('Invalid local Drive clock encoding');
    const [segments,times,rows]=value;
    if(!Array.isArray(segments)||segments.some(v=>typeof v!=='string')||!Array.isArray(times)||times.some(v=>typeof v!=='string')||!Array.isArray(rows))throw new Error('Invalid local Drive clock dictionary');
    const entries=[];
    for(const row of rows){
      if(!Array.isArray(row)||(row.length!==2&&row.length!==3&&row.length!==4)||!Array.isArray(row[0])||row[0].some(n=>!Number.isInteger(n)||n<0||n>=segments.length))throw new Error('Invalid local Drive clock path');
      if(row.length===2){
        if(!validateOnly)entries.push([row[0].map(n=>segments[n]).join('/'),row[1]]);
      }
      else{
        if(!Number.isInteger(row[1])||row[1]<0||row[1]>=times.length||(row[2]!==0&&row[2]!==1))throw new Error('Invalid local Drive clock record');
        if(row.length===4){
          if(!Array.isArray(row[3])||row[3].some(n=>!Number.isInteger(n)||n<0||n>=segments.length))throw new Error('Invalid local Drive clock leaf');
          if(!validateOnly)for(const leaf of row[3])entries.push([row[0].concat(leaf).map(n=>segments[n]).join('/'),{updatedAt:times[row[1]],deleted:row[2]===1}]);
        }else if(!validateOnly)entries.push([row[0].map(n=>segments[n]).join('/'),{updatedAt:times[row[1]],deleted:row[2]===1}]);
      }
    }
    if(validateOnly)return fields;
    const expanded=Object.fromEntries(entries);
    // An already-open older tab may append raw paths without understanding the
    // packed entry. Preserve those writes using the same clock/tie rule.
    for(const [path,record] of Object.entries(fields))if(path!==MARKER)Object.defineProperty(expanded,path,{value:own(expanded,path)?prefer(expanded[path],record):record,enumerable:true,writable:true,configurable:true});
    return expanded;
  }
  function encodeFields(input){
    const fields=decodeFields(input);
    if(!plain(fields)||Object.keys(fields).length<16)return fields;
    const segments=[],times=[],segmentIds=new Map(),timeIds=new Map();
    const intern=(value,list,ids)=>{if(!ids.has(value)){ids.set(value,list.length);list.push(value)}return ids.get(value)};
    const groups=new Map(),rawRows=[];
    const rows=Object.entries(fields).map(([path,record])=>{
      const parts=path.split('/').map(value=>intern(value,segments,segmentIds));
      if(plain(record)&&typeof record.updatedAt==='string'&&typeof record.deleted==='boolean'&&Object.keys(record).length===2){
        const time=intern(record.updatedAt,times,timeIds),deleted=record.deleted?1:0,prefix=parts.slice(0,-1),groupKey=JSON.stringify([prefix,time,deleted]);
        if(!groups.has(groupKey))groups.set(groupKey,{prefix,time,deleted,leaves:[]});
        groups.get(groupKey).leaves.push(parts[parts.length-1]);
        return [parts,time,deleted];
      }
      const row=[parts,record];rawRows.push(row);return row;
    });
    // Most leaves of one answer share their parent and modification clock.
    // A grouped row stores that common prefix/clock once, retaining exact
    // per-field deletion semantics and the original flat-row decoder.
    const grouped=[...groups.values()].map(group=>group.leaves.length>1?[group.prefix,group.time,group.deleted,group.leaves]:[group.prefix.concat(group.leaves[0]),group.time,group.deleted]).concat(rawRows);
    const flatPacked={[MARKER]:[segments,times,rows]},groupedPacked={[MARKER]:[segments,times,grouped]};
    const packed=JSON.stringify(groupedPacked).length<JSON.stringify(flatPacked).length?groupedPacked:flatPacked;
    return JSON.stringify(packed).length<JSON.stringify(fields).length?packed:fields;
  }
  function transformState(state,transform){
    if(!plain(state)||!plain(state.itemMeta))return state;
    let changed=false;
    const entries=Object.entries(state.itemMeta).map(([key,meta])=>{
      if(!plain(meta)||!own(meta,'fields'))return [key,meta];
      const fields=transform(meta.fields);if(fields===meta.fields)return [key,meta];
      changed=true;return [key,{...meta,fields}];
    });
    return changed?{...state,itemMeta:Object.fromEntries(entries)}:state;
  }
  function validateState(state){
    if(plain(state)&&plain(state.itemMeta))for(const meta of Object.values(state.itemMeta)){
      if(plain(meta)&&own(meta,'fields'))decodeFields(meta.fields,true);
    }
    return state;
  }
  function transformKey(state,key,transform){
    if(!plain(state)||!plain(state.itemMeta)||!own(state.itemMeta,key))return state;
    const meta=state.itemMeta[key];
    if(!plain(meta)||!own(meta,'fields'))return state;
    const fields=transform(meta.fields);
    return fields===meta.fields?state:{...state,itemMeta:{...state.itemMeta,[key]:{...meta,fields}}};
  }
  const decode=state=>transformState(state,decodeFields),encode=state=>transformState(state,encodeFields);
  const api={encode,decode,encodeFields,decodeFields,MARKER};
  global.__mdDriveStateCodec=api;
  if(typeof driveSyncLoadState!=='function'||typeof driveSyncSaveState!=='function')return;
  const originalLoad=driveSyncLoadState,originalSave=driveSyncSaveState;
  let readBlocked=false;
  function loadState(transform){
    const state=originalLoad();
    try{const result=transform(state);readBlocked=false;return result}
    catch(error){
      readBlocked=true;
      driveSyncLastError='Drive 동기화 상태를 읽지 못했습니다. 기존 기록을 보존했습니다.';
      console.warn('[drive-state-codec] local clocks could not be decoded',error);
      return {...state,enabled:false,itemMeta:{},[BLOCKED]:true};
    }
  }
  driveSyncLoadState=function(){return loadState(decode)};
  driveSyncSaveState=function(state){
    if(readBlocked||state&&state[BLOCKED])return false;
    try{return originalSave(encode(state))}
    catch(error){console.warn('[drive-state-codec] local clocks could not be encoded',error);return false}
  };
  // A local answer only changes one key's clocks. Keep other keys packed in
  // storage, while still checking every packed record before permitting a write.
  // Each read starts from localStorage so another tab's writes remain visible.
  api.loadForKey=key=>loadState(state=>transformKey(validateState(state),key,decodeFields));
  api.saveForKey=function(state,key){
    if(readBlocked||state&&state[BLOCKED])return false;
    try{return originalSave(transformKey(validateState(state),key,encodeFields))}
    catch(error){console.warn('[drive-state-codec] local key clocks could not be encoded',error);return false}
  };
  // Status checks do not need field clocks. Never pass this header to a saver.
  api.loadHeader=function(){
    const {itemMeta,...header}=loadState(validateState);
    return header;
  };
  api.migrateLocal=function(){
    try{
      const raw=global.localStorage.getItem(DRIVE_SYNC_STATE_KEY);if(!raw)return false;
      const state=JSON.parse(raw),packed=encode(state);
      return JSON.stringify(packed).length<raw.length?originalSave(packed):true;
    }catch(error){console.warn('[drive-state-codec] local clock migration deferred',error);return false}
  };
  api.migrateLocal();
})(window);
