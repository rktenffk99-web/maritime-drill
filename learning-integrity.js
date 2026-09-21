// Shared learning invariants. Question IDs and canonical answer indexes stay unchanged.
(function(global){
  'use strict';
  const COUNTERS=['attempts','correct','wrong','unsure','masteryReviews'];
  const count=v=>Math.max(0,Number.isFinite(Number(v))?Number(v):0);
  function normalizedCounts(value){
    const out={};for(const k of COUNTERS)out[k]=count(value&&value[k]);
    out.attempts=Math.max(out.attempts,out.correct+out.wrong);
    return out;
  }
  let counterDeviceId=null;
  function deviceId(){
    if(counterDeviceId)return counterDeviceId;
    const key='maritime_counter_device_id'; // Device-local; intentionally not backed up or synced.
    try{counterDeviceId=global.localStorage.getItem(key)}catch(e){}
    if(!counterDeviceId){
      counterDeviceId=global.crypto&&typeof global.crypto.randomUUID==='function'?global.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
      try{global.localStorage.setItem(key,counterDeviceId)}catch(e){}
    }
    return counterDeviceId;
  }
  function initializeCounters(record){
    if(record._counterVersion===1&&record._counterBase&&record._counterComponents)return;
    record._counterVersion=1;record._counterBase=normalizedCounts(record);record._counterComponents={};
  }
  function recount(record){
    if(record._counterVersion!==1||!record._counterBase||!record._counterComponents)return record;
    const totals=normalizedCounts(record._counterBase);
    for(const c of Object.values(record._counterComponents)){
      if(!c||typeof c!=='object')continue;
      const right=count(c.correct),wrong=count(c.wrong);
      totals.attempts+=right+wrong;totals.correct+=right;totals.wrong+=wrong;
      totals.unsure+=count(c.unsure);totals.masteryReviews+=count(c.masteryReviews);
    }
    Object.assign(record,totals);return record;
  }
  function appendOutcome(record,outcome,masteryReview){
    initializeCounters(record);
    const id=deviceId(),c=record._counterComponents[id]||{correct:0,wrong:0,unsure:0,masteryReviews:0};
    c[outcome==='wrong'?'wrong':'correct']++;
    if(outcome==='unsure')c.unsure++;
    if(masteryReview)c.masteryReviews++;
    record._counterComponents[id]=c;return recount(record);
  }
  function mergeCounters(local,remote,merged){
    if(!local||!remote||!merged)return merged;
    if(local._counterVersion===1||remote._counterVersion===1){
      const base={};
      const lb=local._counterVersion===1?normalizedCounts(local._counterBase):normalizedCounts(local);
      const rb=remote._counterVersion===1?normalizedCounts(remote._counterBase):normalizedCounts(remote);
      // Legacy clients cannot distinguish already-seen contributions. Preserve
      // their extra totals as a lower bound without double-counting known work.
      const modern=local._counterVersion===1?local:remote;
      const modernTotals=recount(JSON.parse(JSON.stringify(modern)));
      for(const k of COUNTERS){
        if(local._counterVersion===1&&remote._counterVersion===1)base[k]=Math.max(lb[k],rb[k]);
        else {const legacy=local._counterVersion===1?rb:lb;base[k]=count(modern._counterBase[k])+Math.max(0,legacy[k]-count(modernTotals[k]));}
      }
      merged._counterVersion=1;merged._counterBase=normalizedCounts(base);
      const components={};
      for(const source of [local._counterComponents||{},remote._counterComponents||{}])for(const [id,c] of Object.entries(source)){
        if(!components[id])components[id]={correct:0,wrong:0,unsure:0,masteryReviews:0};
        for(const k of ['correct','wrong','unsure','masteryReviews'])components[id][k]=Math.max(components[id][k],count(c&&c[k]));
      }
      merged._counterComponents=components;return recount(merged);
    }
    // Historic snapshots lack attempt identities. Do not invent missing events;
    // at least keep the visible totals internally consistent.
    if(typeof merged.attempts==='number'&&typeof merged.correct==='number'&&typeof merged.wrong==='number')
      merged.attempts=Math.max(merged.attempts,merged.correct+merged.wrong);
    return merged;
  }
  function contentIssue(q){
    const text=String(q&&(q['문제']||q.question)||'');
    if(/\bunderlined\b|밑줄\s*(?:친|부분)/i.test(text)&&!q._underlineText&&!/\[(?:밑줄|대상)\s*:/.test(text))return '밑줄 위치 확인 필요';
    if(/(?:다음|아래)의?\s*그림|그림과\s*같|그림에서|그림의\s*(?:등화|선박|항로표지)/.test(text)&&!q._figureText&&!/\[그림\s*:[^\]]+\]/.test(text))return '그림 원문 확인 필요';
    return '';
  }
  function optionOrder(key,seed,index){
    let n=2166136261;for(const c of String(key)+'|'+seed+'|'+index)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
    const out=[0,1,2,3];for(let i=3;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function remapExplanation(html,order){
    if(!Array.isArray(order)||order.length!==4)return html;
    const labels='㉮㉯㉰㉱';return String(html).replace(/[㉮㉯㉰㉱㉴㉵]/g,c=>labels[order.indexOf(c==='㉴'?2:c==='㉵'?3:labels.indexOf(c))]);
  }
  global.__mdLearningIntegrity={initializeCounters,appendOutcome,recount,mergeCounters,contentIssue,optionOrder,remapExplanation};
})(window);
