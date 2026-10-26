// v5.32: one immutable paper per attempt; causal answer versions never mix papers.
(function(global){
  'use strict';
  const PREFIX='md_exam_session_v3_', LAST='maritime-drill:last-exam:v3';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  const uuid=()=>global.crypto.randomUUID();
  const writer=uuid(),knownLocal=new Map();let sequence=0,active=null,loading=false;
  const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const validTime=value=>Number.isFinite(value)&&Number.isFinite(new Date(value).getTime());
  function dominates(a,b){return Object.keys(b).every(k=>(a[k]||0)>=b[k])&&Object.keys(a).some(k=>a[k]>(b[k]||0));}
  function valid(record){
    try{
      if(!object(record)||record.schema!==3||!object(record.meta)||!validId(record.meta.id)||!object(record.heads))return false;
      const refs=record.meta.refs,entries=Object.entries(record.heads);
      const full=Array.isArray(refs)&&refs.length>0&&refs.every(r=>object(r)&&typeof r.id==='string'&&typeof r.content==='string');
      if(!full&&!(Object.keys(record.meta).length===1&&entries.every(([,h])=>h?.status==='completed')))return false;
      return entries.length>0&&entries.every(([id,h])=>
        validId(id)&&object(h)&&object(h.clock)&&Object.keys(h.clock).length>0&&Object.entries(h.clock).every(([k,n])=>validId(k)&&Number.isSafeInteger(n)&&n>0)&&
        object(h.state)&&h.state.id===record.meta.id&&validTime(h.state.savedAt)&&
        (h.status==='completed'||h.status==='active'&&full&&validTime(record.meta.createdAt)&&validTime(h.state.startedAt)&&['study','mock'].includes(h.state.mode)&&
        Array.isArray(h.state.answers)&&h.state.answers.length===refs.length&&h.state.answers.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<4)&&
        Number.isInteger(h.state.idx)&&h.state.idx>=0&&h.state.idx<=refs.length));
    }catch(_){return false;}
  }
  // A completion is a causal tombstone, not a resumable answer sheet. Keep
  // the full paper only while a concurrent active branch still needs it.
  function compact(record){
    const heads=prune(record.heads);
    for(const [id,h] of Object.entries(heads))if(h.status==='completed')heads[id]={clock:h.clock,status:h.status,state:{id:record.meta.id,savedAt:h.state.savedAt}};
    const meta=Object.values(heads).some(h=>h.status==='active')?record.meta:{id:record.meta.id};
    return {schema:3,meta,heads};
  }
  function prune(heads){
    const entries=Object.entries(heads);
    return Object.fromEntries(entries.filter(([,h])=>!entries.some(([,other])=>dominates(other.clock,h.clock))).sort(([a],[b])=>a.localeCompare(b)));
  }
  function merge(left,right){
    if(!valid(left)||!valid(right)||left.meta.id!==right.meta.id||left.meta.refs&&right.meta.refs&&stable(left.meta)!==stable(right.meta))throw new Error('시험 식별 정보가 다른 저장본입니다. 자동 병합을 중단했습니다.');
    left=compact(left);right=compact(right);
    const heads={...left.heads};
    for(const [id,h] of Object.entries(right.heads)){
      if(heads[id]&&stable(heads[id])!==stable(h))throw new Error('같은 답안 버전의 내용이 다릅니다. 자동 병합을 중단했습니다.');
      heads[id]=h;
    }
    return compact({schema:3,meta:left.meta.refs?left.meta:right.meta,heads});
  }
  // A user-requested restore is a new attempt, not a stale remote update.
  // Rekey even when this device has not downloaded the old ID's tombstone yet.
  // Preserve concurrent answer sheets as separate causal heads, never splice them.
  function restoreItems(items){
    const restored={...items};
    for(const [key,raw] of Object.entries(items)){
      if(!key.startsWith(PREFIX))continue;
      const record=JSON.parse(raw);
      if(!valid(record)||key!==PREFIX+record.meta.id)throw new Error('복구할 시험 저장본의 식별 정보가 올바르지 않습니다.');
      const heads=Object.values(prune(record.heads)).filter(h=>h.status==='active');
      if(!heads.length){restored[key]=JSON.stringify(compact(record));continue;}
      const id=uuid(),meta={...clone(record.meta),id,restoredFrom:record.meta.id,restoredAt:Date.now()},fresh={};
      for(const head of heads){const branch=uuid();fresh[branch+'_1']={clock:{[branch]:1},status:'active',state:{...clone(head.state),id}};}
      delete restored[key];restored[PREFIX+id]=JSON.stringify({schema:3,meta,heads:fresh});
    }
    return restored;
  }
  function read(id){
    const raw=localStorage.getItem(PREFIX+id);if(!raw)return null;
    const value=JSON.parse(raw);
    if(!valid(value)||value.meta.id!==id)throw new Error('시험 저장본을 확인할 수 없습니다. 파일 백업 후 확인해 주세요.');
    return compact(value);
  }
  function list(subjectId){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key.startsWith(PREFIX))continue;
      try{
        const record=read(key.slice(PREFIX.length));
        if(isDeleted(record.meta.id)||subjectId&&record.meta.subjectId!==subjectId)continue;
        const heads=prune(record.heads),conflict=Object.keys(heads).length>1;
        for(const [headId,head] of Object.entries(heads))if(head.status==='active')out.push({meta:record.meta,state:head.state,clock:head.clock,headId,conflict});
      }catch(error){console.warn('[exam-sessions]',error);}
    }
    return out.sort((a,b)=>b.state.savedAt-a.state.savedAt||a.headId.localeCompare(b.headId));
  }
  // Store the precise question and choice content used for grading. A changed
  // source must fail closed instead of silently restoring a different question.
  function content(q){return stable([q['문제'],q['선택지'],q['정답'],q['이미지']||null]);}
  function makeMeta(){
    const id=uuid();
    const refs=pastQueue.map(q=>({id:pqid(q),short:q._short||q._gradeShort,year:q._year,session:q['회차'],content:content(q),source:q._source,group:q._n3aGroupId,predictive:q._predictiveMock===true,predictiveReview:q._predictiveReview===true,planKey:q._planKey,planGrade:q._planGrade,predictiveConcept:q._predictiveConcept}));
    return clone({version:3,id,createdAt:Date.now(),unified:pastQueue.every(q=>q._unifiedMock===true),targeted:pastQueue.every(q=>q._targetedPractice===true),balanced:pastQueue.every(q=>q._balancedMock===true),evaluation:pastQueue.every(q=>q._evaluationMock===true),refs,subjectId:pastSubjectId,base:pastBaseShort,year:pastYear,session:pastSession,variant:pastVariant,allYears:pastAllYears,returnView:pastReturnView,analysisSubject:naviAnalysisSubjectId,analysisDetail:navi3AnalysisDetail,practiceReturn:navi3PracticeReturn,practiceLabel:navi3PracticeLabel});
  }
  function isDeleted(id){
    const codec=global.__mdDriveStateCodec;
    const state=codec?.loadForKey?codec.loadForKey(PREFIX+id):typeof driveSyncLoadState==='function'?driveSyncLoadState():null;
    return state?.itemMeta?.[PREFIX+id]?.deleted===true;
  }
  // Timestamps advance even on a redraw. They must not generate a new answer
  // version; elapsed time is checkpointed with the next meaningful change.
  function semantic(state){const {savedAt,startedAt,...rest}=state;return stable(rest);}
  function checkpoint(status='active'){
    if(!active||active.queue!==pastQueue){
      active={meta:makeMeta(),answers:pastAnswers,queue:pastQueue,clock:{}};
      pastProgressId=active.meta.id;pastProgressMeta=active.meta;pastSavedAnswers=pastAnswers;
    }
    if(isDeleted(active.meta.id))throw new Error('삭제된 시험입니다. 시험 목록에서 새 시험을 시작해 주세요.');
    const state=clone(capturePastProgressState());state.id=active.meta.id;
    const prior=read(active.meta.id),previous=prior?.heads[active.headId];
    if(previous?.status===status&&semantic(previous.state)===semantic(state))return {record:prior,clock:previous.clock,headId:active.headId};
    if(active.pending?.status===status&&active.pending.signature===semantic(state)){
      const next=active.pending.next;
      return {...next,record:prior?merge(prior,next.record):next.record};
    }
    const clock={...active.clock,[writer]:++sequence},headId=writer+'_'+sequence;
    const record={schema:3,meta:active.meta,heads:{[headId]:{clock,status,state}}};
    const next={record:prior?merge(prior,record):compact(record),clock,headId};
    active.pending={status,signature:semantic(state),next};return next;
  }
  savePastProgress=function(){
    if(currentMode!=='past'||!pastQueue.length||loading)return false;
    try{
      const next=checkpoint();
      const key=PREFIX+active.meta.id,raw=JSON.stringify(next.record);
      if(localStorage.getItem(key)!==raw&&!safeStorageSet(key,raw,'시험별 답안'))return false;
      knownLocal.set(PREFIX+active.meta.id,next.record);
      active.clock=next.clock;active.headId=next.headId;active.pending=null;
      try{localStorage.setItem(LAST,active.meta.id)}catch(_){}
      return true;
    }catch(error){showStorageWarning('시험별 답안',error);return false;}
  };
  getPastProgress=function(id,headId){
    const choices=list();
    if(id)return choices.find(s=>s.meta.id===id&&(!headId||s.headId===headId))||null;
    let last;try{last=localStorage.getItem(LAST)}catch(_){}
    return choices.find(s=>s.meta.id===last)||choices[0]||null;
  };
  // The existing starters call this before generating a paper. Detach memory
  // after saving, so their later clearPastProgress cannot complete another exam.
  confirmPastProgressReplacement=async function(){
    if(loading)return false;
    if(currentMode==='past'&&active&&savePastProgress()!==true)return false;
    active=null;pastSavedAnswers=null;pastProgressId=null;pastProgressMeta=null;
    return true;
  };
  clearPastProgress=function(){
    if(active){
      const next=checkpoint('completed');
      if(!safeStorageSet(PREFIX+active.meta.id,JSON.stringify(next.record),'시험 완료 상태'))throw new Error('시험 완료 상태를 저장하지 못했습니다.');
    }
    if(active)knownLocal.set(PREFIX+active.meta.id,read(active.meta.id));
    active=null;pastSavedAnswers=null;pastProgressId=null;pastProgressMeta=null;
  };
  function kind(meta){return meta.targeted?'집중 연습':meta.unified?'모의시험':meta.evaluation?'평가용 모의':meta.balanced?'실전 모의':meta.refs.some(r=>r.predictive)?'실전예측 모의':'기출 시험';}
  renderPastResumeCard=function(subjectId){
    return list(subjectId).map(saved=>{
      const {meta,state,headId}=saved,done=state.answers.filter(a=>a!==null).length;
      const grade=SUBJECTS.find(s=>s.id===meta.subjectId)?.name||meta.subjectId;
      const detail=meta.year?`${meta.year}년 ${meta.session||''}회 · ${meta.variant||''}`:`${meta.variant||''} · 여러 회차`;
      return `<div class="card" data-past-resume="${meta.id}" data-exam-head="${headId}" style="border-left:3px solid #059669"><b>${escapeHtml(grade)} · ${kind(meta)} · ${done}/${meta.refs.length}문제</b><p style="font-size:12px;color:var(--textDim)">${escapeHtml(detail)}<br>시험 ${meta.id.slice(0,8)} · 시작 ${escapeHtml(backupDateLabel(new Date(meta.createdAt).toISOString()))}<br>중단 위치 ${Math.min(state.idx+1,meta.refs.length)}번 · 저장 ${escapeHtml(backupDateLabel(new Date(state.savedAt).toISOString()))}${saved.conflict?'<br><strong>다른 기기의 답안과 충돌하여 두 버전을 각각 보존했습니다.</strong>':''}</p><button class="btn btn-green" onclick="resumePastProgress('${meta.id}','${headId}')">${state.mode==='mock'?'모의고사 이어서 풀기':'필기 이어서 풀기'}</button></div>`;
    }).join('');
  };
  resumePastProgress=async function(id,headId){
    if(loading)return;
    // A button always identifies its paper. No fallback to the newest paper if
    // that exact version disappeared during a sync or another-tab save.
    const saved=getPastProgress(id,headId);
    if(!saved){showToast('선택한 저장본이 변경되었습니다. 목록을 새로고침해 주세요.');return;}
    if(currentMode==='past'&&active&&savePastProgress()!==true)return;
    loading=true;currentMode='past-loading';renderPastLoading('선택한 시험의 문제와 답안을 복원합니다');
    try{
      const {meta,state}=saved;
      for(const subject of new Set(meta.refs.map(r=>baseFromShort(r.short))))await ensurePastDataForSubject(subject);
      await ensurePastExplainForYears(meta.refs.map(r=>r.year));
      const maps=new Map();
      const restored=meta.refs.map(r=>{
        const key=stable([r.short,r.year,r.session]);
        if(!maps.has(key)){
          const exam=getPastExam(r.short,r.year,r.session),map=new Map();
          for(const q of exam?.questions||[]){const full={...q,_year:r.year,_short:r.short,_session:r.session,'회차':r.session};const id=pqid(full);if(map.has(id))map.set(id,null);else map.set(id,full);}
          maps.set(key,map);
        }
        const q=maps.get(key).get(r.id);
        if(!q||content(q)!==r.content||!mdQuestionUsable(q))throw new Error('저장 당시의 문항·선택지·정답과 현재 자료가 다릅니다. 다른 시험으로 대체하지 않았습니다.');
        return {...q,_source:r.source,_n3aGroupId:r.group,_predictiveMock:r.predictive,_predictiveReview:r.predictiveReview,_planKey:r.planKey,_planGrade:r.planGrade,_predictiveConcept:r.predictiveConcept,_balancedMock:meta.balanced,_unifiedMock:meta.unified,_targetedPractice:meta.targeted,_evaluationMock:meta.evaluation};
      });
      if(state.answers.some((a,i)=>a!==null&&a>=restored[i]['선택지'].length))throw new Error('저장된 답안을 확인할 수 없습니다.');
      if(meta.analysisSubject)n3aActivateGrade(meta.analysisSubject);
      if(meta.returnView?.startsWith('navi3'))await ensureNavi3FrequencyData(meta.analysisSubject);
      if(state.evaluationExplanationViewed)restored.forEach(q=>{q._evaluationExplanationViewed=true});
      for(const i of state.hintedIndices||[])if(restored[i])restored[i]._mockHintViewed=true;
      pastQueue=restored;pastAnswers=state.answers.slice();pastIdx=Math.min(state.idx,restored.length-1);pastMode=state.mode;
      pastStartedAt=Date.now()-Math.max(0,state.savedAt-state.startedAt);
      pastSubjectId=meta.subjectId;pastBaseShort=meta.base;pastYear=meta.year;pastSession=meta.session;pastVariant=meta.variant;pastAllYears=meta.allYears;pastReturnView=meta.returnView;
      navi3AnalysisDetail=meta.analysisDetail;navi3PracticeReturn=meta.practiceReturn;navi3PracticeLabel=meta.practiceLabel;
      pastSavedAnswers=pastAnswers;pastProgressId=meta.id;pastProgressMeta=meta;
      active={meta,answers:pastAnswers,queue:pastQueue,clock:{...saved.clock},headId:saved.headId};
      loading=false;currentMode='past';renderPastCard();
    }catch(error){currentMode='past-resume-error';app.innerHTML=`<div class="card"><p>${escapeHtml(error.message)}</p><button class="btn btn-outline" onclick="renderSubjectSelect()">시험 목록으로</button><button class="btn btn-outline" onclick="exportAllLearningData()">기록 파일 백업</button></div>`;}
    finally{loading=false;}
  };
  global.__mdExamSessions={PREFIX,valid,merge,compact,prune,dominates,list,content,restoreItems,
    liveItems(){const next=checkpoint();return {[PREFIX+next.record.meta.id]:JSON.stringify(next.record)};}};
  // Reconcile a competing tab's synchronous localStorage write without
  // replacing either tab's in-memory answers. Independent causal heads survive.
  global.addEventListener('storage',event=>{
    if(event.storageArea!==localStorage||!knownLocal.has(event.key))return;
    if(!event.newValue){knownLocal.delete(event.key);return;}
    try{
      if(isDeleted(event.key.slice(PREFIX.length)))return;
      const current=localStorage.getItem(event.key);if(!current)return;
      const incoming=JSON.parse(event.newValue),merged=merge(merge(knownLocal.get(event.key),incoming),JSON.parse(current));
      knownLocal.set(event.key,merged);
      const raw=JSON.stringify(merged);
      if(localStorage.getItem(event.key)!==raw)safeStorageSet(event.key,raw,'다른 탭 답안 보존');
    }catch(error){showStorageWarning('다른 탭 답안 보존',error);}
  });
  // Upgrade old completed envelopes without touching active answers.
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!key.startsWith(PREFIX))continue;
    try{const record=read(key.slice(PREFIX.length)),raw=JSON.stringify(record);
      if(raw!==localStorage.getItem(key))safeStorageSet(key,raw,'완료 시험 정리');
    }catch(error){console.warn('[exam-sessions]',error);}
  }
  // The boot screen was rendered before extension scripts loaded.
  if(typeof renderSubjectSelect==='function'&&currentMode!=='past')renderSubjectSelect();
})(window);
