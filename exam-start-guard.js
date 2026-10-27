// Keep asynchronous paper assembly atomic with respect to navigation and sync.
(function(global){
  'use strict';
  if(global.__mdExamStartGuard)return;
  let pending=false;
  const starts=[
    'startPastYearPickSession','startPastAllYearsSession','startPastSession',
    'startPastSpecialSession','startNavi3FrequencyPractice','openNavi3FrequencyQuestion',
    'startNavigatorPredictiveMock','startNavigatorEvaluationMock','startNavigatorPassPlanMock',
    'resumePastProgress'
  ];
  for(const name of starts){
    const original=global[name];if(typeof original!=='function')continue;
    global[name]=async function(...args){
      if(pending)return;
      pending=true;
      const previousMode=currentMode;
      try{
        // The original synchronous prefix must see the current paper so its
        // checkpoint/leave guard can save it before detaching that attempt.
        const task=original.apply(this,args);
        if(currentMode===previousMode)currentMode='past-loading';
        return await task;
      }catch(error){
        console.warn('[exam-start] paper preparation failed',error);
        // Some legacy loaders do not own an error view. Never leave their
        // loading card on screen after a rejected download.
        if(currentMode==='past-loading'&&typeof app!=='undefined'&&typeof escapeHtml==='function'){
          currentMode='past-start-error';
          app.innerHTML=`<div class="card"><b>시험을 준비하지 못했습니다.</b><p>${escapeHtml(error?.message||String(error))}</p><button class="btn btn-outline" onclick="renderSubjectSelect()">시험 목록으로</button></div>`;
        }
        return false;
      }finally{
        pending=false;
        // Successful starts and explicit error renderers own their new mode.
        if(currentMode==='past-loading')currentMode=previousMode;
      }
    };
  }
  // A new licence/menu cannot mutate shared paper metadata while a loader is
  // suspended. It remains available as soon as that load succeeds or fails.
  for(const name of ['renderSubjectSelect','pickPrepType','renderHome','renderPastHome',
    'renderPastYearPick','renderPastSessionPick','renderPastRunner',
    'renderNavi3Frequency','renderNavi3FrequencyDetail','renderNavigatorPassPlan']){
    const original=global[name];if(typeof original!=='function')continue;
    global[name]=function(...args){
      if(pending){
        if(typeof showToast==='function')showToast('시험을 준비하고 있습니다. 준비가 끝난 뒤 이동해 주세요.');
        return;
      }
      return original.apply(this,args);
    };
  }
  global.__mdExamStartGuard={isPending:()=>pending};
})(window);
