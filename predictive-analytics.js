// Predictive mock analytics + weak-topic profile
(function(global){
  'use strict';
  const PROFILE_KEY='md_weak_topic_profile_v1';

  function safeText(v){return String(v==null?'':v)}
  function subjectOf(q){
    const c=safeText(q&&q._predictiveConcept);
    if(c.includes('|'))return c.split('|')[0];
    const k=safeText(q&&q._planKey).split('|');
    return k.length>1?k[1]:(q&&q.subject)||'기타';
  }
  function topicOf(q){
    const subject=subjectOf(q);
    // Match the same question text used by homework; explanations/concept IDs
    // can contain unrelated keywords and must not change the classification.
    const text=q&&(q.question||q['문제']||q['질문'])||'';
    return global.__mdWeakTopicClassifier.classify(subject,text);
  }
  function stats(queue,answers){
    const subjects=new Map(),topics=new Map();
    (queue||[]).forEach((q,i)=>{
      if(!q||!q._predictiveMock||q._predictiveReview)return;
      const a=answers&&answers[i],answered=a!==null&&a!==undefined;
      const correct=answered&&a===q['정답'],subject=subjectOf(q),topic=topicOf(q),key=`${subject}|${topic}`;
      for(const [map,k,label] of [[subjects,subject,subject],[topics,key,topic]]){
        if(!map.has(k))map.set(k,{key:k,label,subject,total:0,attempts:0,correct:0,wrong:0,unanswered:0});
        const r=map.get(k);r.total++;
        if(!answered){r.unanswered++;continue}
        r.attempts++;if(correct)r.correct++;else r.wrong++;
      }
    });
    const finish=map=>[...map.values()].map(r=>({...r,
      score:r.total?Math.round(r.correct/r.total*100):0,
      accuracy:r.attempts?Math.round(r.correct/r.attempts*100):null,
      errorRate:r.attempts?Math.round(r.wrong/r.attempts*100):0,
      reviewRate:r.total?Math.round((r.wrong+r.unanswered)/r.total*100):0
    }));
    return {subjects:finish(subjects),topics:finish(topics)};
  }
  function reinforcement(rows){
    const weak=rows.filter(r=>r.wrong+(r.unanswered||0)>0).map(r=>{
      const total=r.total===undefined?r.attempts:r.total;
      return {...r,weight:(r.wrong+(r.unanswered||0)+0.5)/(total+1)*Math.sqrt(total)};
    });
    const total=weak.reduce((s,r)=>s+r.weight,0)||1;
    return weak.map(r=>({...r,targetShare:Math.round(r.weight/total*100)})).sort((a,b)=>b.targetShare-a.targetShare||b.reviewRate-a.reviewRate);
  }
  function aggregateProfile(group){
    const totals=new Map();
    for(const value of Object.values(group.subjects||{}))for(const run of Object.values(value||{}).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,10))for(const r of run.rows||[]){
      if(!totals.has(r.key))totals.set(r.key,{key:r.key,label:r.label,subject:r.subject,total:0,attempts:0,correct:0,wrong:0,unanswered:0});
      const sum=totals.get(r.key);for(const k of ['total','attempts','correct','wrong','unanswered'])sum[k]+=Number(r[k])||0;
    }
    const aggregated=[...totals.values()].map(r=>({...r,errorRate:r.attempts?Math.round(r.wrong/r.attempts*100):0,reviewRate:r.total?Math.round((r.wrong+r.unanswered)/r.total*100):0}));
    return Object.fromEntries(reinforcement(aggregated).map(r=>[r.key,{...r,topic:r.label}]));
  }
  function saveProfile(rows){
    if((pastQueue||[]).some(q=>q&&q._predictiveReview))return;
    let current={};try{current=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')||{}}catch(e){}
    if(!current.grades||typeof current.grades!=='object')current.grades={};
    const grade=String((pastQueue.find(q=>q&&q._planGrade)||{})._planGrade||
      ((pastQueue.find(q=>q&&q._planKey)||{})._planKey||'').split('|')[0]||'unknown');
    const group=current.grades[grade]||{subjects:{},topics:{}};
    if(!group.subjects)group.subjects={};
    const runId=String(typeof pastResultId!=='undefined'&&pastResultId?pastResultId:(typeof pastStartedAt==='undefined'?Date.now():pastStartedAt));
    const subjects=[...new Set(rows.map(r=>r.subject))];
    for(const subject of subjects){
      const prior=group.subjects[subject]||{};
      const run={id:runId,at:new Date().toISOString(),rows:rows.filter(r=>r.subject===subject)};
      const runs={...prior,[runId]:run};
      group.subjects[subject]=Object.fromEntries(Object.values(runs).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,10).map(r=>[r.id,r]));
    }
    group.topics=aggregateProfile(group);
    current.version=2;current.updatedAt=new Date().toISOString();current.grades[grade]=group;
    // Keep the old unscoped profile for clients that have not upgraded yet.
    if(!current.topics)current.topics={};
    try{
      const value=JSON.stringify(current);
      if(typeof safeStorageSet==='function')safeStorageSet(PROFILE_KEY,value,'취약 파트 분석');
      else localStorage.setItem(PROFILE_KEY,value);
    }catch(e){console.warn('취약 분석 저장 실패',e)}
    return group.topics;
  }
  function pctBar(value){return `<div style="height:7px;background:#E2E8F0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,value))}%;background:#7C3AED"></div></div>`}
  function render(){
    const app=document.getElementById('app');
    if(!app||!/(실전예측 모의 결과|실전 모의고사 결과)/.test(app.textContent||''))return;
    if(document.getElementById('md-predictive-analysis'))return;
    if(typeof pastQueue==='undefined'||typeof pastAnswers==='undefined')return;
    const s=stats(pastQueue,pastAnswers);if(!s.subjects.length)return;
    const boost=Object.values(saveProfile(s.topics)||{}).sort((a,b)=>b.targetShare-a.targetShare);
    const host=document.createElement('section');host.id='md-predictive-analysis';host.className='card';host.style.cssText='margin-top:14px;border-left:4px solid #7C3AED';
    const subjects=s.subjects.sort((a,b)=>a.score-b.score).map(r=>`<div style="padding:11px;border:1px solid #E2E8F0;border-radius:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${r.label}</b><b>${r.score}점</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 7px">${r.total}문제 · 정답 ${r.correct} · 오답 ${r.wrong} · 무응답 ${r.unanswered}<br>푼 문제 중 정답률 ${r.accuracy===null?'—':r.accuracy+'%'} (응답 ${r.attempts}문제)</div>${pctBar(r.score)}</div>`).join('');
    const weak=boost.slice(0,6).map((r,i)=>`<div style="padding:10px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${i+1}. ${r.label}</b><span style="font-size:10px;color:#64748B;margin-left:5px">${r.subject}</span></div><b>보강 ${r.targetShare}%</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 6px">${r.total}문제 · 오답 ${r.wrong} · 무응답 ${r.unanswered} · 미해결 ${r.reviewRate}%</div>${pctBar(r.targetShare)}</div>`).join('');
    host.innerHTML=`<div style="font-size:18px;font-weight:900">취약 파트 분석</div><div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.55">과목별 점수는 무응답을 포함한 전체 문항 기준(100점 만점)입니다. 푼 문제 중 정답률은 별도로 표시합니다. 보강 %는 오답·무응답과 문항 수를 반영한 상대 비중입니다.</div><div style="font-size:13px;font-weight:900;margin:14px 0 8px">과목별 성적 · 전체 문항 기준</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${subjects}</div><div style="font-size:13px;font-weight:900;margin:16px 0 5px">다음 학습 보강 비율 · 누적 결과</div>${weak||'<div style="font-size:12px;color:#64748B">누적 결과에서 뚜렷한 취약 파트가 없습니다.</div>'}<div style="font-size:10px;color:#64748B;margin-top:10px;line-height:1.5">저장: 급수·과목별 최근 10회 결과를 누적합니다. 적용: 이후 실전예측 모의 + 오늘 숙제의 신규문제 우선순위. 오답 복습 일정은 기존 회복 로직을 그대로 유지합니다.</div>`;
    const firstCard=app.querySelector('.card');
    if(firstCard&&firstCard.parentNode)firstCard.parentNode.insertBefore(host,firstCard.nextSibling);else app.appendChild(host);
  }
  global.__mdWeakTopicAnalytics={subjectOf,topicOf,stats,reinforcement,aggregateProfile};
  new MutationObserver(()=>requestAnimationFrame(render)).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',render,{once:true});
  setTimeout(render,0);
})(window);
