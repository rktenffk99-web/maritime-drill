// Maritime Drill keyboard controls
// 1-4 / A-D: choose an answer
// Enter / Numpad Enter / Space / Right Arrow: next question
// Left Arrow: previous question
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
      if(event.code==='ArrowLeft' && typeof window.prevNavigatorPassPlanQuestion==='function'){
        event.preventDefault();
        event.stopPropagation();
        window.prevNavigatorPassPlanQuestion();
        return;
      }
      if(isNextKey(event) && typeof window.nextNavigatorPassPlanQuestion==='function'){
        event.preventDefault();
        event.stopPropagation();
        window.nextNavigatorPassPlanQuestion();
      }
    }catch(error){
      console.warn('[keyboard-controls] handler error',error);
    }
  },true);
})();

// Load the cross-device merge patch while the document is still parsing so it
// replaces the v5.08 Drive hooks before driveSyncInit() runs on the first timer tick.
(function(){
  const src='drive-sync-v2.js';
  if(document.readyState==='loading'){
    document.write('<script src="'+src+'"><\\/script>');
  }else{
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    document.head.appendChild(script);
  }
})();
