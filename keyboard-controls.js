// Maritime Drill keyboard controls
// 1-4 / A-D: choose an answer
// Enter / Numpad Enter / Space / Right Arrow: next question
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

  function isNextKey(event){
    return event.key==='Enter' || event.code==='Enter' || event.code==='NumpadEnter' || event.code==='Space' || event.code==='ArrowRight';
  }

  function cleanLegacyConfidenceUi(){
    const root=document.getElementById('app');
    if(!root) return;
    const prompt='지금 이 문제를 답을 안 보고도 다시 맞힐 수 있습니까?';
    for(const el of root.querySelectorAll('div')){
      if(el.children.length===0 && el.textContent.trim()===prompt){
        const wrapper=el.parentElement;
        if(wrapper) wrapper.remove();
        break;
      }
    }
  }

  const observer=new MutationObserver(cleanLegacyConfidenceUi);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  cleanLegacyConfidenceUi();

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
      if(isNextKey(event) && typeof window.nextNavigatorPassPlanQuestion==='function'){
        // Prevent Enter on the previously focused choice/button from firing its
        // native click action. In pass-plan sessions Enter always means "next".
        event.preventDefault();
        event.stopPropagation();
        window.nextNavigatorPassPlanQuestion();
      }
    }catch(error){
      console.warn('[keyboard-controls] handler error',error);
    }
  },true);
})();
