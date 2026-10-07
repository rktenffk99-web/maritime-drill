// Optional in-exam explanation toggle for mock exams.
// Read-only UI: viewing an explanation must never change answers or learning progress.
(function(global){
  'use strict';
  const SHELL_ID='md-mock-explanation-shell';
  const BUTTON_ID='md-mock-explanation-toggle';
  const PANEL_ID='md-mock-explanation-panel';
  let activeKey='';
  let expanded=false;
  let scheduled=false;

  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function isMockExam(){
    try{return typeof currentMode!=='undefined'&&currentMode==='past'&&typeof pastMode!=='undefined'&&pastMode==='mock'}catch(e){return false}
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
      return String(q._planKey||q._qid||[
        q._year||'',q['회차']||q._session||'',q['과목']||'',q['번호']??'',typeof pastIdx!=='undefined'?pastIdx:''
      ].join('|'));
    }catch(e){return ''}
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
    button.textContent=expanded?'해설 닫기':'해설 보기';
    panel.hidden=!expanded;
    if(expanded){
      panel.innerHTML=explanationHTML(q);
      panel.querySelectorAll('details').forEach(el=>{el.open=true});
    }else panel.innerHTML='';
  }
  function mount(){
    scheduled=false;
    if(!isMockExam()){removeShell();activeKey='';expanded=false;return}
    const q=currentQuestion();if(!q)return;
    const key=questionKey(q);
    if(activeKey!==key){activeKey=key;expanded=false;removeShell()}
    if(document.getElementById(SHELL_ID))return;
    const next=document.querySelector('button[onclick="pastNext()"]');
    if(!next||!next.parentElement)return;
    const row=next.parentElement;
    const shell=document.createElement('div');shell.id=SHELL_ID;
    shell.style.cssText='margin-top:10px';
    shell.innerHTML=`<button type="button" class="btn btn-outline" id="${BUTTON_ID}" aria-expanded="false" style="width:100%">해설 보기</button><div id="${PANEL_ID}" class="card" hidden style="margin-top:8px;padding:12px 14px"></div>`;
    row.insertAdjacentElement('afterend',shell);
    const button=shell.querySelector('#'+BUTTON_ID);
    button?.addEventListener('click',()=>{expanded=!expanded;renderPanel(shell,q)});
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
