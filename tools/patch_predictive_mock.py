from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

MARKER='md_predictive_mock_history_v1'
if MARKER not in text:
    def replace_once(old,new,label):
        global text
        if old not in text:
            raise SystemExit(f'predictive mock patch anchor not found: {label}')
        text=text.replace(old,new,1)

    # Return from predictive mock to the adaptive pass-plan rather than a fixed past-paper runner.
    old="""  if(pastReturnView==='navi3-practice'){"""
    new="""  if(pastReturnView==='pass-plan-predictive-mock'){
    pastReturnView=null;
    currentMode='pass-plan';
    if(typeof window.renderNavigatorPassPlan==='function')window.renderNavigatorPassPlan(pastSubjectId||'navi2');
    else renderSubjectSelect();
    return;
  }
  if(pastReturnView==='navi3-practice'){"""
    replace_once(old,new,'predictive return route')

    # Distinguish the runner visually while preserving normal mock behavior (answers hidden until submit).
    old="""${pastMode==='mock'?'모의 ':''}${pastIdx+1} / ${pastQueue.length}"""
    new="""${q._predictiveMock?'실전예측 ':pastMode==='mock'?'모의 ':''}${pastIdx+1} / ${pastQueue.length}"""
    replace_once(old,new,'runner label')

    # Result-page state and title.
    old="""  const isNavi3Practice = pastReturnView === 'navi3-practice';"""
    new="""  const isNavi3Practice = pastReturnView === 'navi3-practice';
  const isPredictiveMock = pastReturnView === 'pass-plan-predictive-mock' || pastQueue.some(q=>q&&q._predictiveMock);
  const predictiveGrade = (pastQueue.find(q=>q&&q._planGrade)||{})._planGrade || pastSubjectId || 'navi2';"""
    replace_once(old,new,'result predictive state')

    old="""${pastMode==='mock'?'모의시험 결과':'학습 결과'}"""
    new="""${isPredictiveMock?'실전예측 모의 결과':pastMode==='mock'?'모의시험 결과':'학습 결과'}"""
    replace_once(old,new,'result title')

    # Feed predictive-mock misses into the adaptive review queue without giving mastery credit for mock hits.
    old="""  pastQueue.forEach((q,i)=>{
    if(pastAnswers[i] === q['정답']) removePastWrong(pqid(q));
  });
  if(!pastAllYears && !pastReturnView && pastBaseShort && pastYear && pastSession){"""
    new="""  pastQueue.forEach((q,i)=>{
    if(pastAnswers[i] === q['정답']) removePastWrong(pqid(q));
  });
  if(isPredictiveMock&&typeof window.commitNavigatorPredictiveMockResult==='function'){
    window.commitNavigatorPredictiveMockResult(pastQueue,pastAnswers);
  }
  if(!pastAllYears && !pastReturnView && pastBaseShort && pastYear && pastSession){"""
    replace_once(old,new,'result learning hook')

    # Predictive mock gets a fresh-random retry button and a direct return to the pass plan.
    old="""${isNavi3Practice?`<button class=\"btn btn-outline\" style=\"flex:1\" onclick=\"goBackFromPastSession()\">빈출 분석으로</button><button class=\"btn btn-accent\" style=\"flex:1\" onclick=\"restartNavi3FrequencyPractice()\">같은 문제 다시 풀기</button>`:`<button class=\"btn btn-outline\" style=\"flex:1\" onclick=\"goBackFromPastSession()\">${pastAllYears?'다시 선택':'이 회차 다시'}</button><button class=\"btn btn-accent\" style=\"flex:1\" onclick=\"pickPrepType(pastSubjectId)\">과목 홈</button>`}"""
    new="""${isPredictiveMock?`<button class=\"btn btn-outline\" style=\"flex:1\" onclick=\"goBackFromPastSession()\">합격 플랜으로</button><button class=\"btn btn-accent\" style=\"flex:1\" onclick=\"startNavigatorPredictiveMock('${predictiveGrade}')\">새 예측 모의</button>`:isNavi3Practice?`<button class=\"btn btn-outline\" style=\"flex:1\" onclick=\"goBackFromPastSession()\">빈출 분석으로</button><button class=\"btn btn-accent\" style=\"flex:1\" onclick=\"restartNavi3FrequencyPractice()\">같은 문제 다시 풀기</button>`:`<button class=\"btn btn-outline\" style=\"flex:1\" onclick=\"goBackFromPastSession()\">${pastAllYears?'다시 선택':'이 회차 다시'}</button><button class=\"btn btn-accent\" style=\"flex:1\" onclick=\"pickPrepType(pastSubjectId)\">과목 홈</button>`}"""
    replace_once(old,new,'predictive result buttons')

    # Add a permanent predictive-mock entry on each enabled grade card. Keep the literal 2026 paper mock as a final-week option.
    old="""        ${st.phase.phase==='final'&&cfg.enabled&&cfg.examDate?`<button class=\"btn btn-outline\" style=\"width:100%;margin-top:9px;border-color:${g==='navi2'?'#2563EB':'#059669'};color:${g==='navi2'?'#2563EB':'#059669'}\" onclick=\"startNavigatorPassPlanMock('${g}')\">2026 최신 회차 실전 모의</button>`:''}"""
    new="""        ${cfg.enabled&&cfg.examDate?`<button class=\"btn btn-accent\" style=\"width:100%;margin-top:9px;background:${g==='navi2'?'#2563EB':'#059669'};border-color:${g==='navi2'?'#2563EB':'#059669'}\" onclick=\"startNavigatorPredictiveMock('${g}')\">실전예측 모의 · 가중 랜덤</button>`:''}
        ${st.phase.phase==='final'&&cfg.enabled&&cfg.examDate?`<button class=\"btn btn-outline\" style=\"width:100%;margin-top:7px;border-color:${g==='navi2'?'#2563EB':'#059669'};color:${g==='navi2'?'#2563EB':'#059669'}\" onclick=\"startNavigatorPassPlanMock('${g}')\">2026 최신 회차 실전 모의</button>`:''}"""
    replace_once(old,new,'grade-card predictive button')

    # Insert weighted concept-first sampler before the existing literal-2026 mock function.
    anchor="""  window.startNavigatorPassPlanMock=async function(gradeId){"""
    block="""  const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v1';
  function ppLoadPredictiveHistory(){
    try{const raw=localStorage.getItem(PREDICTIVE_HISTORY_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v.slice(0,2):[]}catch(e){return []}
  }
  function ppSavePredictiveHistory(keys){
    const history=ppLoadPredictiveHistory();
    const next=[Array.isArray(keys)?keys.slice():[],...history].slice(0,2);
    safeStorageSet(PREDICTIVE_HISTORY_KEY,JSON.stringify(next),'실전예측 모의 이력');
  }
  function ppPredictiveConcept(item,data){
    const text=String(item&&item.question||'').normalize('NFKC').toLowerCase();
    const rules=(data&&data.rules)||[];
    for(const rule of rules){
      if(rule.subject!==item.subject)continue;
      try{if(new RegExp(rule.pattern,'i').test(text))return `${item.subject}|${rule.id}`}catch(e){}
    }
    return `${item.subject}|group:${item.groupId}`;
  }
  function ppPredictiveWeight(item,history){
    const hits=item.hits||[],years=new Set(hits.map(h=>Number(h.year)));
    const count=hits.length;
    let weight=1+Math.min(5,count)*0.72;
    if(count>=2)weight+=0.8;
    if(count>=3)weight+=0.55;
    if(count>=4)weight+=0.35;
    if(years.has(2026))weight+=0.9;
    if(years.has(2025))weight+=0.6;
    if(years.has(2024))weight+=0.3;
    if(years.has(2026)&&hits.some(h=>Number(h.year)<2026))weight+=1.25;
    if(history[0]&&history[0].includes(item.key))weight*=0.45;
    else if(history[1]&&history[1].includes(item.key))weight*=0.75;
    return Math.max(0.12,weight);
  }
  function ppWeightedChoice(rows,weightFn){
    if(!rows.length)return null;
    const weighted=rows.map(row=>({row,w:Math.max(0,Number(weightFn(row))||0)}));
    const total=weighted.reduce((s,x)=>s+x.w,0);
    if(total<=0)return rows[Math.floor(Math.random()*rows.length)];
    let r=Math.random()*total;
    for(const x of weighted){r-=x.w;if(r<=0)return x.row}
    return weighted[weighted.length-1].row;
  }
  function ppPredictiveSample(items,data,count,history){
    const buckets=new Map(),uses=new Map(),picked=[];
    items.forEach(item=>{
      const concept=ppPredictiveConcept(item,data);
      if(!buckets.has(concept))buckets.set(concept,[]);
      buckets.get(concept).push(item);
    });
    while(picked.length<count){
      const available=[...buckets.entries()].filter(([,arr])=>arr.length);
      if(!available.length)break;
      const chosenBucket=ppWeightedChoice(available,entry=>{
        const [concept,arr]=entry;
        const best=arr.reduce((m,item)=>Math.max(m,ppPredictiveWeight(item,history)),0);
        const used=uses.get(concept)||0;
        return best/(1+used*2.5);
      });
      if(!chosenBucket)break;
      const [concept,arr]=chosenBucket;
      const item=ppWeightedChoice(arr,x=>ppPredictiveWeight(x,history));
      if(!item)break;
      picked.push(item);
      arr.splice(arr.indexOf(item),1);
      uses.set(concept,(uses.get(concept)||0)+1);
    }
    return picked;
  }
  window.startNavigatorPredictiveMock=async function(gradeId){
    if(!PLAN_GRADES.includes(gradeId))return;
    const plan=ppLoadPlan();
    renderPastLoading(`${GRADE_LABELS[gradeId]} 실전예측 모의를 만드는 중입니다`);
    try{
      await ppBuildPools(plan);
      const data=n3aData(gradeId);if(!data)throw new Error('출제 빈도 데이터를 불러오지 못했습니다.');
      const subjects=ppSelectedSubjects(plan,gradeId,data);
      if(!subjects.length)throw new Error('응시 과목을 1개 이상 선택하세요.');
      const pool=planPools[gradeId]||[],history=ppLoadPredictiveHistory(),selected=[];
      for(const subject of subjects){
        const candidates=pool.filter(item=>item.subject===subject);
        const draw=ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history);
        selected.push(...draw);
      }
      if(!selected.length)throw new Error('실전예측 모의에 사용할 문제가 없습니다.');
      const keys=selected.map(item=>item.key);
      const questions=await ppHydrateKeys(keys);
      if(questions.length!==keys.length)throw new Error('일부 기출문제 원문을 찾지 못했습니다.');
      const itemMap=new Map(selected.map(item=>[item.key,item]));
      const queue=shuffle(questions.map(q=>{
        const item=itemMap.get(q._planKey);
        return {...q,_predictiveMock:true,_predictiveConcept:ppPredictiveConcept(item,data)};
      }));
      ppSavePredictiveHistory(keys);
      pastSubjectId=gradeId;pastBaseShort=gradeId;pastYear=2026;pastSession=0;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock';
      pastQueue=queue;pastIdx=0;pastAnswers=new Array(queue.length).fill(null);pastMode='mock';pastStartedAt=Date.now();currentMode='past';
      renderPastCard();
    }catch(e){
      app.innerHTML=`<div class=\"card\" style=\"margin-top:30px\"><b>실전예측 모의를 시작하지 못했습니다.</b><div style=\"font-size:12px;margin-top:7px\">${escapeHtml(e.message||String(e))}</div><button class=\"btn btn-outline\" style=\"margin-top:12px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">합격 플랜으로 돌아가기</button></div>`;
    }
  };
  window.commitNavigatorPredictiveMockResult=function(queue,answers){
    const progress=ppLoadProgress(),today=ppDateKey(new Date());
    (queue||[]).forEach((q,i)=>{
      if(!q||!q._predictiveMock||!q._planKey)return;
      if(answers&&answers[i]===q['정답'])return;
      const r=ppProgressFor(progress,q._planKey);
      r.attempts=(r.attempts||0)+1;r.wrong=(r.wrong||0)+1;r.lastDate=today;r.lastOutcome='wrong';
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.dueDate=today;
    });
    ppSaveProgress(progress);
    const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);
  };

"""+anchor
    replace_once(anchor,block,'predictive sampler')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock mode')
else:
    print('predictive mock already patched')
