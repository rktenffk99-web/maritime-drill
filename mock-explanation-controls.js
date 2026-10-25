// Optional in-exam explanation toggle for mock exams.
// Viewing an explanation never changes answers or learning progress. Evaluation
// papers remember that help was used so their score stays out of unaided averages.
(function(global){
  'use strict';
  const SHELL_ID='md-mock-explanation-shell';
  const BUTTON_ID='md-mock-explanation-toggle';
  const PANEL_ID='md-mock-explanation-panel';
  let activeKey='';
  let activeAnswers=null;
  let expanded=false;
  let scheduled=false;

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function isMockExam(){
    try{
      if(!(typeof currentMode!=='undefined'&&currentMode==='past'&&typeof pastMode!=='undefined'&&pastMode==='mock'))return false;
      return true;
    }catch(e){return false}
  }
  function currentQuestion(){
    try{
      if(!isMockExam()||typeof pastQueue==='undefined'||typeof pastIdx==='undefined'||!Array.isArray(pastQueue))return null;
      return pastQueue[pastIdx]||null;
    }catch(e){return null}
  }
  function questionKey(q){
    if(!q)return '';
    try{
      const identity=q._planKey||q._qid||[q._short||q._gradeShort||'',q._year||'',q['회차']||q._session||'',q['과목']||'',q['번호']??''].join('|');
      return [typeof pastStartedAt!=='undefined'?pastStartedAt:'',typeof pastIdx!=='undefined'?pastIdx:'',identity].join('|');
    }catch(e){return ''}
  }
  function answerHTML(q){
    const choices=q&&Array.isArray(q['선택지'])?q['선택지']:[];
    const raw=q&&q['정답'];
    const correct=typeof raw==='number'||typeof raw==='string'&&/^\d+$/.test(raw)?Number(raw):NaN;
    if(!Number.isInteger(correct)||correct<0||correct>=choices.length)return '<div style="margin-bottom:10px;font-size:13px;color:var(--textDim)">등록된 정답을 확인할 수 없습니다.</div>';
    const choice=typeof pastChoiceText==='function'?pastChoiceText(choices[correct]):choices[correct];
    return `<div class="md-mock-correct-answer" style="padding:12px;margin-bottom:12px;border-radius:9px;background:#ECFDF5;color:#065F46"><b>정답: ${esc(['㉮','㉯','㉰','㉱'][correct]||String(correct+1))}</b><div style="margin-top:5px;line-height:1.65;white-space:pre-wrap">${esc(choice)}</div></div>`;
  }
  function recordEvaluationHelp(q){
    if(q._evaluationExplanationViewed===true||!pastQueue.some(row=>row&&row._evaluationMock))return;
    q._evaluationExplanationViewed=true;
    if(typeof savePastProgress==='function')savePastProgress();
  }
  function explanationHTML(q){
    try{
      if(typeof renderExplainBlock==='function'){
        const html=renderExplainBlock(q,{compact:true});
        if(html&&String(html).trim())return String(html);
      }
    }catch(e){console.warn('[mock-explanation] render failed',e)}
    const raw=q&&(q['해설']||q['정답해설']||q.explanation||q.explain);
    return raw?`<div style="font-size:13px;line-height:1.65">${esc(raw)}</div>`:'<div style="font-size:13px;color:var(--textDim);line-height:1.6">이 문항에는 등록된 해설이 없습니다.</div>';
  }
  function removeShell(){document.getElementById(SHELL_ID)?.remove()}
  function renderPanel(shell,q){
    const button=shell.querySelector('#'+BUTTON_ID),panel=shell.querySelector('#'+PANEL_ID);
    if(!button||!panel)return;
    button.setAttribute('aria-expanded',String(expanded));
    button.textContent=expanded?'정답·해설 닫기':'정답·해설 보기';
    panel.hidden=!expanded;
    if(expanded){
      recordEvaluationHelp(q);
      panel.innerHTML=answerHTML(q)+explanationHTML(q);
      panel.querySelectorAll('details').forEach(el=>{el.open=true});
    }else panel.innerHTML='';
  }
  function mount(){
    scheduled=false;
    if(!isMockExam()){removeShell();activeKey='';activeAnswers=null;expanded=false;return}
    const q=currentQuestion();if(!q)return;
    const key=questionKey(q);
    const answers=typeof pastAnswers!=='undefined'?pastAnswers:null;
    if(activeKey!==key||activeAnswers!==answers){activeKey=key;activeAnswers=answers;expanded=false;removeShell()}
    if(document.getElementById(SHELL_ID))return;
    const next=document.querySelector('button[onclick="pastNext()"]');
    if(!next||!next.parentElement)return;
    const row=next.parentElement;
    const shell=document.createElement('div');shell.id=SHELL_ID;
    const evaluation=pastQueue.some(item=>item&&item._evaluationMock);
    shell.style.cssText='margin-top:10px';
    shell.innerHTML=`<button type="button" class="btn btn-outline" id="${BUTTON_ID}" aria-controls="${PANEL_ID}" aria-expanded="false" style="width:100%">정답·해설 보기</button>${evaluation?'<p style="font-size:11px;color:var(--textDim);line-height:1.5;margin-top:7px">정답·해설을 참고한 평가는 점수만 표시하고 최근 평균에서 제외합니다.</p>':''}<div id="${PANEL_ID}" class="card" role="region" aria-label="정답과 해설" hidden style="margin-top:8px;padding:12px 14px"></div>`;
    row.insertAdjacentElement('afterend',shell);
    const button=shell.querySelector('#'+BUTTON_ID);
    button?.addEventListener('click',()=>{expanded=!expanded;renderPanel(shell,q)});
    button?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.code==='Space'||event.key===' ')event.stopPropagation()});
    renderPanel(shell,q);
  }
  function scheduleMount(){
    if(scheduled)return;scheduled=true;
    if(typeof queueMicrotask==='function')queueMicrotask(mount);else Promise.resolve().then(mount);
  }
  const root=document.getElementById('app');
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(scheduleMount).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleMount,{once:true});
  else scheduleMount();

  global.__mdMockExplanationControls={mount,isMockExam,currentQuestion,questionKey};
})(window);
