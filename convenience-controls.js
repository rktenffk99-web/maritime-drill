// Maritime Drill convenience mode
// Resume banner, answer-aware explanation collapse, problem reporting, wake lock.
(function(){
  'use strict';

  const CHECKPOINT_KEY='md_pass_plan_session_checkpoint_v2';
  const REPORTS_KEY='md_problem_reports_v1';
  let wakeLock=null;

  function appRoot(){return document.getElementById('app');}
  function currentCheckpoint(){
    try{
      const cp=JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'null');
      if(!cp||cp.version!==2||!Array.isArray(cp.queueKeys)||!cp.queueKeys.length)return null;
      return cp;
    }catch(e){return null}
  }
  function inPassSession(){
    const root=appRoot();
    if(!root)return false;
    return /문제\s+\d+\s*\/\s*\d+/.test(root.textContent||'') && !!root.querySelector('button[onclick^="chooseNavigatorPassPlanAnswer"]');
  }
  function toast(msg){
    if(typeof window.showToast==='function')window.showToast(msg);else console.log(msg);
  }

  function cleanLegacyConfidenceUi(){
    const root=appRoot();if(!root)return;
    const prompt='지금 이 문제를 답을 안 보고도 다시 맞힐 수 있습니까?';
    for(const el of root.querySelectorAll('div')){
      if(el.children.length===0&&el.textContent.trim()===prompt){
        const wrapper=el.parentElement;if(wrapper)wrapper.remove();break;
      }
    }
  }

  function addResumeBanner(){
    const root=appRoot();if(!root||inPassSession())return;
    const cp=currentCheckpoint();
    const old=document.getElementById('md-resume-banner');
    if(!cp){if(old)old.remove();return}
    if(old)return;
    const total=cp.queueKeys.length;
    const next=Math.min(total,Math.max(1,(Number(cp.nextIndex)||0)+1));
    const banner=document.createElement('button');
    banner.id='md-resume-banner';
    banner.className='btn btn-accent';
    banner.style.cssText='width:100%;margin:10px 0 14px 0;font-weight:900;position:relative;z-index:3';
    banner.textContent=`이어서 풀기 · ${next}/${total}`;
    banner.addEventListener('click',()=>{
      if(typeof window.startNavigatorPassPlanToday==='function')window.startNavigatorPassPlanToday();
    });
    const firstCard=root.querySelector('.card');
    if(firstCard)root.insertBefore(banner,firstCard);else root.prepend(banner);
  }

  function findFeedback(root){
    for(const el of root.querySelectorAll('div')){
      const t=el.textContent.trim();
      if(el.children.length===0&&(t==='정답'||/^오답\s*·\s*정답/.test(t)))return el;
    }
    return null;
  }
  function applyExplanationMode(){
    const root=appRoot();if(!root||!inPassSession())return;
    const feedback=findFeedback(root);if(!feedback)return;
    const isCorrect=feedback.textContent.trim()==='정답';
    const explain=feedback.nextElementSibling;
    if(!explain||explain.id==='md-explain-toggle')return;
    explain.dataset.mdExplain='1';
    let toggle=root.querySelector('#md-explain-toggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.id='md-explain-toggle';
      toggle.className='btn btn-outline';
      toggle.style.cssText='width:100%;margin-top:10px';
      explain.parentNode.insertBefore(toggle,explain);
      toggle.addEventListener('click',()=>{
        const hidden=explain.style.display==='none';
        explain.style.display=hidden?'':'none';
        toggle.textContent=hidden?'해설 접기':'해설 보기';
      });
    }
    if(isCorrect){
      explain.style.display='none';
      toggle.textContent='해설 보기';
    }else{
      explain.style.display='';
      toggle.textContent='해설 접기';
    }
  }

  function collectQuestionSnapshot(){
    const root=appRoot();
    const counter=((root.textContent||'').match(/문제\s+\d+\s*\/\s*\d+/)||[''])[0];
    const card=root.querySelector('.card');
    const tags=card?[...card.querySelectorAll('.tag')].map(x=>x.textContent.trim()).filter(Boolean):[];
    let question='';
    if(card){
      const choice=card.querySelector('button[onclick^="chooseNavigatorPassPlanAnswer"]');
      if(choice){
        let n=choice.parentElement?.previousElementSibling;
        if(n)question=n.textContent.trim();
      }
    }
    return {counter,tags,question};
  }
  function saveReport(reason){
    const snap=collectQuestionSnapshot();
    let reports=[];
    try{reports=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');if(!Array.isArray(reports))reports=[]}catch(e){reports=[]}
    reports.push({createdAt:new Date().toISOString(),reason,...snap});
    try{localStorage.setItem(REPORTS_KEY,JSON.stringify(reports.slice(-500)))}catch(e){}
    toast(`문제 신고 저장됨 · ${reason}`);
    document.getElementById('md-report-modal')?.remove();
  }
  function openReportModal(){
    document.getElementById('md-report-modal')?.remove();
    const overlay=document.createElement('div');overlay.id='md-report-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML='<div class="card" style="width:min(420px,100%);margin:0;background:#fff"><div style="font-weight:900;font-size:17px;margin-bottom:12px">문제 신고</div><div style="font-size:12px;color:var(--textDim);margin-bottom:12px">현재 문제를 기기에 저장합니다. 나중에 검수 목록으로 활용할 수 있습니다.</div><div id="md-report-actions" style="display:flex;flex-direction:column;gap:8px"></div><button class="btn btn-outline" style="width:100%;margin-top:10px" id="md-report-cancel">취소</button></div>';
    document.body.appendChild(overlay);
    const actions=overlay.querySelector('#md-report-actions');
    ['정답 이상','해설 이상','오타/깨짐'].forEach(reason=>{const b=document.createElement('button');b.className='btn btn-outline';b.style.width='100%';b.textContent=reason;b.onclick=()=>saveReport(reason);actions.appendChild(b)});
    overlay.querySelector('#md-report-cancel').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  function addReportButton(){
    const root=appRoot();if(!root||!inPassSession()||document.getElementById('md-report-btn'))return;
    const counter=[...root.querySelectorAll('div')].find(el=>/문제\s+\d+\s*\/\s*\d+/.test(el.textContent.trim())&&el.children.length===0);
    if(!counter)return;
    const b=document.createElement('button');b.id='md-report-btn';b.className='btn btn-outline';
    b.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:6px';b.textContent='문제 신고';b.onclick=openReportModal;
    counter.parentElement.appendChild(b);
  }

  async function requestWakeLock(){
    if(!inPassSession()||document.visibilityState!=='visible'||!('wakeLock' in navigator)||wakeLock)return;
    try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}catch(e){}
  }
  async function syncWakeLock(){
    if(inPassSession())await requestWakeLock();
    else if(wakeLock){try{await wakeLock.release()}catch(e){}wakeLock=null}
  }

  let queued=false;
  function enhance(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;cleanLegacyConfidenceUi();addResumeBanner();applyExplanationMode();addReportButton();syncWakeLock()});
  }
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',enhance);
  document.addEventListener('pointerdown',requestWakeLock,{passive:true});
  document.addEventListener('keydown',requestWakeLock);
  enhance();
})();
