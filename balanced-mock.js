// Practice-paper assembly. Topic rules are study categories, not an official blueprint.
(function(global){
  'use strict';
  const GRADES=['navi2','navi3'],RECENT_PAPERS=3,MAX_SEEN=6000;
  const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const text=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const natural=x=>Number.isSafeInteger(x)&&x>=0?x:0;
  function normalize(value){
    const state={version:1,grades:{}};
    for(const grade of GRADES){
      const old=plain(value)&&plain(value.grades)&&plain(value.grades[grade])?value.grades[grade]:{};
      const seen={};
      const entries=plain(old.seen)?Object.entries(old.seen).filter(([key,v])=>key.length<180&&Array.isArray(v)&&v.length===2&&v.every(n=>Number.isSafeInteger(n)&&n>=0)):[];
      entries.sort((a,b)=>b[1][1]-a[1][1]);
      for(const [key,v] of entries.slice(0,MAX_SEEN))Object.defineProperty(seen,key,{value:v.slice(),enumerable:true,writable:true,configurable:true});
      state.grades[grade]={sequence:Math.max(natural(old.sequence),...Object.values(seen).map(v=>v[1])),seen,
        recent:Array.isArray(old.recent)?old.recent.filter(Array.isArray).slice(0,RECENT_PAPERS).map(run=>[...new Set(run.filter(k=>typeof k==='string'&&k.length<180))].slice(0,125)):[]};
    }
    return state;
  }
  function record(state,grade,identities){
    const next=normalize(state);
    if(!GRADES.includes(grade))return next;
    const ids=[...new Set(identities.filter(k=>typeof k==='string'&&k.length<180))];
    if(!ids.length)return next;
    const row=next.grades[grade],seq=++row.sequence;
    for(const id of ids)Object.defineProperty(row.seen,id,{value:[(row.seen[id]?.[0]||0)+1,seq],enumerable:true,writable:true,configurable:true});
    row.recent=[ids,...row.recent].slice(0,RECENT_PAPERS);
    return normalize(next);
  }
  const ENGLISH_TOPICS=[
    ['SMCP·조타·표준통신',/\b(?:smcp|wheel orders?|steady|meet her|hard[ -]a[ -](?:port|starboard)|midships|message markers?)\b/],
    ['조난·수색구조·무선통신',/\b(?:sar|gmdss|distress|mayday|pan[ -]pan|vhf|mhz|khz|epirb|rescue|radiotelephon\w*|radio)\b/],
    ['해양환경·오염방지',/\b(?:marpol|pollution|garbage|sewage|ballast water|oil spill|noxious|slop tanks?)\b/],
    ['용선·운송·하역',/\b(?:charter\w*|laytime|laydays|demurrage|dispatch|fio|bill of lading|freight|cargo|loading|discharg\w*|consignee|shipper|readiness|berth\w*)\b/],
    ['안전·소방·구명',/\b(?:solas|fire\w*|extinguish\w*|lifeboat\w*|liferaft\w*|lifejackets?|emergency|abandon|muster|safety|survival)\b/],
    ['항해·선박운항',/\b(?:colregs?|compass|radar|ecdis|tides?|currents?|anchor\w*|pilot\w*|course|bearings?|latitude|longitude|collision|overtaking|visibility|buoys?)\b/],
    ['기관·설비',/\b(?:engines?|pumps?|valves?|boilers?|generators?|electric\w*|machinery|propellers?|cylinders?)\b/],
    ['문법·번역',/\b(?:prepositions?|gramma\w*|translations?|translate|past tense|participles?)\b/]
  ];
  function topic(item,data){
    const subject=String(item.subject||'기타'),q=text(item.question);
    if(subject==='영어'){
      const classify=t=>ENGLISH_TOPICS.find(([,pattern])=>pattern.test(t))?.[0];
      let label=classify(q);
      if(!label&&Array.isArray(item.choices)){
        const votes=new Map();
        for(const choice of item.choices){const label=classify(text(choice));if(label)votes.set(label,(votes.get(label)||0)+1)}
        const best=[...votes].sort((a,b)=>b[1]-a[1])[0];
        if(best&&best[1]>=2)label=best[0];
      }
      return subject+'|'+(label||'해사영어 종합');
    }
    // Commercial-law questions previously fell through into one bucket per question.
    if(subject==='법규'&&/상법|선하증권|공동해손|운송인|송하인|수하인|용선|선박우선특권|선박의 종물/.test(q))return subject+'|상법·해상운송';
    for(const rule of data?.rules||[]){
      if(rule.subject!==subject)continue;
      try{if(new RegExp(rule.pattern,'i').test(q))return subject+'|'+rule.id}catch(e){}
    }
    // An unclassified question is NOT a new independent topic.
    return subject+'|종합';
  }
  function select(items,options){
    const {gradeId,data,state,identity,random=Math.random}=options;
    const seenIds=new Set(),seenText=new Set(),rows=[];
    for(const item of items){
      const id=String(identity(item)),fp=text(item.question);
      if(!id||seenIds.has(id)||seenText.has(fp))continue;
      seenIds.add(id);seenText.add(fp);
      rows.push({item,id,fp,topic:topic(item,data),weight:1+0.20*Math.min(5,Math.max(0,(item.hits?.length||1)-1))});
    }
    const target=Math.min(Math.max(0,Math.floor(options.count||0)),rows.length);
    const history=normalize(state).grades[gradeId]||{recent:[],seen:{},sequence:0};
    let available=rows,windowSize=Math.min(RECENT_PAPERS,history.recent.length);
    // Relax the oldest excluded paper only when there are too few unique candidates.
    for(;windowSize>=0;windowSize--){
      const recent=new Set(history.recent.slice(0,windowSize).flat());
      available=rows.filter(row=>!recent.has(row.id));
      if(available.length>=target)break;
    }
    const topics=new Set(available.map(row=>row.topic)),uses=new Map(),picked=[];
    let cap=Math.max(5,Math.ceil(target/Math.max(1,topics.size)));
    while(picked.length<target&&available.length){
      let choices=available.filter(row=>(uses.get(row.topic)||0)<cap);
      if(!choices.length){cap++;continue;}
      // Rotate exposure across papers; mastering/answering is a separate concern.
      const minimum=Math.min(...choices.map(row=>history.seen[row.id]?.[0]||0));
      choices=choices.filter(row=>(history.seen[row.id]?.[0]||0)===minimum);
      const weight=row=>row.weight/Math.pow(1+(uses.get(row.topic)||0),2);
      const total=choices.reduce((sum,row)=>sum+weight(row),0);
      let cursor=random()*total,chosen=choices[choices.length-1];
      for(const row of choices){cursor-=weight(row);if(cursor<=0){chosen=row;break;}}
      picked.push(chosen);uses.set(chosen.topic,(uses.get(chosen.topic)||0)+1);
      available.splice(available.indexOf(chosen),1);
    }
    return {items:picked.map(row=>row.item),identities:picked.map(row=>row.id),recentWindow:windowSize,topicCounts:Object.fromEntries(uses)};
  }
  global.__mdBalancedMock={normalize,record,topic,select,RECENT_PAPERS};
})(typeof window==='undefined'?globalThis:window);
