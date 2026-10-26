// Predictive mock analytics + weak-topic profile
(function(global){
  'use strict';
  const PROFILE_KEY='md_weak_topic_profile_v1';
  const EVALUATION_SCORE_KEY='md_evaluation_score_history_v1';

  function safeText(v){return String(v==null?'':v)}
  function plain(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
  function htmlText(v){return safeText(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function profileCount(v){
    if(typeof v!=='number'&&typeof v!=='string')return 0;
    const n=Number(v);return Number.isFinite(n)?Math.floor(Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,n))):0;
  }
  function subjectOf(q){
    const c=safeText(q&&q._predictiveConcept);
    if(c.includes('|'))return c.split('|')[0];
    const k=safeText(q&&q._planKey).split('|');
    return (q&&q.subject)||(q&&q['과목'])||(k.length>1?k[1]:'기타');
  }
  function topicOf(q){
    const subject=subjectOf(q);
    // Match the same question text used by homework; explanations/concept IDs
    // can contain unrelated keywords and must not change the classification.
    const text=q&&(q.question||q['문제']||q['질문'])||'';
    return global.__mdWeakTopicClassifier.classify(subject,text,q&&(q.choices||q['선택지']));
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
  const EVIDENCE_HALF_LIFE_DAYS=30;
  const MIN_FULL_EVIDENCE=3;
  function evidenceDecay(at,now=Date.now()){
    const time=Date.parse(at||'');
    if(!Number.isFinite(time))return 0.25;
    const days=Math.max(0,(Number(now)-time)/86400000);
    return Math.pow(0.5,days/EVIDENCE_HALF_LIFE_DAYS);
  }
  function reinforcement(rows){
    const weak=rows.filter(r=>(Number(r.wrong)||0)>0).map(r=>{
      const attempts=Math.max(0,Number(r.effectiveAttempts??r.attempts)||0);
      const wrong=Math.max(0,Number(r.effectiveWrong??r.wrong)||0);
      const confidence=attempts/(attempts+5);
      const estimatedError=(wrong+1)/(attempts+2);
      const weight=wrong>0?estimatedError*Math.sqrt(attempts)*confidence:0;
      const multiplier=1+Math.min(attempts<MIN_FULL_EVIDENCE?0.05:0.75,0.75*estimatedError*confidence);
      return {...r,weight,evidenceConfidence:confidence,boostMultiplier:Math.min(1.75,multiplier)};
    }).filter(r=>r.weight>0.000001);
    const total=weak.reduce((sum,row)=>sum+row.weight,0)||1;
    return weak.map(r=>({...r,reviewRate:r.errorRate,targetShare:Math.round(r.weight/total*100)}))
      .sort((a,b)=>b.boostMultiplier-a.boostMultiplier||b.weight-a.weight);
  }
  function aggregateProfile(group,extraEvidence=[]){
    const totals=new Map();
    function add(r,decay){
      if(!plain(r)||!r.key)return;
      if(!totals.has(r.key))totals.set(r.key,{key:r.key,label:r.label,subject:r.subject,total:0,attempts:0,correct:0,wrong:0,unanswered:0,effectiveAttempts:0,effectiveWrong:0});
      const sum=totals.get(r.key);
      for(const k of ['total','attempts','correct','wrong','unanswered'])sum[k]=Math.min(Number.MAX_SAFE_INTEGER,sum[k]+profileCount(r[k]));
      sum.effectiveAttempts+=profileCount(r.attempts)*decay;
      sum.effectiveWrong+=profileCount(r.wrong)*decay;
    }
    for(const value of Object.values(plain(group)&&plain(group.subjects)?group.subjects:{})){
      for(const run of Object.values(plain(value)?value:{}).filter(plain).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,10)){
        for(const r of Array.isArray(run.rows)?run.rows:[])add(r,evidenceDecay(run.at));
      }
    }
    for(const r of Array.isArray(extraEvidence)?extraEvidence:[])add(r,evidenceDecay(r.at));
    const rows=[...totals.values()].map(r=>({...r,errorRate:r.attempts?Math.round(r.wrong/r.attempts*100):0,reviewRate:r.total?Math.round((r.wrong+r.unanswered)/r.total*100):0}));
    return Object.fromEntries(reinforcement(rows).map(r=>[r.key,{...r,topic:r.label}]));
  }
  function recentHomeworkEvidence(gradeId){
    const api=global.__mdPassPlanLearningAPI;
    if(!api||typeof api.getRecentTopicEvidence!=='function')return [];
    let items=[];try{items=api.getRecentTopicEvidence(gradeId)||[]}catch(e){return []}
    const rows=[];
    for(const item of Array.isArray(items)?items:[]){
      const subject=subjectOf(item),label=topicOf(item),key=`${subject}|${label}`;
      const events=Array.isArray(item.recentOutcomes)?item.recentOutcomes.slice(-20):[];
      if(events.length){
        for(const event of events){
          if(!plain(event)||/mock|evaluation/.test(String(event.mode||'')))continue;
          const outcome=String(event.outcome||'');
          if(!['correct','sure','unsure','wrong'].includes(outcome))continue;
          const wrong=outcome==='wrong'?1:0;
          rows.push({key,label,subject,at:event.date,total:1,attempts:1,correct:1-wrong,wrong,unanswered:0});
        }
      }else if(item.lastDate&&!/mock|evaluation/.test(String(item.lastPracticeMode||''))&&['correct','sure','unsure','wrong'].includes(String(item.lastOutcome||''))){
        // Old records have no event identities: use only the latest homework outcome,
        // never re-count their cumulative counters which already include mock papers.
        const wrong=item.lastOutcome==='wrong'?1:0;
        rows.push({key,label,subject,at:item.lastDate,total:1,attempts:1,correct:1-wrong,wrong,unanswered:0});
      }
    }
    return rows;
  }
  const profileCache=new Map();
  function getProfileForGrade(gradeId){
    let raw='{}',progressRaw='',planRaw='';
    const api=global.__mdPassPlanLearningAPI;
    try{raw=localStorage.getItem(PROFILE_KEY)||'{}';progressRaw=api&&typeof api.getEvidenceRevision==='function'?api.getEvidenceRevision():localStorage.getItem('md_nav23_pass_progress_v1')||'';planRaw=localStorage.getItem('md_nav23_pass_plan_v1')||''}catch(e){}
    const now=Date.now(),prior=profileCache.get(gradeId);
    if(prior&&prior.raw===raw&&prior.progressRaw===progressRaw&&prior.planRaw===planRaw&&prior.api===api&&now-prior.at<60000)return prior.value;
    let current={};try{current=JSON.parse(raw)||{}}catch(e){}
    const group=plain(current.grades)&&plain(current.grades[gradeId])?current.grades[gradeId]:null;
    const evidence=recentHomeworkEvidence(gradeId);
    let value;
    if(group)value=aggregateProfile(group,evidence);
    else {
      const legacy=current.version>=2?{}:(plain(current.topics)?current.topics:{});
      value=Object.keys(legacy).length?aggregateProfile({subjects:{legacy:{legacy:{at:current.updatedAt||null,rows:Object.values(legacy)}}}},evidence):aggregateProfile({},evidence);
    }
    // Candidate weighting calls this many times per paper. Reuse the parsed
    // profile until learning/storage changes; time decay refreshes each minute.
    profileCache.set(gradeId,{raw,progressRaw,planRaw,api,at:now,value});
    return value;
  }
  function saveProfile(rows){
    if((pastQueue||[]).some(q=>q&&(q._predictiveReview||q._evaluationMock)))return {}; // evaluation papers must not train the adaptive profile
    let current={};try{current=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')||{}}catch(e){}
    if(!plain(current))current={};
    if(!plain(current.grades))current.grades={};
    const grade=String((pastQueue.find(q=>q&&q._planGrade)||{})._planGrade||
      ((pastQueue.find(q=>q&&q._planKey)||{})._planKey||'').split('|')[0]||'unknown');
    const group=plain(current.grades[grade])?current.grades[grade]:{subjects:{},topics:{}};
    if(!plain(group.subjects))group.subjects={};
    const runId=String(typeof pastResultId!=='undefined'&&pastResultId?pastResultId:(typeof pastStartedAt==='undefined'?Date.now():pastStartedAt));
    const subjects=[...new Set(rows.map(r=>r.subject))];
    for(const subject of subjects){
      const prior=group.subjects[subject]||{};
      const run={id:runId,at:prior[runId]&&prior[runId].at||new Date().toISOString(),rows:rows.filter(r=>r.subject===subject)};
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
  function loadEvaluationScores(){
    try{
      const v=JSON.parse(localStorage.getItem(EVALUATION_SCORE_KEY)||'{}');
      if(!plain(v))return {};
      return Object.fromEntries(Object.entries(v).filter(([,rows])=>Array.isArray(rows)).map(([grade,rows])=>[grade,rows.filter(r=>plain(r)&&typeof r.score==='number'&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100).slice(0,10)]));
    }catch(e){return {}}
  }
  function evaluationSignature(queue){
    const counts={};
    for(const q of Array.isArray(queue)?queue:[]){const subject=subjectOf(q);counts[subject]=(counts[subject]||0)+1}
    return Object.keys(counts).sort().map(subject=>`${subject}:${counts[subject]}`).join('|');
  }
  function saveEvaluationScore(historyKey,row,label='평가용 모의 점수'){
    // Legacy grade-only arrays remain intact. New comparable histories live at
    // grade + subject/count signature, so a one-subject drill cannot lift a full-paper average.
    let raw={};try{raw=JSON.parse(localStorage.getItem(EVALUATION_SCORE_KEY)||'{}')||{}}catch(e){}
    if(!plain(raw))raw={};
    const list=(loadEvaluationScores()[historyKey]||[]),id=String(row&&row.id||'');
    if(id&&list.some(x=>String(x&&x.id||'')===id))return list;
    raw[historyKey]=[row,...list].slice(0,10);
    try{
      const value=JSON.stringify(raw);
      if(typeof safeStorageSet==='function')safeStorageSet(EVALUATION_SCORE_KEY,value,label);
      else localStorage.setItem(EVALUATION_SCORE_KEY,value);
    }catch(e){console.warn('평가용 모의 점수 저장 실패',e)}
    return raw[historyKey];
  }
  function evaluationSummary(queue,answers,persist=true){
    const rows=Array.isArray(queue)?queue:[],total=rows.length;
    const answered=rows.reduce((n,q,i)=>n+((answers&&answers[i]!==null&&answers[i]!==undefined)?1:0),0);
    const correct=rows.reduce((n,q,i)=>n+((answers&&answers[i]===q['정답'])?1:0),0);
    const score=total?Math.round(correct/total*100):0;
    const first=rows.find(q=>q&&q._planKey),grade=String(first&&first._planGrade||first&&first._planKey||'navi2').split('|')[0];
    const signature=evaluationSignature(rows),historyKey=`${grade}|${signature}`;
    const explanationViewed=rows.some(q=>q&&(q._evaluationExplanationViewed===true||q._mockHintViewed===true));
    const complete=total>0&&answered===total;
    let history=loadEvaluationScores()[historyKey]||[];
    if(persist&&complete&&!explanationViewed){
      const id=String((typeof pastResultId!=='undefined'&&pastResultId)||((typeof pastStartedAt!=='undefined'&&pastStartedAt)||Date.now()));
      history=saveEvaluationScore(historyKey,{id,at:new Date().toISOString(),score,correct,total,signature});
    }
    const recent=history.slice(0,3),avg=recent.length?Math.round(recent.reduce((s,r)=>s+(Number(r.score)||0),0)/recent.length*10)/10:null;
    return {grade,signature,historyKey,total,answered,correct,score,complete,explanationViewed,recentCount:recent.length,recentAverage:avg};
  }
  // Unified papers have a new selection policy. Keep their score history
  // separate from every legacy evaluation scope without migrating or deleting it.
  function unifiedSummary(queue,answers,persist=true){
    const rows=Array.isArray(queue)?queue:[],total=rows.length;
    const answered=rows.reduce((n,q,i)=>n+((answers&&answers[i]!==null&&answers[i]!==undefined)?1:0),0);
    const correct=rows.reduce((n,q,i)=>n+((answers&&answers[i]===q['정답'])?1:0),0);
    const score=total?Math.round(correct/total*100):0;
    const first=rows.find(q=>q&&q._planKey),grade=String(first&&first._planGrade||first&&first._planKey||'navi2').split('|')[0];
    const signature=evaluationSignature(rows),historyKey=`unified-v1|${grade}|${signature}`;
    const explanationViewed=rows.some(q=>q&&(q._unifiedExplanationViewed===true||q._evaluationExplanationViewed===true||q._mockHintViewed===true));
    const complete=total>0&&answered===total;
    const eligible=total>0&&rows.every(q=>q&&q._unifiedMock===true&&!q._predictiveReview&&!q._evaluationMock);
    let history=loadEvaluationScores()[historyKey]||[];
    if(persist&&eligible&&complete&&!explanationViewed){
      const id=String((typeof pastResultId!=='undefined'&&pastResultId)||((typeof pastStartedAt!=='undefined'&&pastStartedAt)||Date.now()));
      history=saveEvaluationScore(historyKey,{id,at:new Date().toISOString(),score,correct,total,signature,mode:'unified-v1'},'모의시험 점수');
    }
    const recent=history.slice(0,3),avg=recent.length?Math.round(recent.reduce((s,r)=>s+(Number(r.score)||0),0)/recent.length*10)/10:null;
    return {grade,signature,historyKey,total,answered,correct,score,complete,eligible,explanationViewed,recentCount:recent.length,recentAverage:avg};
  }
  // Persist analysis inside the submission transaction, before deleting its answers.
  function persistResult(queue,answers){
    if(!Array.isArray(queue)||!queue.length||!queue.every(q=>q&&q._predictiveMock&&!q._predictiveReview))return;
    const result=stats(queue,answers);if(!result.subjects.length)return;
    saveProfile(result.topics);
    if(queue.some(q=>q&&q._evaluationMock))evaluationSummary(queue,answers);
    if(queue.every(q=>q&&q._unifiedMock===true))unifiedSummary(queue,answers);
  }
  function pctBar(value){return `<div style="height:7px;background:#E2E8F0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,value))}%;background:#7C3AED"></div></div>`}
  function render(){
    const app=document.getElementById('app');
    if(!app||!/(실전예측 모의 결과|실전 모의고사 결과|평가용 모의고사 결과|모의시험 결과|빈출·취약 연습 결과)/.test(app.textContent||''))return;
    if(document.getElementById('md-predictive-analysis'))return;
    if(typeof pastQueue==='undefined'||typeof pastAnswers==='undefined')return;
    // The generic title is also used by ordinary year/session papers. Require
    // an entirely plan-backed paper before writing any score or weak profile.
    if(!Array.isArray(pastQueue)||!pastQueue.length||!pastQueue.every(q=>q&&q._predictiveMock&&!q._predictiveReview))return;
    const s=stats(pastQueue,pastAnswers);if(!s.subjects.length)return;
    const isEvaluation=(pastQueue||[]).some(q=>q&&q._evaluationMock);
    const isUnified=(pastQueue||[]).length>0&&pastQueue.every(q=>q&&q._unifiedMock===true);
    const grade=String((pastQueue.find(q=>q&&q._planGrade)||{})._planGrade||'');
    const boost=Object.values(getProfileForGrade(grade)||{}).sort((a,b)=>b.boostMultiplier-a.boostMultiplier);
    const evaluation=isEvaluation?evaluationSummary(pastQueue,pastAnswers,false):null;
    const unified=isUnified?unifiedSummary(pastQueue,pastAnswers,false):null;
    const host=document.createElement('section');host.id='md-predictive-analysis';host.className='card';host.style.cssText='margin-top:14px;border-left:4px solid #7C3AED';
    const subjects=s.subjects.sort((a,b)=>a.score-b.score).map(r=>`<div style="padding:11px;border:1px solid #E2E8F0;border-radius:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${htmlText(r.label)}</b><b>${r.score}점</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 7px">${r.total}문제 · 정답 ${r.correct} · 오답 ${r.wrong} · 무응답 ${r.unanswered}<br>푼 문제 중 정답률 ${r.accuracy===null?'—':r.accuracy+'%'} (응답 ${r.attempts}문제)</div>${pctBar(r.score)}</div>`).join('');
    const weak=boost.slice(0,6).map((r,i)=>`<div style="padding:10px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>${i+1}. ${htmlText(r.label)}</b><span style="font-size:10px;color:#64748B;margin-left:5px">${htmlText(r.subject)}</span></div><b>취약 가중치 ${(Number(r.boostMultiplier)||1).toFixed(2)}배</b></div><div style="font-size:11px;color:#64748B;margin:4px 0 6px">${r.attempts}문제 응답 · 오답 ${r.wrong} · 오답률 ${r.errorRate}% · 최근성·표본수 반영</div>${pctBar(Math.round((r.boostMultiplier-1)/0.75*100))}</div>`).join('');
    const evaluationBlock=evaluation?`<div style="font-size:18px;font-weight:900">평가용 모의고사 분석</div><div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.55">개인 취약도·학습 진도에 영향을 주지 않는 점수 측정용 결과입니다. 미응답은 현재 점수에는 0점으로 반영되지만 완료한 모의만 최근 평균에 저장합니다.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px"><div style="padding:11px;border-radius:9px;background:#F8FAFC"><b>이번 점수 ${evaluation.score}%</b><div style="font-size:10px;color:#64748B">${evaluation.correct}/${evaluation.total} · 응답 ${evaluation.answered}/${evaluation.total}</div></div><div style="padding:11px;border-radius:9px;background:#F8FAFC"><b>동일 과목 구성 최근 ${evaluation.recentCount}회 평균 ${evaluation.recentAverage===null?'—':evaluation.recentAverage+'%'}</b><div style="font-size:10px;color:#64748B">${evaluation.explanationViewed?'힌트·해설 열람 기록 제외':evaluation.complete?'이번 기록 포함':'미완료라 이번 기록 제외'}</div></div></div>`:'';
    const unifiedBlock=unified?`<div data-unified-score-summary><div style="font-size:18px;font-weight:900">모의시험 성적 추이</div><div style="font-size:12px;color:#475569;margin-top:5px;line-height:1.6">같은 과목 구성의 완료한 모의시험을 비교합니다. 회차별 난이도 차이가 있어 점수 추이는 참고용입니다.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0"><div style="padding:11px;border-radius:9px;background:#F8FAFC"><b>이번 점수 ${unified.score}점</b><div style="font-size:11px;color:#475569">정답 ${unified.correct}/${unified.total} · 응답 ${unified.answered}/${unified.total}</div></div><div style="padding:11px;border-radius:9px;background:#F8FAFC"><b>동일 과목 구성 최근 ${unified.recentCount}회 평균 ${unified.recentAverage===null?'—':unified.recentAverage+'점'}</b><div style="font-size:11px;color:#475569">${unified.explanationViewed?'힌트·해설 열람 기록 제외':unified.complete?'이번 기록 포함':'미완료라 이번 기록 제외'}</div></div></div><div style="font-size:12px;color:#475569;line-height:1.6;margin-bottom:16px">채점한 오답은 복습에 반영됩니다. 미응답은 점수에 0점으로 반영되며 취약도에는 반영하지 않습니다.</div></div>`:'';
    host.innerHTML=isEvaluation?`${evaluationBlock}<div style="font-size:13px;font-weight:900;margin:14px 0 8px">과목별 성적 · 전체 문항 기준</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${subjects}</div>`:`${unifiedBlock}<div style="font-size:18px;font-weight:900">취약 파트 분석</div><div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.55">과목별 점수는 무응답을 포함한 전체 문항 기준(100점 만점)입니다. 푼 문제 중 정답률은 별도로 표시합니다. 취약 가중치는 실제 오답, 최근 숙제 결과, 표본 수와 경과 시간을 반영하며 실제 배정 비율을 뜻하지 않습니다. 무응답은 점수에는 반영되지만 취약도에는 반영하지 않습니다.</div><div style="font-size:13px;font-weight:900;margin:14px 0 8px">과목별 성적 · 전체 문항 기준</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${subjects}</div><div style="font-size:13px;font-weight:900;margin:16px 0 5px">다음 학습 취약 가중치 · 최근 학습 반영</div>${weak||'<div style="font-size:12px;color:#64748B">누적 결과에서 뚜렷한 취약 파트가 없습니다.</div>'}<div style="font-size:10px;color:#64748B;margin-top:10px;line-height:1.5">급수·과목별 최근 10회 모의와 최근 숙제 기록을 함께 봅니다. 오래된 기록은 30일 반감기로 줄이고, 3회 미만 표본의 가중치 증가는 최대 1.05배입니다. 가중치는 빈출·취약 연습과 숙제 신규문제 순서에 적용되며 실제 배정 비율과 다릅니다.</div>`;
    const firstCard=app.querySelector('.card');
    if(firstCard&&firstCard.parentNode)firstCard.parentNode.insertBefore(host,firstCard.nextSibling);else app.appendChild(host);
  }
  global.__mdWeakTopicAnalytics={subjectOf,topicOf,stats,reinforcement,aggregateProfile,getProfileForGrade,recentHomeworkEvidence,evidenceDecay,evaluationSignature,evaluationSummary,unifiedSummary,loadEvaluationScores,persistResult};
  new MutationObserver(()=>requestAnimationFrame(render)).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',render,{once:true});
  setTimeout(render,0);
})(window);
