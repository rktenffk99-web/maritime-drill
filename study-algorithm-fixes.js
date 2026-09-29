// Study algorithm corrections: mandatory-new preservation, safer same-day rechecks,
// unanswered mock isolation, and a neutral evaluation mock mode.
(function(global){
  'use strict';

  const EVAL_HISTORY_KEY='md_evaluation_mock_history_v1';
  const INSTALL_MARK='__mdStudyAlgorithmFixesInstalled';

  const text=v=>String(v==null?'':v).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  function itemMapFor(pools){
    const map=new Map();
    for(const grade of ['navi2','navi3'])for(const item of (pools&&pools[grade]||[])){
      if(item&&item.key)map.set(item.key,item);
    }
    return map;
  }

  function isWeakDue(item,progress,today){
    if(!item)return false;
    const r=ppProgressFor(progress,item.key);
    if(!ppIsDue(r,today))return false;
    const attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
    return r.status==='weak'||r.lastOutcome==='wrong'||r.lastOutcome==='unsure'||((Number(r.wrong)||0)>0&&accuracy<0.75);
  }

  function isStrongDue(item,progress,today){
    if(!item)return false;
    const r=ppProgressFor(progress,item.key);
    if(!ppIsDue(r,today))return false;
    const attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
    return !!r.mastered&&attempts>=3&&accuracy>=0.85;
  }

  function repairBalancedAssignment(plan,pools,progress,today,original,balanced){
    if(!balanced||!Array.isArray(balanced.keys)||!original||!Array.isArray(original.keys))return balanced;
    const active=['navi2','navi3'].filter(g=>plan&&plan.grades&&plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate);
    if(active.length!==1)return balanced;
    const grade=active[0],map=itemMapFor(pools);
    const required=Math.max(0,Number(original.requiredNew)||0);
    if(!required)return balanced;

    // The pre-balance builder already chose the minimum unseen set needed for deadline coverage.
    // Preserve that set before allowing the subject-balancer to use the remaining slots.
    const mandatory=[];
    const mandatoryClusters=new Set();
    for(const key of original.keys){
      const item=map.get(key);if(!item||item.gradeId!==grade)continue;
      if(ppHomeworkClusterSeen(item,progress))continue;
      const cid=ppHomeworkClusterId(item);
      if(mandatoryClusters.has(cid))continue;
      mandatory.push(key);mandatoryClusters.add(cid);
      if(mandatory.length>=required)break;
    }
    if(!mandatory.length)return balanced;

    const keys=balanced.keys.slice();
    const mandatorySet=new Set(mandatory);
    const selectedSet=new Set(keys);
    const selectedClusters=new Map();
    keys.forEach((key,i)=>{
      const item=map.get(key);if(item)selectedClusters.set(ppHomeworkClusterId(item),i);
    });

    function removalScore(key,needed){
      if(mandatorySet.has(key))return -1e9;
      const item=map.get(key);if(!item)return 1000;
      const sameSubject=needed&&item.subject===needed.subject?100:0;
      // Preserve weak due reviews if possible; strong/ordinary reviews are the safest swaps.
      if(isWeakDue(item,progress,today))return sameSubject+1;
      if(isStrongDue(item,progress,today))return sameSubject+40;
      if(ppIsDue(ppProgressFor(progress,item.key),today))return sameSubject+30;
      if(!ppHomeworkClusterSeen(item,progress))return sameSubject+20;
      return sameSubject+10;
    }

    for(const neededKey of mandatory){
      if(selectedSet.has(neededKey))continue;
      const needed=map.get(neededKey);if(!needed)continue;
      const neededCluster=ppHomeworkClusterId(needed);

      // If the balanced pass selected an alias/near-duplicate, replace that exact cluster first.
      let replaceIndex=selectedClusters.has(neededCluster)?selectedClusters.get(neededCluster):-1;
      if(replaceIndex<0){
        let best=-1,bestScore=-1e12;
        for(let i=0;i<keys.length;i++){
          const score=removalScore(keys[i],needed);
          if(score>bestScore){bestScore=score;best=i}
        }
        replaceIndex=best;
      }
      if(replaceIndex<0)continue;
      const oldKey=keys[replaceIndex],oldItem=map.get(oldKey);
      selectedSet.delete(oldKey);
      if(oldItem)selectedClusters.delete(ppHomeworkClusterId(oldItem));
      keys[replaceIndex]=neededKey;
      selectedSet.add(neededKey);selectedClusters.set(neededCluster,replaceIndex);
    }

    const rows=keys.map(k=>map.get(k)).filter(Boolean);
    const newCount=rows.filter(item=>!ppHomeworkClusterSeen(item,progress)).length;
    const dueCount=rows.filter(item=>ppHomeworkClusterSeen(item,progress)&&ppIsDue(ppProgressFor(progress,item.key),today)).length;
    const subjectCounts={};
    for(const item of rows)subjectCounts[item.subject]=(subjectCounts[item.subject]||0)+1;
    const gradeCounts={...(balanced.gradeCounts||{})};
    gradeCounts[grade]={review:Math.max(0,rows.length-newCount),new:newCount};

    return {...balanced,keys,newCount,dueCount,newShortfall:Math.max(0,required-newCount),
      subjectCounts,gradeCounts,mandatoryNewPreserved:Math.min(required,mandatory.length),
      subjectBalancePolicy:'even-subject-v2-deadline-safe'};
  }

  function installSubjectBalanceFix(){
    if(typeof ppBalanceSingleGradeSubjects!=='function'||ppBalanceSingleGradeSubjects.__deadlineSafe)return false;
    const prior=ppBalanceSingleGradeSubjects;
    const wrapped=function(plan,pools,progress,today,assignment){
      const balanced=prior(plan,pools,progress,today,assignment);
      return repairBalancedAssignment(plan,pools,progress,today,assignment,balanced);
    };
    wrapped.__deadlineSafe=true;
    ppBalanceSingleGradeSubjects=wrapped;
    return true;
  }

  function installSameDayRecheckFix(){
    if(typeof ppScheduleSameDayRecheck!=='function'||ppScheduleSameDayRecheck.__minimumGap)return false;
    const wrapped=function(q){
      if(typeof planSessionKind==='undefined'||planSessionKind!=='today'||!q||!q._planKey)return false;
      const today=ppDateKey(new Date()),r=ppProgressFor(ppLoadProgress(),q._planKey);
      if(r.sameDayConfirmedDate===today||r.sameDayFirstCorrectDate!==today||r.lastOutcome!=='sure')return false;
      if(planSessionQueue.slice(planSessionIdx+1).some(x=>x&&x._planKey===q._planKey))return false;

      const remainingBase=planSessionQueue.slice(planSessionIdx+1).reduce((n,x)=>n+((x&&x._sameDayRecheck)?0:1),0);
      // Near the end, do not immediately echo the same question. Leave it unresolved;
      // the existing result screen will place it into the final unresolved review.
      if(remainingBase<20)return false;

      const wanted=20+Math.floor(Math.random()*11);
      const delay=Math.min(wanted,remainingBase);
      let seenBase=0,insertAt=planSessionQueue.length;
      for(let i=planSessionIdx+1;i<planSessionQueue.length;i++){
        if(!(planSessionQueue[i]&&planSessionQueue[i]._sameDayRecheck))seenBase++;
        if(seenBase>=delay){insertAt=i+1;break}
      }
      const copy={...q,_sameDayRecheck:true,_sameDayRecheckDelay:delay};
      planSessionQueue.splice(insertAt,0,copy);
      planSessionAnswers.splice(insertAt,0,null);
      planSessionConfidence.splice(insertAt,0,null);
      return true;
    };
    wrapped.__minimumGap=true;
    ppScheduleSameDayRecheck=wrapped;
    return true;
  }

  function installWeakTopicFix(){
    if(typeof ppWeakTopicBoost!=='function'||ppWeakTopicBoost.__answeredOnly)return false;
    const wrapped=function(item,profile){
      const grade=item&&(item.gradeId||item._planGrade||String(item.key||item._planKey||'').split('|')[0]);
      const p=profile||ppLoadWeakTopicProfile(grade);
      const key=`${item&&item.subject||'기타'}|${ppWeakTopicId(item)}`,row=p&&p[key];
      if(!row||!(Number(row.wrong)>0))return 1;
      const share=clamp(Number(row.targetShare)||0,0,100);
      const err=clamp(Number(row.errorRate)||0,0,100);
      return Math.min(1.75,1+share/180+err/500);
    };
    wrapped.__answeredOnly=true;
    ppWeakTopicBoost=wrapped;
    return true;
  }

  function installMockCommitFix(){
    if(typeof window.commitNavigatorPredictiveMockResult!=='function'||window.commitNavigatorPredictiveMockResult.__answeredOnly)return false;
    const wrapped=function(queue,answers){
      const rows=Array.isArray(queue)?queue:[];
      if(!rows.length||rows.some(q=>q&&q._evaluationMock))return;
      const progress=ppLoadProgress(),today=ppDateKey(new Date());
      let changed=false;
      rows.forEach((q,i)=>{
        if(!q||!q._predictiveMock||q._predictiveReview||!q._planKey)return;
        const answer=Array.isArray(answers)?answers[i]:null;
        if(answer===null||answer===undefined)return; // unanswered affects score only, never learning state

        const r=ppProgressFor(progress,q._planKey);
        if(window.__mdLearningIntegrity&&typeof window.__mdLearningIntegrity.initializeCounters==='function')
          window.__mdLearningIntegrity.initializeCounters(r);
        r.lastPracticeMode='predictive-mock';r.lastDate=today;
        if(answer===q['정답']){
          if(window.__mdLearningIntegrity&&typeof window.__mdLearningIntegrity.appendOutcome==='function')
            window.__mdLearningIntegrity.appendOutcome(r,'correct',false);
        }else{
          r.lastOutcome='wrong';r.status='weak';r.mastered=false;r.recoveryStartDate=today;
          r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;
          r.todayWrongReviewDate=null;r.dueDate=today;
          if(window.__mdLearningIntegrity&&typeof window.__mdLearningIntegrity.appendOutcome==='function')
            window.__mdLearningIntegrity.appendOutcome(r,'wrong',false);
          else {r.attempts=(r.attempts||0)+1;r.wrong=(r.wrong||0)+1}
        }
        progress[q._planKey]=r;changed=true;
      });

      const complete=rows.length>0&&Array.isArray(answers)&&answers.length>=rows.length&&
        rows.every((q,i)=>answers[i]!==null&&answers[i]!==undefined);
      if(complete){
        const first=rows.find(q=>q&&q._planKey),gradeId=first?String(first._planKey).split('|')[0]:'';
        const keys=rows.filter(q=>q&&q._predictiveMock&&q._planKey).map(q=>String(q._planKey));
        if(typeof ppSavePredictiveHistory==='function')ppSavePredictiveHistory(gradeId,keys);
        if(typeof ppSavePredictiveFingerprintHistory==='function')ppSavePredictiveFingerprintHistory(gradeId,rows);
      }
      if(changed){
        ppSaveProgress(progress);
        const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);
      }
    };
    wrapped.__answeredOnly=true;
    window.commitNavigatorPredictiveMockResult=wrapped;
    return true;
  }

  function installEvaluationWrongListIsolation(){
    if(typeof removePastWrong!=='function'||removePastWrong.__evaluationSafe)return false;
    const prior=removePastWrong;
    const wrapped=function(id){
      try{
        if(typeof pastQueue!=='undefined'&&Array.isArray(pastQueue)&&pastQueue.some(q=>q&&q._evaluationMock))return;
      }catch(e){}
      return prior(id);
    };
    wrapped.__evaluationSafe=true;
    removePastWrong=wrapped;
    return true;
  }

  function neutralSubjectSample(items,data,count,identity,random=Math.random){
    const seenId=new Set(),seenFp=new Set(),buckets=new Map();
    for(const item of items||[]){
      if(!item)continue;
      const id=String(identity(item)||''),fp=text(item.question);
      if(!id||seenId.has(id)||!fp||seenFp.has(fp))continue;
      seenId.add(id);seenFp.add(fp);
      const topic=global.__mdBalancedMock&&typeof global.__mdBalancedMock.topic==='function'?
        global.__mdBalancedMock.topic(item,data):String(item.subject||'기타')+'|종합';
      if(!buckets.has(topic))buckets.set(topic,[]);
      buckets.get(topic).push(item);
    }
    const shuffleLocal=a=>{
      const out=a.slice();
      for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
      return out;
    };
    const names=shuffleLocal([...buckets.keys()]);
    names.forEach(k=>buckets.set(k,shuffleLocal(buckets.get(k))));
    const target=Math.min(Math.max(0,Math.floor(Number(count)||0)),[...buckets.values()].reduce((n,a)=>n+a.length,0));
    const picked=[];
    while(picked.length<target){
      let added=false;
      for(const name of names){
        const bucket=buckets.get(name);
        if(bucket&&bucket.length&&picked.length<target){picked.push(bucket.pop());added=true}
      }
      if(!added)break;
    }
    return picked;
  }

  function loadEvalHistory(){
    try{
      const v=JSON.parse(localStorage.getItem(EVAL_HISTORY_KEY)||'{}');
      return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
    }catch(e){return {}}
  }
  function saveEvalHistory(grade,row){
    const store=loadEvalHistory(),list=Array.isArray(store[grade])?store[grade]:[];
    if(list.some(x=>String(x.id)===String(row.id)))return list;
    store[grade]=[row,...list].slice(0,10);
    try{localStorage.setItem(EVAL_HISTORY_KEY,JSON.stringify(store))}catch(e){}
    return store[grade];
  }

  function installEvaluationStart(){
    if(window.startNavigatorEvaluationMock)return true;
    window.startNavigatorEvaluationMock=async function(gradeId){
      if(!['navi2','navi3'].includes(gradeId)||window.__mdEvaluationCreating)return;
      window.__mdEvaluationCreating=true;
      const plan=ppLoadPlan();
      renderPastLoading(`${GRADE_LABELS[gradeId]} 평가용 모의고사를 구성하는 중입니다`);
      try{
        await ppBuildPools(plan);
        const data=n3aData(gradeId),subjects=ppSelectedSubjects(plan,gradeId,data);
        if(!subjects.length)throw new Error('응시 과목을 1개 이상 선택하세요.');
        const clusterMap=typeof PP_HOMEWORK_DUPLICATE_CLUSTER==='object'?PP_HOMEWORK_DUPLICATE_CLUSTER:{};
        const identity=item=>clusterMap[item.key]||item.key;
        const selected=[],fingerprints=new Set();
        for(const subject of subjects){
          const candidates=(planPools[gradeId]||[]).filter(item=>item.subject===subject).map(item=>{
            const q=ppFindQuestion(gradeId,item);
            return q&&mdQuestionUsable(q)?{...item,choices:q['선택지']}:null;
          }).filter(Boolean);
          const draw=neutralSubjectSample(candidates,data,PAST_MOCK_PER_SUBJECT,identity);
          if(draw.length!==PAST_MOCK_PER_SUBJECT)throw new Error(`${subject}의 사용 가능한 서로 다른 문항이 ${PAST_MOCK_PER_SUBJECT}개보다 적습니다.`);
          for(const item of draw){
            const fp=text(item.question);
            if(fingerprints.has(fp))continue;
            fingerprints.add(fp);selected.push(item);
          }
        }
        if(selected.length!==subjects.length*PAST_MOCK_PER_SUBJECT)throw new Error('평가용 모의고사 문항 구성이 완전하지 않습니다.');
        const questions=await ppHydrateKeys(selected.map(item=>item.key));
        if(questions.length!==selected.length||questions.some(q=>!mdQuestionUsable(q)))throw new Error('일부 기출 원문을 확인할 수 없습니다.');
        const itemMap=new Map(selected.map(item=>[item.key,item]));
        const rows=questions.map(q=>({...q,_predictiveMock:true,_evaluationMock:true,_balancedMock:false,
          _predictiveConcept:global.__mdBalancedMock.topic(itemMap.get(q._planKey),data)}));
        const queue=orderNavigatorMockQuestions(shuffle(rows),gradeId);
        clearPastProgress();
        pastSubjectId=gradeId;pastBaseShort=gradeId;pastYear=null;pastSession=null;pastVariant='상선';pastAllYears=false;
        pastReturnView='pass-plan-predictive-mock';
        pastQueue=queue;pastIdx=0;pastAnswers=new Array(queue.length).fill(null);pastMode='mock';pastStartedAt=Date.now();currentMode='past';
        renderPastCard();
      }catch(e){
        app.innerHTML=`<div class="card" style="margin-top:30px"><b>평가용 모의고사를 시작하지 못했습니다.</b><div style="font-size:12px;margin-top:7px">${escapeHtml(e.message||String(e))}</div><button class="btn btn-outline" style="margin-top:12px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">합격 플랜으로 돌아가기</button></div>`;
      }finally{window.__mdEvaluationCreating=false}
    };
    return true;
  }

  function injectEvaluationButtons(){
    if(!window.startNavigatorEvaluationMock)return;
    for(const grade of ['navi2','navi3']){
      const anchor=document.querySelector(`button[onclick="startNavigatorPassPlanMock('${grade}')"]`);
      if(!anchor||document.querySelector(`button[data-md-evaluation="${grade}"]`))continue;
      const btn=document.createElement('button');
      btn.className='btn btn-outline';btn.type='button';btn.dataset.mdEvaluation=grade;
      btn.style.cssText='width:100%;margin-top:9px;border-color:#475569;color:#334155';
      btn.textContent='평가용 모의고사 · 실력 측정';
      btn.addEventListener('click',()=>window.startNavigatorEvaluationMock(grade));
      const note=document.createElement('div');
      note.dataset.mdEvaluationNote=grade;
      note.style.cssText='font-size:10px;color:var(--textDim);line-height:1.5;margin-top:5px';
      note.textContent='개인 취약도·최근 학습 가중 없음 · 과목별 25문항 · 점수는 최근 3회 평균으로 추적';
      const after=anchor.nextElementSibling&&anchor.nextElementSibling.classList.contains('md-mock-note')?anchor.nextElementSibling:anchor;
      after.insertAdjacentElement('afterend',note);note.insertAdjacentElement('beforebegin',btn);
    }
  }

  const renderedEvalIds=new Set();
  function enhanceEvaluationResult(){
    let isEval=false;
    try{isEval=typeof pastQueue!=='undefined'&&Array.isArray(pastQueue)&&pastQueue.some(q=>q&&q._evaluationMock)}catch(e){}
    if(!isEval||typeof currentMode==='undefined'||currentMode!=='past-result')return;
    const root=document.getElementById('app');if(!root)return;
    const heading=[...root.querySelectorAll('h1')].find(x=>/모의.*결과/.test(x.textContent||''));
    if(heading)heading.textContent='평가용 모의고사 결과';
    const retry=[...root.querySelectorAll('button')].find(b=>/새 (예측|실전) 모의/.test(b.textContent||''));
    if(retry){
      retry.textContent='새 평가용 모의';
      retry.onclick=()=>window.startNavigatorEvaluationMock(pastSubjectId||'navi2');
    }
    if(root.querySelector('#md-evaluation-summary'))return;

    const total=pastQueue.length,correct=pastQueue.reduce((n,q,i)=>n+(pastAnswers[i]===q['정답']?1:0),0);
    const score=total?Math.round(correct/total*100):0;
    const grade=(pastQueue.find(q=>q&&q._planGrade)||{})._planGrade||pastSubjectId||'navi2';
    const id=String((typeof pastResultId!=='undefined'&&pastResultId)||pastStartedAt||Date.now());
    let history=loadEvalHistory()[grade]||[];
    if(!renderedEvalIds.has(id)){
      history=saveEvalHistory(grade,{id,at:new Date().toISOString(),score,correct,total});
      renderedEvalIds.add(id);
    }
    const recent=history.slice(0,3),avg=recent.length?Math.round(recent.reduce((s,r)=>s+(Number(r.score)||0),0)/recent.length):score;
    const card=document.createElement('section');card.id='md-evaluation-summary';card.className='card';
    card.style.cssText='margin-top:14px;border-left:4px solid #475569';
    card.innerHTML=`<div style="font-size:17px;font-weight:900">평가용 점수 추적</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px">
        <div style="padding:10px;background:#F8FAFC;border-radius:9px"><b>이번 점수 ${score}%</b><div style="font-size:10px;color:#64748B">${correct}/${total}</div></div>
        <div style="padding:10px;background:#F8FAFC;border-radius:9px"><b>최근 ${recent.length}회 평균 ${avg}%</b><div style="font-size:10px;color:#64748B">개인 취약도 가중 없이 측정</div></div>
      </div>
      <div style="font-size:10px;color:#64748B;line-height:1.5;margin-top:8px">미응답은 시험 점수에서는 오답 처리되지만, 학습 오답 기록·취약도에는 반영하지 않습니다.</div>`;
    const first=root.querySelector('.card');
    if(first&&first.parentNode)first.parentNode.insertBefore(card,first.nextSibling);else root.appendChild(card);
  }

  function installAll(){
    if(global[INSTALL_MARK]){injectEvaluationButtons();enhanceEvaluationResult();return}
    const ready=
      typeof ppBalanceSingleGradeSubjects==='function'&&
      typeof ppScheduleSameDayRecheck==='function'&&
      typeof window.commitNavigatorPredictiveMockResult==='function'&&
      typeof ppWeakTopicBoost==='function';
    if(!ready){setTimeout(installAll,25);return}
    installSubjectBalanceFix();
    installSameDayRecheckFix();
    installWeakTopicFix();
    installMockCommitFix();
    installEvaluationWrongListIsolation();
    installEvaluationStart();
    global[INSTALL_MARK]=true;
    injectEvaluationButtons();enhanceEvaluationResult();
  }

  global.__mdStudyAlgorithmFixes={
    repairBalancedAssignment,neutralSubjectSample,loadEvalHistory,
    policy:{
      mandatoryNew:'preserve-before-subject-balance',
      sameDayRecheck:'minimum-20-base-question-gap-or-final-review',
      mockUnanswered:'score-only-no-learning-state',
      evaluation:'neutral-topic-stratified-no-personal-adaptation'
    }
  };

  new MutationObserver(()=>{injectEvaluationButtons();enhanceEvaluationResult()}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installAll,{once:true});else installAll();
  setTimeout(installAll,0);
})(window);
