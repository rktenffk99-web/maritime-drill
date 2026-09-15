// Maritime Drill keyboard controls + automatic pass-plan classification
// 1-4 / A-D: choose an answer
// Enter / Space / Right Arrow: next question when allowed
(function(){
  'use strict';

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

  // Correct answers are treated as a confident answer automatically.
  // Existing pass-plan logic still controls mastery:
  // first correct = provisional, correct again on a different day = mastered,
  // wrong = weak/review and mastered state is removed.
  function installAutomaticClassification(){
    if(typeof window.chooseNavigatorPassPlanAnswer==='function'){
      window.chooseNavigatorPassPlanAnswer=function(i){
        try{
          if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return;
          const q=planSessionQueue[planSessionIdx];
          if(planSessionAnswers[planSessionIdx]!==null || !q || i<0 || i>=q['선택지'].length) return;
          planSessionAnswers[planSessionIdx]=i;
          planSessionConfidence[planSessionIdx]=(i===q['정답']) ? 'sure' : 'wrong';
          renderNavigatorPassPlanCard();
        }catch(error){
          console.warn('[keyboard-controls] automatic classification error',error);
        }
      };
    }

    if(typeof window.renderNavigatorPassPlanCard==='function'){
      const originalRender=window.renderNavigatorPassPlanCard;
      window.renderNavigatorPassPlanCard=function(){
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
        el.textContent='오답은 복습 대상으로 남습니다. 이후 다른 날의 정답 기록으로 자동 회복됩니다.';
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
