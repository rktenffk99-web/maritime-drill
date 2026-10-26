// Optional hints for written mock exams. Answers and full solutions stay hidden.
(function(global){
  'use strict';
  const SHELL='md-mock-hint-shell',BUTTON='md-mock-hint-toggle',PANEL='md-mock-hint-panel';
  let activeKey='',activeAnswers=null,expanded=false,scheduled=false;
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=value=>String(value==null?'':value).normalize('NFKC').toLowerCase().replace(/\s+/g,'');

  function currentQuestion(){
    if(typeof currentMode==='undefined'||currentMode!=='past'||typeof pastMode==='undefined'||pastMode!=='mock')return null;
    return typeof pastQueue!=='undefined'&&Array.isArray(pastQueue)&&typeof pastIdx!=='undefined'?pastQueue[pastIdx]||null:null;
  }
  function textOnly(html){
    const template=document.createElement('template');
    template.innerHTML=String(html||'').replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi,'\n');
    template.content.querySelectorAll('script,style,iframe,object').forEach(el=>el.remove());
    return template.content.textContent||'';
  }
  function hintFor(q){
    const stem=String(q&&q['문제']||''),subject=String(q&&q['과목']||''),normalized=norm(stem);
    const topic=global.__mdWeakTopicClassifier?.classify(subject,stem,[])||subject;
    let guidance='질문이 요구하는 대상과 조건을 먼저 표시하고, 각 보기의 설명이 그 조건에 맞는지 비교해 보세요.';
    if(/옳지\s*않|맞지\s*않|틀린|아닌\s*것|incorrect|\bexcept\b|\bnot\s+(?:true|correct)\b/i.test(stem)){
      guidance='옳지 않은 설명이나 예외를 고르는 문제입니다. 보기마다 조건이 맞는지 확인한 뒤, 질문의 부정 표현을 다시 확인하세요.';
    }else if(subject==='영어'){
      guidance=/_{2,}|빈칸|blank|\(\s*\)/i.test(stem)?'빈칸 앞뒤의 품사와 시제를 먼저 확인하고, 문장 전체의 의미에 맞는 표현을 비교하세요.':'문장의 주어와 동사를 먼저 찾고, 질문이 묻는 대상·동작·조건을 구분해서 읽어 보세요.';
    }else if(/계산|구하|몇\s*(?:해리|노트|도|분|시간|미터)|속력.*(?:시간|거리)|항정|중분위도/.test(stem)){
      guidance='주어진 값과 구하려는 값을 단위와 함께 적어 보세요. 필요한 관계식을 정한 뒤 거리·시간·각도 단위를 맞춰 계산하세요.';
    }else if(subject==='법규'||/협약|규칙|규정|이상|이하|초과|미만/.test(stem)){
      guidance='규정이 적용되는 대상과 예외 조건을 나누어 확인하세요. 수치가 있다면 이상·이하·초과·미만의 경계를 비교해 보세요.';
    }
    let explanation=null;
    try{if(typeof getExplain==='function')explanation=getExplain(q)}catch(error){console.warn('[mock-hint] explanation unavailable',error)}
    const candidates=[];
    if(explanation&&!explanation.loading){
      if(explanation['용어']&&typeof explanation['용어']==='object'){
        for(const [term,definition]of Object.entries(explanation['용어'])){
          if(typeof definition==='string')candidates.push([term,definition]);
        }
      }
      if(explanation.html){
        // Never turn answer explanations, choice translations or memorisation
        // summaries into hints: those sections can contain the complete answer.
        const section=String(explanation.html).match(/━━\s*용어\s*정리\s*━━([\s\S]*?)(?=━━|$)/);
        if(section)for(const line of textOnly(section[1]).split(/\n|[•●]/)){
          const entry=line.trim().match(/^(.{1,100}?)\s*[:：]\s*(.+)$/);
          if(entry)candidates.push([entry[1],entry[2]]);
        }
      }
    }
    const correct=Number.isInteger(q&&q['정답'])&&Array.isArray(q['선택지'])?norm(String(q['선택지'][q['정답']]||'').replace(/^\s*[㉮㉯㉰㉱㉴㉵]\s*/,'')):'';
    const seen=new Set(),terms=[];
    for(const [rawTerm,rawDefinition]of candidates){
      const term=String(rawTerm).replace(/\([^)]*\)/g,'').replace(/\*+/g,'').trim();
      const definition=String(rawDefinition).trim(),key=norm(term);
      if(key.length<2||!normalized.includes(key)||seen.has(key))continue;
      if(/정답|오답|[㉮㉯㉰㉱㉴㉵①②③④]|(?:보기|선택지)\s*[1-4가-라]/.test(definition))continue;
      // Even a short answer such as a two-character term or a number can be
      // the whole solution. Fall back to the question-reading hint if needed.
      if(correct&&norm(term+' '+definition).includes(correct))continue;
      seen.add(key);terms.push({term,definition:definition.length>220?definition.slice(0,220)+'…':definition});
      if(terms.length===2)break;
    }
    return {topic,guidance,terms};
  }
  function remove(){document.getElementById(SHELL)?.remove()}
  function render(shell,q){
    const button=shell.querySelector('#'+BUTTON),panel=shell.querySelector('#'+PANEL);
    button.textContent=expanded?'힌트 닫기 (0)':'힌트 보기 (0)';
    button.setAttribute('aria-expanded',String(expanded));panel.hidden=!expanded;
    if(!expanded){panel.innerHTML='';return}
    const hint=hintFor(q),scored=pastQueue.some(row=>row&&(row._unifiedMock||row._evaluationMock));
    panel.innerHTML=`<div style="font-size:13px;font-weight:800;color:#92400E;margin-bottom:8px">풀이 힌트${hint.topic?' · '+esc(hint.topic):''}</div><p style="margin:0;font-size:14px;line-height:1.7">${esc(hint.guidance)}</p>${hint.terms.length?`<div style="margin-top:10px;font-size:12px;color:#92400E">지문 속 용어 · 기존 해설에서 발췌</div>${hint.terms.map(term=>`<p style="margin:6px 0 0;font-size:13px;line-height:1.7"><b>${esc(term.term)}</b>: ${esc(term.definition)}</p>`).join('')}`:''}${scored?'<p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#92400E">힌트를 참고한 시험은 이번 점수를 표시하고 최근 평균에서 제외합니다.</p>':''}`;
  }
  function mount(){
    scheduled=false;
    const q=currentQuestion();
    if(!q){remove();activeKey='';activeAnswers=null;expanded=false;return null}
    const key=[pastStartedAt,pastIdx,typeof pqid==='function'?pqid(q):q._planKey||''].join('|');
    if(activeKey!==key||activeAnswers!==pastAnswers){activeKey=key;activeAnswers=pastAnswers;expanded=false;remove()}
    const old=document.getElementById(SHELL);if(old)return old;
    const next=document.querySelector('button[onclick="pastNext()"]');if(!next?.parentElement)return null;
    const shell=document.createElement('div');shell.id=SHELL;shell.style.cssText='margin:12px 0';
    shell.innerHTML=`<button type="button" class="btn btn-outline" id="${BUTTON}" aria-controls="${PANEL}" aria-expanded="false" aria-keyshortcuts="0" style="width:100%;border-color:#D97706;color:#92400E">힌트 보기 (0)</button><div id="${PANEL}" role="region" aria-label="풀이 힌트" hidden style="padding:14px;margin-top:8px;border:1px solid #FCD34D;border-radius:10px;background:#FFFBEB;color:#78350F"></div>`;
    next.parentElement.insertAdjacentElement('beforebegin',shell);
    shell.querySelector('#'+BUTTON).addEventListener('click',()=>toggle());
    render(shell,q);return shell;
  }
  function toggle(){
    const shell=mount(),q=currentQuestion();if(!shell||!q)return false;
    if(!expanded&&q._mockHintViewed!==true){
      q._mockHintViewed=true;
      if(typeof savePastProgress!=='function'||savePastProgress({requireCheckpoint:true})!==true){
        delete q._mockHintViewed;
        if(typeof showToast==='function')showToast('힌트 사용 기록을 저장하지 못했습니다. 다시 저장한 뒤 시도하세요.',5000);
        return false;
      }
    }
    expanded=!expanded;render(shell,q);
    if(expanded)shell.scrollIntoView?.({block:'nearest',behavior:'auto'});
    return true;
  }
  function schedule(){
    if(scheduled)return;scheduled=true;
    if(typeof queueMicrotask==='function')queueMicrotask(mount);else Promise.resolve().then(mount);
  }
  const root=document.getElementById('app');
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  global.__mdMockHintControls={mount,toggle,hintFor,currentQuestion};
})(window);
