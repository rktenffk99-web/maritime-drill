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
  function loadReports(){
    try{
      const reports=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');
      return Array.isArray(reports)?reports:[];
    }catch(e){return []}
  }
  function saveReports(reports){
    try{localStorage.setItem(REPORTS_KEY,JSON.stringify((reports||[]).slice(-500)));return true}catch(e){return false}
  }
  function escapeText(s){
    return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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

  function optionIndexByInlineColor(buttons,needles){
    for(let i=0;i<buttons.length;i++){
      const style=String(buttons[i].getAttribute('style')||'').toLowerCase();
      if(needles.some(n=>style.includes(n.toLowerCase())))return i;
    }
    return null;
  }
  function collectQuestionSnapshot(){
    const root=appRoot();
    const counter=((root.textContent||'').match(/문제\s+\d+\s*\/\s*\d+/)||[''])[0];
    const card=root.querySelector('.card');
    const tags=card?[...card.querySelectorAll('.tag')].map(x=>x.textContent.trim()).filter(Boolean):[];
    const choiceButtons=card?[...card.querySelectorAll('button[onclick^="chooseNavigatorPassPlanAnswer"]')]:[];
    const choices=choiceButtons.map(b=>b.textContent.replace(/^\s*[㉮㉯㉰㉱]\s*/,'').trim());
    let question='';
    if(choiceButtons.length){
      const n=choiceButtons[0].parentElement?.previousElementSibling;
      if(n)question=n.textContent.trim();
    }
    const feedback=findFeedback(root);
    const feedbackText=feedback?feedback.textContent.trim():'';
    const markers=['㉮','㉯','㉰','㉱'];
    let correctIndex=null,selectedIndex=null;
    const m=feedbackText.match(/정답\s*([㉮㉯㉰㉱])/);
    if(m)correctIndex=markers.indexOf(m[1]);
    if(correctIndex===null||correctIndex<0)correctIndex=optionIndexByInlineColor(choiceButtons,['#10b981','#d1fae5']);
    const wrongIndex=optionIndexByInlineColor(choiceButtons,['#dc2626','#fee2e2']);
    if(wrongIndex!==null)selectedIndex=wrongIndex;
    else if(feedbackText==='정답'&&correctIndex!==null)selectedIndex=correctIndex;
    const explain=root.querySelector('[data-md-explain="1"]');
    return {
      counter,tags,question,choices,
      selectedIndex,correctIndex,feedback:feedbackText,
      explanation:explain?explain.textContent.trim():'',
      page:location.href,
      appTitle:document.title
    };
  }
  function saveReport(reason){
    const snap=collectQuestionSnapshot();
    const reports=loadReports();
    reports.push({createdAt:new Date().toISOString(),reason,...snap});
    saveReports(reports);
    toast(`문제 신고 저장됨 · ${reason}`);
    document.getElementById('md-report-modal')?.remove();
  }
  async function copyText(text){
    try{
      if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}
    }catch(e){}
    try{
      const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
    }catch(e){return false}
  }
  function reportExportText(reports){
    return JSON.stringify({format:'maritime-drill-problem-reports-v1',exportedAt:new Date().toISOString(),count:reports.length,reports},null,2);
  }
  function openReportListModal(){
    document.getElementById('md-report-modal')?.remove();
    document.getElementById('md-report-list-modal')?.remove();
    const reports=loadReports();
    const overlay=document.createElement('div');overlay.id='md-report-list-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.52);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    const rows=reports.slice().reverse().map((r,revIdx)=>{
      const originalIndex=reports.length-1-revIdx;
      const tagText=(r.tags||[]).join(' · ');
      return `<div style="padding:11px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;margin-bottom:8px"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13px">${escapeText(r.reason||'문제 신고')}</b><button type="button" data-md-delete-report="${originalIndex}" style="border:0;background:transparent;color:#94A3B8;cursor:pointer;font-size:12px">삭제</button></div><div style="font-size:10px;color:#64748B;margin-top:3px">${escapeText(r.createdAt||'')} ${r.counter?'· '+escapeText(r.counter):''}</div>${tagText?`<div style="font-size:10px;color:#475569;margin-top:5px">${escapeText(tagText)}</div>`:''}<div style="font-size:12px;line-height:1.55;margin-top:6px;white-space:pre-wrap">${escapeText(r.question||'(구버전 신고: 문제 본문 없음)')}</div></div>`;
    }).join('');
    overlay.innerHTML=`<div class="card" style="width:min(620px,100%);max-height:88vh;margin:0;background:#fff;display:flex;flex-direction:column"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px"><div><div style="font-weight:900;font-size:17px">저장된 문제 신고</div><div style="font-size:11px;color:var(--textDim);margin-top:3px">이 기기에 ${reports.length}건 저장됨 · 기존 신고도 그대로 표시됩니다.</div></div><button class="btn btn-outline" style="width:auto;padding:7px 10px" id="md-report-list-close">닫기</button></div><div style="overflow:auto;min-height:80px;flex:1">${rows||'<div style="padding:28px;text-align:center;color:#64748B;font-size:13px">저장된 신고가 없습니다.</div>'}</div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-accent" style="flex:1" id="md-report-copy" ${reports.length?'':'disabled'}>전체 신고 복사</button><button class="btn btn-outline" style="flex:1" id="md-report-clear" ${reports.length?'':'disabled'}>전체 삭제</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#md-report-list-close').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    overlay.querySelector('#md-report-copy').onclick=async()=>{
      const ok=await copyText(reportExportText(loadReports()));toast(ok?'문제 신고 전체를 복사했습니다. 채팅에 붙여넣어 검수할 수 있습니다.':'복사하지 못했습니다.');
    };
    overlay.querySelector('#md-report-clear').onclick=()=>{
      if(!confirm('저장된 문제 신고를 모두 삭제하시겠습니까?'))return;
      saveReports([]);overlay.remove();toast('문제 신고를 모두 삭제했습니다.');
    };
    overlay.querySelectorAll('[data-md-delete-report]').forEach(btn=>btn.onclick=()=>{
      const idx=Number(btn.dataset.mdDeleteReport);const cur=loadReports();
      if(Number.isInteger(idx)&&idx>=0&&idx<cur.length){cur.splice(idx,1);saveReports(cur);openReportListModal()}
    });
  }
  function openReportModal(){
    document.getElementById('md-report-modal')?.remove();
    const count=loadReports().length;
    const overlay=document.createElement('div');overlay.id='md-report-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div class="card" style="width:min(420px,100%);margin:0;background:#fff"><div style="font-weight:900;font-size:17px;margin-bottom:12px">문제 신고</div><div style="font-size:12px;color:var(--textDim);margin-bottom:12px">현재 문제를 기기에 저장합니다. 문제·선택지·정답 표시·해설도 함께 기록합니다.</div><div id="md-report-actions" style="display:flex;flex-direction:column;gap:8px"></div><button class="btn btn-outline" style="width:100%;margin-top:10px" id="md-report-list">저장된 신고 보기 · ${count}건</button><button class="btn btn-outline" style="width:100%;margin-top:8px" id="md-report-cancel">취소</button></div>`;
    document.body.appendChild(overlay);
    const actions=overlay.querySelector('#md-report-actions');
    ['정답 이상','해설 이상','오타/깨짐'].forEach(reason=>{const b=document.createElement('button');b.className='btn btn-outline';b.style.width='100%';b.textContent=reason;b.onclick=()=>saveReport(reason);actions.appendChild(b)});
    overlay.querySelector('#md-report-list').onclick=openReportListModal;
    overlay.querySelector('#md-report-cancel').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  function addReportButton(){
    const root=appRoot();if(!root||!inPassSession()||document.getElementById('md-report-btn'))return;
    const counter=[...root.querySelectorAll('div')].find(el=>/문제\s+\d+\s*\/\s*\d+/.test(el.textContent.trim())&&el.children.length===0);
    if(!counter)return;
    const b=document.createElement('button');b.id='md-report-btn';b.className='btn btn-outline';
    b.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:6px';b.textContent=`문제 신고${loadReports().length?' · '+loadReports().length:''}`;b.onclick=openReportModal;
    counter.parentElement.appendChild(b);
  }
  window.openMaritimeProblemReports=openReportListModal;

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
