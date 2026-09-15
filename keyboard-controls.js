// Maritime Drill keyboard controls
// 1-4 / A-D: choose an answer
// Enter / Space / Right Arrow: next question
(function(){
  'use strict';

  function isEditableTarget(target){
    if(!target) return false;
    const tag=(target.tagName||'').toLowerCase();
    return tag==='input' || tag==='textarea' || tag==='select' || target.isContentEditable;
  }

  function choiceIndex(event){
    const map={
      Digit1:0,Numpad1:0,KeyA:0,
      Digit2:1,Numpad2:1,KeyB:1,
      Digit3:2,Numpad3:2,KeyC:2,
      Digit4:3,Numpad4:3,KeyD:3
    };
    return Object.prototype.hasOwnProperty.call(map,event.code)?map[event.code]:-1;
  }

  document.addEventListener('keydown',function(event){
    if(event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return;
    try{
      if(typeof currentMode==='undefined' || currentMode!=='pass-plan-session') return;
      const idx=choiceIndex(event);
      if(idx>=0 && typeof window.chooseNavigatorPassPlanAnswer==='function'){
        event.preventDefault();
        window.chooseNavigatorPassPlanAnswer(idx);
        return;
      }
      if((event.code==='Enter'||event.code==='Space'||event.code==='ArrowRight') && typeof window.nextNavigatorPassPlanQuestion==='function'){
        event.preventDefault();
        window.nextNavigatorPassPlanQuestion();
      }
    }catch(error){
      console.warn('[keyboard-controls] handler error',error);
    }
  },true);
})();
