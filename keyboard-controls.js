// Maritime Drill keyboard controls + automatic pass-plan classification
// + per-question autosave + resumable session checkpoint
// 1-4 / A-D: choose an answer
// Enter / Space / Right Arrow: next question when allowed
(function(){
  'use strict';

  const CHECKPOINTS_KEY='md_pass_plan_checkpoints_v1';
  const CHECKPOINT_MAX=12;
  const CHECKPOINT_MAX_AGE_MS=30*24*60*60*1000;

  function isEditableTarget(target){
    if(!target) return false;
    const tag=(target.tagName||'').toLowerCase();
    return tag==='input' || tag==='textarea' || tag==='select' || target.isContentEditable;
  }

  function getChoiceIndex(event){
    const byCode={
      Digit1:0,Numpad1:0,KeyA:0,
      Digit2:1,Numpad2:1,KeyB:1,
      Digit3:2,Numpad3:2,KeyC:2,
      Digit4:3,Numpad4:3,KeyD:3
    };
    return Object.prototype.hasOwnProperty.call(byCode,event.code) ? byCode[event.code] : -1;
  }

  function questionKey(q){
    if(!q) return '';
    if(q._planKey!=null) return String(q._planKey);
    return [q._planGrade||'',q._year||'',q['회차']||'',q['번호']||'',q['과목']||''].join('|');
  }

  function hashText(text){
    // Small deterministic FNV-1a hash; enough for local checkpoint matching.
    let h=0x811c9dc5;
    for(let i=0;i<text.length;i++){
      h^=text.charCodeAt(i);
      h=Math.imul(h,0x01000193);
    }
    return (h>>>0).toString(36);
  }

  function queueSetSignature(queue){
    const keys=(Array.isArray(queue)?queue:[]).map(questionKey).sort();
    return keys.length+':'+hashText(keys.join('\n'));
  }

  function loadCheckpointMap(){
    try{
      const raw=localStorage.getItem(CHECKPOINTS_KEY);
      const parsed=raw?JSON.parse(raw):{};
      if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) return {};
      const now=Date.now();
      for(const [key,cp] of Object.entries(parsed)){
        const saved=Date.parse(cp&&cp.savedAt||'');
        if(!Number.isFinite(saved) || now-saved>CHECKPOINT_MAX_AGE_MS) delete parsed[key];
      }
      return parsed;
    }catch(error){
      console.warn('[keyboard-controls] checkpoint load failed',error);
      return {};
    }
  }

  function saveCheckpointMap(map){
    try{
      const entries=Object.entries(map||{}).sort((a,b)=>Date.parse(b[1]?.savedAt||0)-Date.parse(a[1]?.savedAt||0));
      const trimmed=Object.fromEntries(entries.slice(0,CHECKPOINT_MAX));
      localStorage.setItem(CHECKPOINTS_KEY,JSON.stringify(trimmed));
      return true;
    }catch(error){
      console.warn('[keyboard-controls] checkpoint save failed',error);
      return false;
    }
  }

  function clearCheckpointForQueue(queue){
    try{
      if(!Array.isArray(queue)||!queue.length) return;
      const sig=queueSetSignature(queue);
      const map=loadCheckpointMap();
      if(Object.prototype.hasOwnProperty.call(map,sig)){
        delete map[sig];
        saveCheckpointMap(map);
      }
    }catch(error){
      console.warn('[keyboard-controls] checkpoint clear failed',error);
    }
  }

  function saveSessionCheckpoint(){
    try{
      if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return;
      if(!Array.isArray(planSessionQueue) || !planSessionQueue.length) return;
      if(!Array.isArray(planSessionAnswers)) return;

      const currentIndex=Number(planSessionIdx)||0;
      const nextIndex=currentIndex+1;
      if(nextIndex>=planSessionQueue.length){
        clearCheckpointForQueue(planSessionQueue);
        return;
      }

      const sig=queueSetSignature(planSessionQueue);
      const map=loadCheckpointMap();
      map[sig]={
        version:1,
        savedAt:new Date().toISOString(),
        grade:planSessionQueue[0]?._planGrade||null,
        queueLength:planSessionQueue.length,
        queueKeys:planSessionQueue.map(questionKey),
        nextIndex,
        nextKey:questionKey(planSessionQueue[nextIndex]),
        answers:planSessionAnswers.slice(),
        confidence:Array.isArray(planSessionConfidence)?planSessionConfidence.slice():[],
        committed:(typeof planSessionCommitted!=='undefined' && planSessionCommitted instanceof Set)
          ? Array.from(planSessionCommitted)
          : []
      };
      saveCheckpointMap(map);
    }catch(error){
      console.warn('[keyboard-controls] session checkpoint save failed',error);
    }
  }

  function isFreshSessionAtStart(){
    try{
      if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return false;
      if(Number(planSessionIdx)!==0) return false;
      if(!Array.isArray(planSessionQueue) || !planSessionQueue.length) return false;
      if(!Array.isArray(planSessionAnswers) || planSessionAnswers.length!==planSessionQueue.length) return false;
      return planSessionAnswers.every(v=>v===null);
    }catch(error){ return false; }
  }

  function maybeRestoreSessionCheckpoint(){
    try{
      if(!isFreshSessionAtStart()) return false;

      const sig=queueSetSignature(planSessionQueue);
      const map=loadCheckpointMap();
      const cp=map[sig];
      if(!cp || cp.version!==1) return false;
      if(!Array.isArray(cp.queueKeys) || cp.queueKeys.length!==planSessionQueue.length) return false;

      // Rebuild the original queue order. This also survives a harmless reorder
      // when the same set of homework questions is regenerated after a restart.
      const currentByKey=new Map(planSessionQueue.map(q=>[questionKey(q),q]));
      if(cp.queueKeys.some(key=>!currentByKey.has(key))) return false;
      const restoredQueue=cp.queueKeys.map(key=>currentByKey.get(key));

      let nextIndex=Number(cp.nextIndex);
      if(!Number.isInteger(nextIndex) || nextIndex<0 || nextIndex>=restoredQueue.length){
        if(cp.nextKey){
          nextIndex=cp.queueKeys.indexOf(String(cp.nextKey));
        }
      }
      if(!Number.isInteger(nextIndex) || nextIndex<=0 || nextIndex>=restoredQueue.length){
        return false;
      }

      planSessionQueue=restoredQueue;
      planSessionAnswers=new Array(restoredQueue.length).fill(null);
      planSessionConfidence=new Array(restoredQueue.length).fill(null);

      if(Array.isArray(cp.answers)){
        for(let i=0;i<Math.min(cp.answers.length,planSessionAnswers.length);i++){
          if(cp.answers[i]===null || Number.isInteger(cp.answers[i])) planSessionAnswers[i]=cp.answers[i];
        }
      }
      if(Array.isArray(cp.confidence)){
        for(let i=0;i<Math.min(cp.confidence.length,planSessionConfidence.length);i++){
          if(cp.confidence[i]===null || ['sure','unsure','wrong'].includes(cp.confidence[i])) planSessionConfidence[i]=cp.confidence[i];
        }
      }

      planSessionCommitted=new Set(
        Array.isArray(cp.committed)
          ? cp.committed.filter(i=>Number.isInteger(i) && i>=0 && i<restoredQueue.length)
          : []
      );
      // Any previously answered slot is already persisted and must never be committed twice.
      for(let i=0;i<nextIndex;i++){
        if(planSessionAnswers[i]!==null) planSessionCommitted.add(i);
      }

      planSessionIdx=nextIndex;
      return true;
    }catch(error){
      console.warn('[keyboard-controls] checkpoint restore failed',error);
      return false;
    }
  }

  // Correct answers are treated as confident automatically.
  // Existing pass-plan logic controls mastery:
  // first correct = provisional, correct again on a different day = mastered,
  // wrong = weak/review and mastered state is removed.
  // The outcome and the next-question waypoint are saved immediately when an
  // answer is selected, so closing/restarting resumes from the following item.
  function installAutomaticClassification(){
    if(typeof window.chooseNavigatorPassPlanAnswer==='function'){
      window.chooseNavigatorPassPlanAnswer=function(i){
        try{
          if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return;
          const q=planSessionQueue[planSessionIdx];
          if(planSessionAnswers[planSessionIdx]!==null || !q || i<0 || i>=q['선택지'].length) return;

          const confidence=(i===q['정답']) ? 'sure' : 'wrong';
          planSessionAnswers[planSessionIdx]=i;
          planSessionConfidence[planSessionIdx]=confidence;

          // Save this question immediately. nextNavigatorPassPlanQuestion()
          // sees planSessionCommitted and will not double-count it.
          if(typeof ppCommitOutcome==='function' && !planSessionCommitted.has(planSessionIdx)){
            ppCommitOutcome(q,i,confidence);
            planSessionCommitted.add(planSessionIdx);
          }

          // Save the session waypoint after the result itself is safely persisted.
          saveSessionCheckpoint();
          renderNavigatorPassPlanCard();
        }catch(error){
          console.warn('[keyboard-controls] automatic classification/autosave error',error);
          // Keep the normal UI usable. If the immediate commit failed,
          // the original next-question logic can still try to commit later.
          try{ renderNavigatorPassPlanCard(); }catch(e){}
        }
      };
    }

    if(typeof window.renderNavigatorPassPlanCard==='function'){
      const originalRender=window.renderNavigatorPassPlanCard;
      window.renderNavigatorPassPlanCard=function(){
        // Original session creation always starts at index 0 with blank answer arrays.
        // Restore only in that fresh state, never while the user is actively solving.
        maybeRestoreSessionCheckpoint();
        const result=originalRender.apply(this,arguments);
        removeConfidencePrompt();
        return result;
      };
    }
  }

  function removeConfidencePrompt(){
    const root=document.getElementById('app') || document.body;
    const prompt='지금 이 문제를 답을 안 보고도 다시 맞힐 수 있습니까?';
    for(const el of root.querySelectorAll('div')){
      if(el.children.length===0 && el.textContent.trim()===prompt){
        const wrapper=el.parentElement;
        if(wrapper) wrapper.remove();
        break;
      }
    }

    for(const el of root.querySelectorAll('div')){
      const text=el.textContent.trim();
      if(el.children.length===0 && text.startsWith('오답은 오늘 미해결로 남습니다.')){
        el.textContent='오답은 복습 대상으로 즉시 저장됩니다. 이후 다른 날의 정답 기록으로 자동 회복됩니다.';
      }
    }
  }

  function handlePassPlan(event){
    try{
      if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return false;

      const choiceIndex=getChoiceIndex(event);
      if(choiceIndex>=0 && typeof window.chooseNavigatorPassPlanAnswer==='function'){
        window.chooseNavigatorPassPlanAnswer(choiceIndex);
        return true;
      }

      if((event.code==='Enter' || event.code==='Space' || event.code==='ArrowRight') && typeof window.nextNavigatorPassPlanQuestion==='function'){
        window.nextNavigatorPassPlanQuestion();
        return true;
      }
    }catch(error){
      console.warn('[keyboard-controls] pass-plan handler error',error);
    }
    return false;
  }

  function handleFocusedButtons(event){
    const el=document.activeElement;
    if(!(el instanceof HTMLButtonElement) || el.disabled) return false;
    if(event.code==='Enter' || event.code==='Space'){
      el.click();
      return true;
    }
    return false;
  }

  installAutomaticClassification();
  removeConfidencePrompt();

  document.addEventListener('keydown',function(event){
    if(event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if(isEditableTarget(event.target)) return;

    const handled=handlePassPlan(event) || handleFocusedButtons(event);
    if(handled){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
})();
