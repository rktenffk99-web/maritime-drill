// Maritime Drill keyboard controls
// 1-4 / A-D: choose an answer
// Y: "확실히 안다", N: "애매 · 찍음"
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

  function handlePassPlan(event){
    try{
      if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return false;

      const choiceIndex=getChoiceIndex(event);
      if(choiceIndex>=0 && typeof window.chooseNavigatorPassPlanAnswer==='function'){
        window.chooseNavigatorPassPlanAnswer(choiceIndex);
        return true;
      }

      if(event.code==='KeyY' && typeof window.setNavigatorPassPlanConfidence==='function'){
        window.setNavigatorPassPlanConfidence('sure');
        return true;
      }
      if(event.code==='KeyN' && typeof window.setNavigatorPassPlanConfidence==='function'){
        window.setNavigatorPassPlanConfidence('unsure');
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
