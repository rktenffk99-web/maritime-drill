// Daily assignments are a regenerable cache. Learning progress and checkpoints
// live in other keys and must never be discarded to make room for this cache.
(function(global){
  'use strict';
  const DAILY_KEY='md_nav23_pass_daily_v1',RESTORE_KEY='md_restore_point_v1',MAX_DAYS=30;
  const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  function compactDaily(daily){
    if(!plain(daily))return daily;
    const dates=Object.keys(daily).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse();
    const keep=new Set(dates.slice(0,MAX_DAYS)),out={};
    const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    if(Object.prototype.hasOwnProperty.call(daily,today)&&!keep.has(today)){
      if(keep.size===MAX_DAYS)keep.delete(dates[MAX_DAYS-1]);
      keep.add(today);
    }
    for(const [day,assignment] of Object.entries(daily)){
      if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&!keep.has(day))continue;
      if(!plain(assignment)){out[day]=assignment;continue;}
      // phases repeats entire source-question pools. It is recalculated for the
      // screen and is never needed to resume an assignment or score an answer.
      const {phases,...saved}=assignment;out[day]=saved;
    }
    return out;
  }
  function compactItems(items){
    if(!plain(items))return items;
    const out={...items};
    if(typeof out[DAILY_KEY]==='string')out[DAILY_KEY]=compactValue(DAILY_KEY,out[DAILY_KEY]);
    return global.__mdPassProgressStorage?global.__mdPassProgressStorage.compactItems(out):out;
  }
  function compactValue(key,raw){
    if(key==='md_nav23_pass_progress_v1'&&global.__mdPassProgressStorage)return global.__mdPassProgressStorage.compactValue(raw);
    if(typeof raw!=='string'||(key!==DAILY_KEY&&key!==RESTORE_KEY))return raw;
    try{
      const value=JSON.parse(raw);
      if(key===DAILY_KEY)return plain(value)?JSON.stringify(compactDaily(value)):raw;
      if(plain(value)&&plain(value.items))return JSON.stringify({...value,items:compactItems(value.items)});
    }catch(e){ /* Preserve unrecognised data; never replace it with an empty cache. */ }
    return raw;
  }
  function migrateLocal(){
    // Replacing each existing value is atomic, including when storage is full.
    // Shrink the restore point first so a duplicate cache cannot block recovery.
    for(const key of [RESTORE_KEY,'md_nav23_pass_progress_v1',DAILY_KEY]){
      try{
        const raw=global.localStorage.getItem(key),next=compactValue(key,raw);
        if(next!==raw)global.localStorage.setItem(key,next);
      }catch(error){console.warn('[daily-storage] cache migration could not be saved',key,error);}
    }
  }
  global.__mdDailyStorage={compactDaily,compactItems,compactValue,migrateLocal,MAX_DAYS};
})(window);

// v5.22: keep derived practice metadata within a fixed budget; lifetime learning values are unchanged.
(function(global){
  'use strict';
  const KEY='md_nav23_pass_progress_v1',CHECKPOINT='md_pass_plan_session_checkpoint_v2',MAX_EVENTS=400,PER_QUESTION_EVENTS=3,MAX_TODAY_IDS=64;
  const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const nulls=['recoveryStartDate','lastWrongDate','todayWrongReviewDate','reviewSuccessDate','reviewLapseDate','nextDayRecheckScheduledDate'];
  const falses=['mastered','lateSessionNextDayRecheck'];
  const zeros=['attempts','correct','wrong','unsure','masteryReviews','reviewStage'];
  const dayOf=value=>{const d=value instanceof Date?value:new Date(value);return Number.isFinite(d.getTime())?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):''};
  const time=event=>{const v=event&&(event.at||event.date);const n=typeof v==='number'?v:Date.parse(v||'');return Number.isFinite(n)?n:0};
  function checkpointPins(options,today){
    let cp=options&&Object.prototype.hasOwnProperty.call(options,'checkpoint')?options.checkpoint:undefined;
    if(cp===undefined)try{cp=JSON.parse(global.localStorage.getItem(CHECKPOINT)||'null')}catch(e){}
    if(typeof cp==='string')try{cp=JSON.parse(cp)}catch(e){cp=null}
    return new Set(cp&&cp.date===today&&Array.isArray(cp.commitIds)?cp.commitIds.filter(id=>typeof id==='string'):[]);
  }
  function compact(progress,options={}){
    if(!plain(progress))return progress;
    const today=options.today||dayOf(new Date()),pins=checkpointPins(options,today),out={...progress},events=[];
    for(const [key,value]of Object.entries(progress)){
      if(!plain(value)){out[key]=value;continue}
      if(value._storage!==1&&value.reviewScheduleVersion!==1&&!Array.isArray(value.recentOutcomes)&&!Array.isArray(value.homeworkCommitIds)&&typeof value.lastHomeworkCommitId!=='string'){out[key]=value;continue;}
      const r={...value};
      if(Array.isArray(r.recentOutcomes)){
        r.recentOutcomes=r.recentOutcomes.filter(plain).map((event,index)=>({event,index})).sort((a,b)=>time(a.event)-time(b.event)||a.index-b.index).slice(-PER_QUESTION_EVENTS).map(x=>x.event);
        r.recentOutcomes.forEach((event,index)=>events.push({key,index,event,time:time(event)}));
      }
      const ids=Array.isArray(r.homeworkCommitIds)?r.homeworkCommitIds.filter(id=>typeof id==='string'):[];
      const dated=ids.filter(id=>pins.has(id)||dayOf(Number(id.split('|')[1]))===today);
      const retained=new Set(dated.filter(id=>!pins.has(id)).slice(-MAX_TODAY_IDS));for(const id of dated)if(pins.has(id))retained.add(id);
      // The latest occurrence remains replay-safe for live sessions crossing midnight.
      if(typeof r.lastHomeworkCommitId==='string'&&(pins.has(r.lastHomeworkCommitId)||r.lastDate===today))retained.add(r.lastHomeworkCommitId);
      if(retained.size)r.homeworkCommitIds=[...retained];else delete r.homeworkCommitIds;
      if(typeof r.lastHomeworkCommitId==='string'&&!retained.has(r.lastHomeworkCommitId))delete r.lastHomeworkCommitId;
      for(const name of nulls)if(r[name]===null)delete r[name];
      for(const name of falses)if(r[name]===false)delete r[name];
      for(const name of zeros)if(r[name]===0)delete r[name];
      // Existing normalizedCounts/recount already treats an absent base counter as zero.
      if(plain(r._counterBase))r._counterBase=Object.fromEntries(Object.entries(r._counterBase).filter(([,v])=>v!==0));
      r._storage=1;out[key]=r;
    }
    events.sort((a,b)=>b.time-a.time||String(a.key).localeCompare(String(b.key))||b.index-a.index);
    const keep=new Set(events.slice(0,MAX_EVENTS).map(x=>x.key+'\n'+x.index));
    for(const [key,r]of Object.entries(out))if(plain(r)&&Array.isArray(r.recentOutcomes)){
      r.recentOutcomes=r.recentOutcomes.filter((_,index)=>keep.has(key+'\n'+index));if(!r.recentOutcomes.length)delete r.recentOutcomes;
    }
    return out;
  }
  function hydrate(progress){
    if(!plain(progress))return progress;
    const out={...progress};for(const [key,value]of Object.entries(progress)){
      if(!plain(value)||value._storage!==1){out[key]=value;continue}
      const r={...value};for(const name of nulls)if(!Object.prototype.hasOwnProperty.call(r,name))r[name]=null;
      for(const name of falses)if(!Object.prototype.hasOwnProperty.call(r,name))r[name]=false;
      for(const name of zeros)if(!Object.prototype.hasOwnProperty.call(r,name))r[name]=0;
      out[key]=r;
    }return out;
  }
  function value(raw,options){try{const parsed=JSON.parse(raw);return plain(parsed)?JSON.stringify(compact(parsed,options)):raw}catch(e){return raw}}
  function compactItems(items){
    if(!plain(items))return items;const out={...items};if(typeof out[KEY]==='string')out[KEY]=value(out[KEY],{checkpoint:out[CHECKPOINT]||null});return out;
  }
  function hydrateItems(items){
    if(!plain(items))return items;const out={...items};if(typeof out[KEY]==='string')try{const parsed=JSON.parse(out[KEY]);if(plain(parsed))out[KEY]=JSON.stringify(hydrate(parsed))}catch(e){}return out;
  }
  global.__mdPassProgressStorage={KEY,compact,hydrate,compactValue:value,compactItems,hydrateItems,MAX_EVENTS,PER_QUESTION_EVENTS,MAX_TODAY_IDS};
})(window);
