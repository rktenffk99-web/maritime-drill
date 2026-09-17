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
    const s=subjectOf(q),t=[q&&q.question,q&&q['문제'],q&&q['질문'],q&&q['해설'],q&&q._predictiveConcept].map(safeText).join(' ').normalize('NFKC').toLowerCase();
    if(s==='항해'){
      if(/자오선|천체|적위|정거|방위각|고도|latitude|declination|celestial/.test(t))return '천문항해';
      if(/레이더|radar|반사|측엽|거짓상/.test(t))return '레이더';
      if(/자기|자차|compass|flinders|magnet|나침반/.test(t))return '자기컴퍼스';
      if(/선속계|doppler|log|대지속력|대수속력/.test(t))return '항해계기';
      if(/중분위도|대권|항정|항법|mercator|rhumb/.test(t))return '항법계산';
      if(/해도|수로|chart|publication/.test(t))return '해도·항해도서';
      return '항해 일반';
    }
    if(s==='법규'){
      if(/해상교통안전법|통항|분리수역|연안통항대|예인선열|거대선/.test(t))return '해상교통안전법';
      if(/상법|선하증권|운송인|감항|송하인|수하인|해상운송/.test(t))return '상법·해상운송';
      if(/선박직원법|승무기준|해기사/.test(t))return '선박직원법';
      if(/충돌|항법|등화|형상물|colreg/.test(t))return '충돌예방규칙';
      return '법규 일반';
    }
    if(s==='영어'){
      if(/smcp|wheel order|starboard|port of you|steady|meet her/.test(t))return 'SMCP·표준해사영어';
      if(/charter|laytime|demurrage|dispatch|fio|berth|loading|discharg/.test(t))return '용선·하역 영어';
      if(/sar|rescue|distress|vhf|khz|mhz|frequency|coordinator/.test(t))return 'SAR·통신 영어';
      if(/fire|extinguisher|garbage|marpol|pollution/.test(t))return '안전·환경 영어';
      if(/how many|how much|preposition|translation|wrong explanation|fill the blank/.test(t))return '문법·어휘·번역';
      return '해사영어 일반';
    }
    return `${s} 일반`;
  }
  function stats(queue,answers){
    const subjects=new Map(),topics=new Map();
    (queue||[]).forEach((q,i)=>{
      if(!q||!q._predictiveMock)return;
      const a=answers&&answers[i],answered=a!==null&&a!==undefined;
      if(!answered)return;
      const correct=a===q['정답'],subject=subjectOf(q),topic=topicOf(q),key=`${subject}|${topic}`;
      for(const [map,k,label] of [[subjects,subject,subject],[topics,key,topic]]){
        if(!map.has(k))map.set(k,{key:k,label,subject,attempts:0,correct:0,wrong:0});
        const r=map.get(k);r.attempts++;if(correct)r.correct++;else r.wrong++;
      }
    });
    const finish=map=>[...map.values()].map(r=>({...r,accuracy:r.attempts?Math.round(r.correct/r.attempts*100):0,errorRate:r.attempts?Math.round(r.wrong/r.attempts*100):0}));
    return {subjects:finish(subjects),topics:finish(topics)};
  }
  function reinforcement(rows){
    const weak=rows.filter(r=>r.wrong>0).map(r=>({...r,score:(r.wrong+0.5)/(r.attempts+1)*Math.sqrt(r.attempts)}));
    const total=weak.reduce((s,r)=>s+r.score,0)||1;
    return weak.map(r=>({...r,targetShare:Math.round(r.score/total*100)})).sort((a,b)=>b.targetShare-a.targetShare||b.errorRate-a.errorRate);
  }
  function saveProfile(rows){
    const current={version:1,updatedAt:new Date().toISOString(),topics:{}};
    rows.forEach(r=>{current.topics[r.key]={subject:r.subject,topic:r.label,attempts:r.attempts,wrong:r.wrong,errorRate:r.errorRate,targetShare:r.targetShare}});
    try{localStorage.setItem(PROFILE_KEY,JSON.stringify(current))}catch(e){}
  }
  function pctBar(value){return `<div style="height:7px;background:#E2E8F0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,value))}%;background:#7C3AED"></div></div>`}
  function render(){
    const app=document.getElementById('app');
    if(!app||!/(실전예측 모의 결과)/.test(app.textContent||''))return;
    if(document.getElementById('md-predictive-analysis'))return;
    if(typeof pastQueue==='undefined'||typeof pastAnswers==='undefined')return;
    const s=stats(pastQueue,pastAnswers),boost=reinforcement(s.topics);if(!s.subjects.length)return;
    saveProfile(boost);
    const host=document.createElement('section');host.id='md-predictive-analysis';host.className='card';host.style.cssText='margin-top:14px;border-left:4px solid #7C3AED';
    const subjects=s.subjects.sort((a,b)=>a.accuracy-b.accuracy).map(r=>`<div style="padding:11px;border:1px solid #E2E8F0;border-radius:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${r.label}</b><b>${r.accuracy}%</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 7px">${r.attempts}문제 · 정답 ${r.correct} · 오답 ${r.wrong}</div>${pctBar(r.accuracy)}</div>`).join('');
    const weak=boost.slice(0,6).map((r,i)=>`<div style="padding:10px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${i+1}. ${r.label}</b><span style="font-size:10px;color:#64748B;margin-left:5px">${r.subject}</span></div><b>보강 ${r.targetShare}%</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 6px">${r.attempts}문제 중 ${r.wrong}개 오답 · 오답률 ${r.errorRate}%</div>${pctBar(r.targetShare)}</div>`).join('');
    host.innerHTML=`<div style="font-size:18px;font-weight:900">취약 파트 분석</div><div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.55">과목별 정답률과 세부 파트 오답을 계산해 다음 학습의 출제 비중에 반영합니다. 보강 %는 이번 결과의 오답률과 표본 수를 함께 반영한 상대 비중입니다.</div><div style="font-size:13px;font-weight:900;margin:14px 0 8px">과목별 성적</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${subjects}</div><div style="font-size:13px;font-weight:900;margin:16px 0 5px">다음 학습 보강 비율</div>${weak||'<div style="font-size:12px;color:#64748B">현재 뚜렷한 취약 파트가 없습니다.</div>'}<div style="font-size:10px;color:#64748B;margin-top:10px;line-height:1.5">적용: 이후 실전예측 모의의 가중 랜덤 + 오늘 숙제의 신규문제 우선순위. 오답 복습 일정은 기존 회복 로직을 그대로 유지합니다.</div>`;
    const firstCard=app.querySelector('.card');
    if(firstCard&&firstCard.parentNode)firstCard.parentNode.insertBefore(host,firstCard.nextSibling);else app.appendChild(host);
  }
  global.__mdWeakTopicAnalytics={subjectOf,topicOf,stats,reinforcement};
  new MutationObserver(()=>requestAnimationFrame(render)).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',render,{once:true});
  setTimeout(render,0);
})(window);
