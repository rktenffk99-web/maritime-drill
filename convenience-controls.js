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
  function questionChoiceButtons(root){
    const card=root&&root.querySelector('.card');
    if(!card)return [];
    return [...card.querySelectorAll('button')].filter(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      const text=(btn.textContent||'').trim();
      if(onclick&&/(?:answer|choose|select)/i.test(onclick)&&!/(?:next|prev|back|home|report|bookmark|restart)/i.test(onclick))return true;
      return /^(?:[가나다라]|[㉠㉡㉢㉣]|[①②③④])(?:\s|\.|\)|:|$)/.test(text);
    });
  }
  function inQuestionSession(){
    const root=appRoot();
    return !!root&&questionChoiceButtons(root).length>=2;
  }
  function inPassSession(){
    const root=appRoot();
    if(!root)return false;
    return /문제\s+\d+\s*\/\s*\d+/.test(root.textContent||'') && !!root.querySelector('button[onclick^="chooseNavigatorPassPlanAnswer"]');
  }
  function toast(msg){
    if(typeof window.showToast==='function')window.showToast(msg);else console.log(msg);
  }
  function escapeText(s){return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

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
    const root=appRoot();if(!root||inQuestionSession())return;
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

  function findQuestionCounter(root){
    if(!root)return null;
    const exact=/^(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+$/;
    const loose=/(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+/;
    const nodes=[...root.querySelectorAll('div,span')];
    return nodes.find(el=>el.children.length===0&&exact.test((el.textContent||'').trim()))
      ||nodes.find(el=>(el.textContent||'').trim().length<80&&loose.test((el.textContent||'').trim()))
      ||null;
  }
  function collectQuestionSnapshot(){
    const root=appRoot();
    const counterEl=findQuestionCounter(root);
    const counter=counterEl?(counterEl.textContent||'').trim():(((root.textContent||'').match(/(?:실전예측|모의|문제)\s*\d+\s*\/\s*\d+/)||[''])[0]);
    const card=root.querySelector('.card');
    const tags=card?[...card.querySelectorAll('.tag')].map(x=>x.textContent.trim()).filter(Boolean):[];
    let question='';
    if(card){
      const choice=questionChoiceButtons(root)[0];
      if(choice){
        let n=choice.parentElement?.previousElementSibling;
        if(n)question=(n.textContent||'').trim();
        if(!question){
          const children=[...card.children],holder=children.find(el=>el===choice||el.contains(choice)),idx=children.indexOf(holder);
          for(let i=idx-1;i>=0;i--){
            const candidate=children[i],text=(candidate.textContent||'').trim();
            if(text&&!candidate.querySelector('button')&&!candidate.classList.contains('tag')){question=text;break}
          }
        }
      }
    }
    return {counter,tags,question};
  }
  function readReports(){
    try{const v=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}
  }
  function formatReports(reports){
    return reports.map((r,i)=>`#${i+1} ${r.reason||'신고'}\n시각: ${r.createdAt||''}\n표시: ${(r.tags||[]).join(' · ')} ${r.counter||''}\n문제: ${r.question||''}`).join('\n\n');
  }
  async function copyReports(){
    const reports=readReports();if(!reports.length){toast('저장된 문제 신고가 없습니다.');return}
    const text=formatReports(reports);
    try{await navigator.clipboard.writeText(text);toast(`문제 신고 ${reports.length}건을 복사했습니다.`)}catch(e){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(`문제 신고 ${reports.length}건을 복사했습니다.`)
    }
  }
  function openReportListModal(){
    document.getElementById('md-report-list-modal')?.remove();
    const reports=readReports();
    const overlay=document.createElement('div');overlay.id='md-report-list-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px';
    const rows=reports.length?reports.slice().reverse().map((r,ri)=>`<div style="padding:10px;border:1px solid #E2E8F0;border-radius:9px;background:#F8FAFC"><div style="font-size:12px;font-weight:900">${escapeText(r.reason||'신고')} · #${reports.length-ri}</div><div style="font-size:10px;color:#64748B;margin-top:3px">${escapeText((r.tags||[]).join(' · '))} ${escapeText(r.counter||'')}</div><div style="font-size:12px;line-height:1.55;margin-top:6px">${escapeText(r.question||'문제 문구 없음')}</div></div>`).join(''):'<div style="padding:18px;text-align:center;color:#64748B">저장된 문제 신고가 없습니다.</div>';
    overlay.innerHTML=`<div class="card" style="width:min(640px,100%);max-height:85vh;overflow:auto;margin:0;background:#fff"><div style="font-size:17px;font-weight:900">저장된 문제 신고 · ${reports.length}건</div><div style="font-size:11px;color:#64748B;margin:5px 0 12px">신고는 이 브라우저의 localStorage에만 저장됩니다. 아래 복사 버튼으로 검수용 내용을 가져올 수 있습니다.</div><div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn btn-accent" style="flex:1" id="md-report-copy" ${reports.length?'':'disabled'}>전체 복사</button><button class="btn btn-outline" style="flex:1" id="md-report-list-close">닫기</button></div><div style="display:flex;flex-direction:column;gap:8px">${rows}</div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#md-report-copy').onclick=copyReports;
    overlay.querySelector('#md-report-list-close').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  window.openMaritimeProblemReports=openReportListModal;
  window.copyMaritimeProblemReports=copyReports;

  function saveReport(reason){
    const snap=collectQuestionSnapshot();
    const reports=readReports();
    reports.push({createdAt:new Date().toISOString(),reason,...snap});
    try{localStorage.setItem(REPORTS_KEY,JSON.stringify(reports.slice(-500)))}catch(e){}
    toast(`문제 신고 저장됨 · ${reason}`);
    document.getElementById('md-report-modal')?.remove();
  }
  function openReportModal(){
    document.getElementById('md-report-modal')?.remove();
    const count=readReports().length;
    const overlay=document.createElement('div');overlay.id='md-report-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div class="card" style="width:min(420px,100%);margin:0;background:#fff"><div style="font-weight:900;font-size:17px;margin-bottom:12px">문제 신고</div><div style="font-size:12px;color:var(--textDim);margin-bottom:12px">현재 문제를 이 브라우저에 저장합니다. 저장된 신고는 아래에서 확인·복사할 수 있습니다.</div><div id="md-report-actions" style="display:flex;flex-direction:column;gap:8px"></div><button class="btn btn-outline" style="width:100%;margin-top:10px" id="md-report-list">저장된 신고 ${count}건 보기</button><button class="btn btn-outline" style="width:100%;margin-top:8px" id="md-report-cancel">취소</button></div>`;
    document.body.appendChild(overlay);
    const actions=overlay.querySelector('#md-report-actions');
    ['정답 이상','해설 이상','오타/깨짐'].forEach(reason=>{const b=document.createElement('button');b.className='btn btn-outline';b.style.width='100%';b.textContent=reason;b.onclick=()=>saveReport(reason);actions.appendChild(b)});
    overlay.querySelector('#md-report-list').onclick=()=>{overlay.remove();openReportListModal()};
    overlay.querySelector('#md-report-cancel').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  function addReportButton(){
    const root=appRoot();if(!root||!inQuestionSession()||document.getElementById('md-report-btn'))return;
    const counter=findQuestionCounter(root);
    const b=document.createElement('button');b.id='md-report-btn';b.className='btn btn-outline';
    b.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:6px';b.textContent='문제 신고';b.onclick=openReportModal;
    const count=readReports().length;
    const list=count?document.createElement('button'):null;
    if(list){list.id='md-report-list-btn';list.className='btn btn-outline';list.style.cssText='width:auto;padding:8px 10px;font-size:12px;margin-left:4px';list.textContent=`신고 ${count}`;list.onclick=openReportListModal}
    if(counter&&counter.parentElement){
      counter.parentElement.appendChild(b);if(list)counter.parentElement.appendChild(list);
    }else{
      const card=root.querySelector('.card');if(!card)return;
      const row=document.createElement('div');row.id='md-report-row';row.style.cssText='display:flex;justify-content:flex-end;align-items:center;margin:0 0 8px';
      row.appendChild(b);if(list)row.appendChild(list);card.parentNode.insertBefore(row,card);
    }
  }

  async function requestWakeLock(){
    if(!inQuestionSession()||document.visibilityState!=='visible'||!('wakeLock' in navigator)||wakeLock)return;
    try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}catch(e){}
  }
  async function syncWakeLock(){
    if(inQuestionSession())await requestWakeLock();
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
