// Maritime Drill adaptive predictive analytics
// Adds subject/topic diagnostics, persistent concept weakness statistics,
// concept-weighted future mocks, and a focused weak-topic drill.
(function(global){
  'use strict';

  const STATS_KEY='md_predictive_concept_stats_v1';
  const RUNS_KEY='md_predictive_concept_runs_v1';
  const ANALYTICS_VERSION=1;
  const MAX_FOCUS_RATIO=0.35;

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function pct(value){return Math.round(clamp(Number(value)||0,0,1)*100)}
  function safeParse(key,fallback){
    try{const raw=global.localStorage&&global.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(e){return fallback}
  }
  function safeStore(key,value){
    try{if(global.localStorage)global.localStorage.setItem(key,JSON.stringify(value))}catch(e){}
  }
  function emptyStore(){return {version:ANALYTICS_VERSION,navi2:{concepts:{}},navi3:{concepts:{}}}}
  function loadStore(){
    const value=safeParse(STATS_KEY,null),out=emptyStore();
    if(!value||typeof value!=='object')return out;
    ['navi2','navi3'].forEach(g=>{
      const src=value[g]&&value[g].concepts;
      if(src&&typeof src==='object')out[g].concepts=src;
    });
    return out;
  }
  function saveStore(store){safeStore(STATS_KEY,store)}

  function gradeOf(qOrItem){
    if(!qOrItem)return '';
    if(qOrItem.gradeId)return String(qOrItem.gradeId);
    if(qOrItem._planGrade)return String(qOrItem._planGrade);
    const key=String(qOrItem._planKey||qOrItem.key||'');
    const grade=key.split('|')[0];
    return grade==='navi2'||grade==='navi3'?grade:'';
  }
  function subjectOf(qOrItem){
    if(!qOrItem)return '기타';
    if(qOrItem._predictiveSubject)return String(qOrItem._predictiveSubject);
    if(qOrItem.subject)return String(qOrItem.subject);
    if(qOrItem['과목'])return String(qOrItem['과목']);
    const concept=String(qOrItem._predictiveConcept||'');
    if(concept.includes('|'))return concept.split('|')[0]||'기타';
    return '기타';
  }
  function questionText(qOrItem){
    return String((qOrItem&&(qOrItem.question||qOrItem['문제']||qOrItem['질문']))||'').normalize('NFKC').toLowerCase();
  }

  function broadTopic(subject,text){
    const t=String(text||'').normalize('NFKC').toLowerCase();
    if(subject==='항해'){
      if(/천체|자오선|적위|정거|방위각|정중|천문/.test(t))return '천문항법';
      if(/레이더|radar|arpa|반사파|거짓상|echo|측엽/.test(t))return '레이더·ARPA';
      if(/자기|자차|컴퍼스|compass|flinders|지자기|편차/.test(t))return '자기컴퍼스·자차';
      if(/선속계|속력|doppler|도플러|log\b|대지속력|대수속력/.test(t))return '항해계기';
      if(/대권|중분위|항정|침로|위도|경도|항법/.test(t))return '지문항법·항정';
      if(/해도|수로|등대|항로표지|chart/.test(t))return '해도·항로표지';
      return '항해 일반';
    }
    if(subject==='법규'){
      if(/해상교통안전법|연안통항대|통항분리|교통안전특정해역|통항로/.test(t))return '해상교통안전법';
      if(/상법|선하증권|운송인|감항능력|송하인|수하인|행방불명/.test(t))return '상법·해상운송';
      if(/선박직원법|승무기준|해기사/.test(t))return '선박직원법';
      if(/충돌방지|colreg|음향신호|등화|형상물/.test(t))return '충돌예방규칙';
      if(/선박안전법|검사|안전관리/.test(t))return '선박안전·검사';
      if(/해양환경|marpol|오염|폐기물|쓰레기/.test(t))return '해양환경·MARPOL';
      return '해사법규 기타';
    }
    if(subject==='영어'){
      if(/smcp|standard marine communication|wheel order|distress|dsc|vhf|not under command|starboard of you|sea protest/.test(t))return 'SMCP·해사통신';
      if(/charter|laytime|demurrage|dispatch|fio|berth terms|freight|ship owner|charterer/.test(t))return '용선·운송 영어';
      if(/cargo|stow|loading|discharg|hatch|stevedore|weight distribution|deck cargo/.test(t))return '화물·적부 영어';
      if(/sar|rescue|extinguisher|fire|solas|lifeboat|liferaft/.test(t))return '안전·구조 영어';
      if(/marpol|garbage|pollution|record book|incineration/.test(t))return '환경·MARPOL 영어';
      if(/how many|how much|translation|wrong explanation|fill the blank|proper word|improper one/.test(t))return '해사영어 어휘·문법';
      return '해사영어 독해·어휘';
    }
    return `${subject||'기타'} 일반`;
  }

  function dataRuleLabel(item,data){
    const text=questionText(item),rules=(data&&data.rules)||[];
    for(const rule of rules){
      if(rule&&rule.subject&&item&&rule.subject!==item.subject)continue;
      try{
        if(rule&&rule.pattern&&new RegExp(rule.pattern,'i').test(text)){
          return String(rule.label||rule.title||rule.name||rule.topic||rule.id||'').trim();
        }
      }catch(e){}
    }
    return '';
  }

  function conceptInfo(item,data){
    const subject=subjectOf(item),text=questionText(item);
    const broad=broadTopic(subject,text),ruleLabel=dataRuleLabel(item,data);
    const label=broad&&/일반$|기타$/.test(broad)&&ruleLabel?ruleLabel:broad;
    return {subject,label:label||ruleLabel||`${subject} 일반`,key:`${subject}|${label||ruleLabel||'general'}`};
  }
  global.mdPredictiveConceptInfo=conceptInfo;

  function statForItem(item,data,store){
    const grade=gradeOf(item),info=conceptInfo(item,data),root=(store||loadStore());
    const rec=grade&&root[grade]&&root[grade].concepts?root[grade].concepts[info.key]:null;
    return {grade,info,rec};
  }
  function smoothedAccuracy(rec){
    if(!rec)return 0.5;
    const attempts=Math.max(0,Number(rec.attempts)||0),correct=Math.max(0,Number(rec.correct)||0);
    return (correct+2)/(attempts+4); // 50% prior prevents one miss from dominating.
  }
  function weaknessScore(rec){
    if(!rec)return 0;
    const attempts=Math.max(0,Number(rec.attempts)||0),wrong=Math.max(0,Number(rec.wrong)||0);
    if(!attempts||!wrong)return 0;
    const accuracy=smoothedAccuracy(rec),reliability=Math.min(1,attempts/6);
    return clamp((1-accuracy)*(0.45+0.55*reliability)*(1+Math.min(0.35,wrong*0.04)),0,1);
  }
  function weaknessMultiplier(item,data){
    const {rec}=statForItem(item,data);
    if(!rec)return 1;
    const attempts=Math.max(0,Number(rec.attempts)||0),rawAcc=attempts?Math.max(0,Number(rec.correct)||0)/attempts:0.5;
    if(attempts>=5&&rawAcc>=0.85)return 0.92;
    const score=weaknessScore(rec);
    return clamp(1+score*0.95,0.92,1.80);
  }
  global.mdPredictiveWeaknessMultiplier=weaknessMultiplier;

  function conceptNeedRows(gradeId,store){
    const concepts=((store||loadStore())[gradeId]||{}).concepts||{};
    return Object.entries(concepts).map(([key,rec])=>{
      const attempts=Math.max(0,Number(rec.attempts)||0),correct=Math.max(0,Number(rec.correct)||0),wrong=Math.max(0,Number(rec.wrong)||0);
      return {key,rec,attempts,correct,wrong,accuracy:attempts?correct/attempts:0.5,score:weaknessScore(rec)};
    }).filter(row=>row.attempts>0&&row.wrong>0&&row.score>0.12).sort((a,b)=>b.score-a.score||b.wrong-a.wrong||b.attempts-a.attempts);
  }

  function adaptiveStudyOrder(candidates,data,progress,count){
    const rows=Array.isArray(candidates)?candidates.slice():[];
    const wanted=Math.max(0,Math.min(rows.length,Number(count)||0));
    if(wanted<3)return rows;
    const grade=gradeOf(rows[0]),store=loadStore(),needs=conceptNeedRows(grade,store);
    if(!needs.length)return rows;
    const byNeed=new Map(needs.map(row=>[row.key,row]));
    const weakBuckets=new Map();
    rows.forEach((item,index)=>{
      const info=conceptInfo(item,data),need=byNeed.get(info.key);
      if(!need)return;
      if(!weakBuckets.has(info.key))weakBuckets.set(info.key,{need,items:[]});
      weakBuckets.get(info.key).items.push({item,index});
    });
    if(!weakBuckets.size)return rows;

    const focusCount=Math.min(wanted,Math.max(1,Math.round(wanted*MAX_FOCUS_RATIO)),[...weakBuckets.values()].reduce((n,b)=>n+b.items.length,0));
    const buckets=[...weakBuckets.values()].sort((a,b)=>b.need.score-a.need.score);
    const scoreTotal=buckets.reduce((s,b)=>s+b.need.score,0)||1;
    const quotas=buckets.map(b=>{
      const exact=focusCount*b.need.score/scoreTotal;
      return {bucket:b,quota:Math.min(b.items.length,Math.floor(exact)),remainder:exact-Math.floor(exact)};
    });
    let assigned=quotas.reduce((s,q)=>s+q.quota,0),left=focusCount-assigned;
    quotas.sort((a,b)=>b.remainder-a.remainder||b.bucket.need.score-a.bucket.need.score);
    while(left>0){
      let changed=false;
      for(const q of quotas){
        if(left<=0)break;
        if(q.quota<q.bucket.items.length){q.quota++;left--;changed=true}
      }
      if(!changed)break;
    }

    const focus=[];
    quotas.sort((a,b)=>b.bucket.need.score-a.bucket.need.score).forEach(q=>{
      q.bucket.items.slice(0,q.quota).forEach(x=>focus.push({...x,score:q.bucket.need.score}));
    });
    focus.sort((a,b)=>b.score-a.score||a.index-b.index);
    const focusSet=new Set(focus.map(x=>x.item.key));
    const base=rows.filter(item=>!focusSet.has(item.key)),first=[],focusItems=focus.map(x=>x.item);
    let fi=0,bi=0;
    for(let pos=0;pos<wanted;pos++){
      const targetFocus=Math.round((pos+1)*focusItems.length/wanted);
      if(fi<targetFocus&&fi<focusItems.length)first.push(focusItems[fi++]);
      else if(bi<base.length)first.push(base[bi++]);
      else if(fi<focusItems.length)first.push(focusItems[fi++]);
    }
    const used=new Set(first.map(item=>item.key));
    return first.concat(rows.filter(item=>!used.has(item.key)));
  }
  global.mdAdaptiveStudyOrder=adaptiveStudyOrder;

  function currentPredictiveState(){
    try{
      if(typeof pastQueue==='undefined'||typeof pastAnswers==='undefined')return null;
      const queue=Array.isArray(pastQueue)?pastQueue:[],answers=Array.isArray(pastAnswers)?pastAnswers:[];
      if(!queue.length||!queue.some(q=>q&&q._predictiveMock))return null;
      return {queue,answers};
    }catch(e){return null}
  }
  function runSignature(queue,answers){
    let started='';
    try{if(typeof pastStartedAt!=='undefined')started=String(pastStartedAt||'')}catch(e){}
    const body=queue.map((q,i)=>`${String(q&&q._planKey||q&&q._year||i)}:${String(answers[i])}`).join('|');
    return `${started}|${body}`;
  }
  function captureRun(queue,answers){
    if(!queue.length||answers.length<queue.length||queue.some((q,i)=>answers[i]===null||answers[i]===undefined))return false;
    const sig=runSignature(queue,answers),seen=safeParse(RUNS_KEY,[]);
    if(Array.isArray(seen)&&seen.includes(sig))return false;
    const store=loadStore(),now=new Date().toISOString();
    queue.forEach((q,i)=>{
      if(!q||!q._predictiveMock)return;
      const grade=gradeOf(q);if(!grade||!store[grade])return;
      let item=q,data=null;
      try{if(q._planKey&&typeof ppGetItemByKey==='function')item=ppGetItemByKey(q._planKey)||q}catch(e){}
      try{if(typeof n3aData==='function')data=n3aData(grade)}catch(e){}
      const info=conceptInfo(item,data),concepts=store[grade].concepts;
      const rec=concepts[info.key]||{subject:info.subject,label:info.label,attempts:0,correct:0,wrong:0,lastAt:null};
      rec.subject=info.subject;rec.label=info.label;rec.attempts=(Number(rec.attempts)||0)+1;
      if(answers[i]===q['정답'])rec.correct=(Number(rec.correct)||0)+1;else rec.wrong=(Number(rec.wrong)||0)+1;
      rec.lastAt=now;concepts[info.key]=rec;
    });
    saveStore(store);
    safeStore(RUNS_KEY,[sig,...(Array.isArray(seen)?seen:[])].slice(0,60));
    return true;
  }

  function analyzeCurrent(queue,answers){
    const subjects=new Map(),concepts=new Map();
    queue.forEach((q,i)=>{
      if(!q||!q._predictiveMock)return;
      const grade=gradeOf(q),subject=subjectOf(q),correct=answers[i]===q['정답'];
      let item=q,data=null;
      try{if(q._planKey&&typeof ppGetItemByKey==='function')item=ppGetItemByKey(q._planKey)||q}catch(e){}
      try{if(typeof n3aData==='function')data=n3aData(grade)}catch(e){}
      const info=conceptInfo(item,data);
      const s=subjects.get(subject)||{subject,total:0,correct:0,wrong:0};
      s.total++;if(correct)s.correct++;else s.wrong++;subjects.set(subject,s);
      const c=concepts.get(info.key)||{key:info.key,subject:info.subject,label:info.label,total:0,correct:0,wrong:0};
      c.total++;if(correct)c.correct++;else c.wrong++;concepts.set(info.key,c);
    });
    const subjectRows=[...subjects.values()].map(r=>({...r,accuracy:r.total?r.correct/r.total:0})).sort((a,b)=>a.accuracy-b.accuracy||b.wrong-a.wrong);
    const conceptRows=[...concepts.values()].filter(r=>r.wrong>0).map(r=>{
      const missRate=r.total?r.wrong/r.total:0;
      return {...r,accuracy:r.total?r.correct/r.total:0,score:missRate*(1+Math.log1p(r.wrong))};
    }).sort((a,b)=>b.score-a.score||b.wrong-a.wrong||a.accuracy-b.accuracy);
    const totalScore=conceptRows.reduce((s,r)=>s+r.score,0)||1;
    conceptRows.forEach(r=>{r.share=r.score/totalScore});
    return {subjectRows,conceptRows};
  }

  function subjectRowHtml(row){
    const accuracy=pct(row.accuracy);
    return `<div style="padding:9px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:10px;font-size:12px"><b>${esc(row.subject)}</b><span>${row.correct}/${row.total} · 오답 ${row.wrong} · ${accuracy}%</span></div><div style="height:7px;background:#E2E8F0;border-radius:999px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${accuracy}%;background:#64748B"></div></div></div>`;
  }
  function conceptRowHtml(row,index){
    const accuracy=pct(row.accuracy),share=pct(row.share);
    const tone=accuracy<50?'#B91C1C':accuracy<70?'#92400E':'#475569';
    return `<div style="padding:10px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><span style="font-size:10px;font-weight:900;color:${tone}">우선 ${index+1}</span><div style="font-size:13px;font-weight:900;margin-top:2px">${esc(row.label)}</div><div style="font-size:10px;color:#64748B;margin-top:2px">${esc(row.subject)} · ${row.total}문제 중 ${row.wrong}개 오답</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:900;color:${tone}">${accuracy}%</div><div style="font-size:10px;color:#64748B">보강 ${share}%</div></div></div></div>`;
  }

  function resultHeading(root){
    const nodes=[...root.querySelectorAll('h1,h2,h3,h4,div,span')];
    return nodes.find(el=>el.children.length===0&&(el.textContent||'').trim()==='실전예측 모의 결과')||null;
  }
  function insertAnalysisCard(root,heading,card){
    const host=heading.closest('.card')||root;
    const firstWrong=[...host.querySelectorAll('div,span')].find(el=>el.children.length===0&&/^\d{4}년\s+\d+회\s*·/.test((el.textContent||'').trim()));
    if(firstWrong){
      let target=firstWrong;
      while(target.parentElement&&target.parentElement!==host)target=target.parentElement;
      if(target&&target!==host){host.insertBefore(card,target);return}
    }
    const buttonRow=[...host.querySelectorAll('button')].find(b=>(b.textContent||'').includes('합격 플랜'));
    if(buttonRow){
      let target=buttonRow;
      while(target.parentElement&&target.parentElement!==host)target=target.parentElement;
      if(target&&target!==host){host.insertBefore(card,target);return}
    }
    host.appendChild(card);
  }

  function addPredictiveAnalysis(){
    if(typeof document==='undefined')return;
    const root=document.getElementById('app');if(!root||document.getElementById('md-predictive-analysis'))return;
    const heading=resultHeading(root);if(!heading)return;
    const state=currentPredictiveState();if(!state)return;
    captureRun(state.queue,state.answers);
    const analysis=analyzeCurrent(state.queue,state.answers),grade=gradeOf(state.queue.find(q=>q&&q._predictiveMock));
    global.__mdLastPredictiveGrade=grade;
    global.__mdLastPredictiveKeys=state.queue.map(q=>q&&q._planKey).filter(Boolean);
    const weakest=analysis.conceptRows[0];
    const card=document.createElement('section');card.id='md-predictive-analysis';card.className='card';
    card.style.cssText='padding:16px;margin:16px 0;border-left:4px solid #7C3AED;background:#FAF5FF';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div style="font-size:17px;font-weight:900">파트별 약점 분석</div><div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.55">과목별 정답률과 세부 파트 오답률을 계산해 다음 예측 모의와 보강 학습 비중에 반영합니다.</div></div>${weakest?`<span class="tag" style="margin:0;background:#FEE2E2;color:#B91C1C">우선 보강 · ${esc(weakest.label)}</span>`:''}</div><div style="margin-top:13px"><div style="font-size:12px;font-weight:900;margin-bottom:3px">과목별 성적</div>${analysis.subjectRows.map(subjectRowHtml).join('')}</div><div style="margin-top:14px"><div style="font-size:12px;font-weight:900">보강 우선순위</div><div style="font-size:10px;color:#64748B;margin-top:3px">보강 비중은 이번 모의의 파트별 오답률과 오답 개수를 함께 반영합니다. 문항 수가 적은 파트는 참고용입니다.</div>${analysis.conceptRows.slice(0,5).map(conceptRowHtml).join('')||'<div style="font-size:11px;color:#64748B;padding:10px 0">보강이 필요한 파트가 없습니다.</div>'}</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:13px"><button class="btn btn-accent" id="md-weak-concept-start" ${analysis.conceptRows.length?'':'disabled'}>취약 파트 30문제 보강</button><button class="btn btn-outline" id="md-analysis-detail">반영 기준 보기</button></div><div id="md-analysis-rule" style="display:none;font-size:10px;color:#475569;line-height:1.6;margin-top:9px;padding:9px;background:#F8FAFC;border-radius:8px">기본 숙제의 급수 비율은 유지합니다. 신규 문제 슬롯 중 최대 35%만 취약 파트로 재배치하고, 나머지는 기존 시험일·빈출·최근성 기준을 유지합니다. 다음 실전예측 모의도 누적 파트 정답률에 따라 취약 파트가 더 자주 출제되도록 가중합니다.</div>`;
    insertAnalysisCard(root,heading,card);
    card.querySelector('#md-weak-concept-start').onclick=()=>global.startMaritimeWeakConceptDrill&&global.startMaritimeWeakConceptDrill(grade,30);
    card.querySelector('#md-analysis-detail').onclick=()=>{
      const el=card.querySelector('#md-analysis-rule'),open=el.style.display!=='none';el.style.display=open?'none':'block';
      card.querySelector('#md-analysis-detail').textContent=open?'반영 기준 보기':'반영 기준 닫기';
    };
  }

  function weightedWeakItems(gradeId,limit){
    let plan=null,pool=[],data=null,progress={};
    try{plan=ppLoadPlan();pool=(planPools&&planPools[gradeId])||[];data=typeof n3aData==='function'?n3aData(gradeId):null;progress=typeof ppLoadProgress==='function'?ppLoadProgress():{}}catch(e){return []}
    const store=loadStore(),needs=conceptNeedRows(gradeId,store);if(!needs.length)return [];
    const needMap=new Map(needs.map(r=>[r.key,r]));
    const last=new Set(global.__mdLastPredictiveKeys||[]),groups=new Map();
    pool.forEach((item,index)=>{
      const info=conceptInfo(item,data),need=needMap.get(info.key);if(!need)return;
      if(!groups.has(info.key))groups.set(info.key,{need,items:[]});
      let rec={};try{rec=typeof ppProgressFor==='function'?ppProgressFor(progress,item.key):(progress[item.key]||{})}catch(e){rec=progress[item.key]||{}}
      const itemScore=need.score*100+(Number(rec.wrong)||0)*7+(Number(item.count)||0)*2+(last.has(item.key)?-18:0)+(rec.mastered?-12:0);
      groups.get(info.key).items.push({item,index,itemScore});
    });
    const buckets=[...groups.values()].filter(g=>g.items.length).sort((a,b)=>b.need.score-a.need.score);if(!buckets.length)return [];
    buckets.forEach(g=>g.items.sort((a,b)=>b.itemScore-a.itemScore||a.index-b.index));
    const totalScore=buckets.reduce((s,b)=>s+b.need.score,0)||1,target=Math.max(1,Math.min(Number(limit)||30,pool.length));
    const quotas=buckets.map(b=>{const exact=target*b.need.score/totalScore;return {bucket:b,quota:Math.min(b.items.length,Math.floor(exact)),rem:exact-Math.floor(exact)}});
    let left=target-quotas.reduce((s,q)=>s+q.quota,0);quotas.sort((a,b)=>b.rem-a.rem||b.bucket.need.score-a.bucket.need.score);
    while(left>0){let changed=false;for(const q of quotas){if(left<=0)break;if(q.quota<q.bucket.items.length){q.quota++;left--;changed=true}}if(!changed)break}
    const picked=[];quotas.sort((a,b)=>b.bucket.need.score-a.bucket.need.score).forEach(q=>q.bucket.items.slice(0,q.quota).forEach(x=>picked.push(x.item)));
    return picked.slice(0,target);
  }

  global.startMaritimeWeakConceptDrill=async function(gradeId,limit){
    if(!['navi2','navi3'].includes(gradeId))return;
    try{
      if(typeof ppLoadPlan!=='function'||typeof ppBuildPools!=='function'||typeof ppHydrateKeys!=='function')throw new Error('학습 플랜 모듈을 불러오지 못했습니다.');
      const plan=ppLoadPlan();if(typeof renderPastLoading==='function')renderPastLoading('취약 파트 보강 문제를 만드는 중입니다');
      await ppBuildPools(plan);
      const items=weightedWeakItems(gradeId,limit||30);
      if(!items.length){if(typeof showToast==='function')showToast('누적된 파트별 약점 데이터가 아직 부족합니다.');if(typeof renderNavigatorPassPlan==='function')renderNavigatorPassPlan(gradeId);return}
      const keys=items.map(item=>item.key),hydrated=await ppHydrateKeys(keys);
      if(!hydrated.length)throw new Error('보강 문제 원문을 찾지 못했습니다.');
      if(typeof ppClearPassSessionCheckpoint==='function')ppClearPassSessionCheckpoint();
      planSessionKind='concept-weak';planSessionQueue=typeof shuffle==='function'?shuffle(hydrated):hydrated.slice();planSessionIdx=0;
      planSessionAnswers=new Array(planSessionQueue.length).fill(null);planSessionConfidence=new Array(planSessionQueue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();currentMode='pass-plan-session';
      renderNavigatorPassPlanCard();
    }catch(e){
      if(typeof showToast==='function')showToast(e.message||String(e));
      try{if(typeof renderNavigatorPassPlan==='function')renderNavigatorPassPlan(gradeId)}catch(_e){}
    }
  };

  function addPlanWeakButton(){
    if(typeof document==='undefined'||document.getElementById('md-concept-weak-plan-btn'))return;
    const root=document.getElementById('app');if(!root)return;
    const title=[...root.querySelectorAll('div')].find(el=>el.children.length===0&&(el.textContent||'').trim()==='취약문제 집중');if(!title)return;
    let grade='';try{if(typeof planEntrySubject!=='undefined'&&['navi2','navi3'].includes(planEntrySubject))grade=planEntrySubject}catch(e){}
    if(!grade)return;
    const needs=conceptNeedRows(grade,loadStore());if(!needs.length)return;
    const section=title.closest('.card')||title.parentElement;if(!section)return;
    const wrap=document.createElement('div');wrap.style.cssText='margin-top:9px';
    wrap.innerHTML=`<button class="btn btn-outline" id="md-concept-weak-plan-btn" style="width:100%;border-color:#7C3AED;color:#6D28D9">약점 파트 자동 보강 · 30문제</button><div style="font-size:10px;color:#64748B;margin-top:5px">누적 파트 정답률을 기준으로 보강 비중을 자동 배분합니다.</div>`;
    section.appendChild(wrap);wrap.querySelector('button').onclick=()=>global.startMaritimeWeakConceptDrill(grade,30);
  }

  let queued=false;
  function enhance(){
    if(queued||typeof document==='undefined')return;queued=true;
    const run=()=>{queued=false;try{addPredictiveAnalysis()}catch(e){console.warn('[adaptive-analytics] result analysis failed',e)}try{addPlanWeakButton()}catch(e){console.warn('[adaptive-analytics] plan button failed',e)}};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);
  }
  if(typeof document!=='undefined'){
    if(typeof MutationObserver!=='undefined')new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',enhance);enhance();
  }
})(typeof window!=='undefined'?window:globalThis);
