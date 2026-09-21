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
    return out;
  }
  function compactValue(key,raw){
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
    for(const key of [RESTORE_KEY,DAILY_KEY]){
      try{
        const raw=global.localStorage.getItem(key),next=compactValue(key,raw);
        if(next!==raw)global.localStorage.setItem(key,next);
      }catch(error){console.warn('[daily-storage] cache migration could not be saved',key,error);}
    }
  }
  global.__mdDailyStorage={compactDaily,compactItems,compactValue,migrateLocal,MAX_DAYS};
})(window);
