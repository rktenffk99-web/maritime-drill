// Maritime Drill convenience mode
// Resume banner, answer-aware explanation collapse, problem reporting, wake lock.
(function(){
  'use strict';

  const CHECKPOINT_KEY='md_pass_plan_session_checkpoint_v2';
  const REPORTS_KEY='md_problem_reports_v1';
  const RESOLVED_REPORTS_CUTOFF='2026-09-17T03:17:00.000Z';
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

  function cleanLegacyConfidenceUi(){ /* v5.11: explicit confidence is part of learning. */ }

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
    try{
      const v=JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]'),reports=Array.isArray(v)?v:[];
      const cutoff=Date.parse(RESOLVED_REPORTS_CUTOFF);
      const kept=reports.filter(r=>{
        const t=Date.parse(r&&r.createdAt||'');
        return !Number.isFinite(t)||t>cutoff;
      });
      if(kept.length!==reports.length){
        if(kept.length)localStorage.setItem(REPORTS_KEY,JSON.stringify(kept));
        else localStorage.removeItem(REPORTS_KEY);
      }
      return kept;
    }catch(e){return []}
  }
  function formatReports(reports){
    return reports.map((r,i)=>{
      const detail=String(r.detail||'').trim();
      return `#${i+1} ${r.reason||'신고'}\n시각: ${r.createdAt||''}\n표시: ${(r.tags||[]).join(' · ')} ${r.counter||''}\n문제: ${r.question||''}${detail?`\n신고내용: ${detail}`:''}`;
    }).join('\n\n');
  }
  async function copyReports(){
    const reports=readReports();if(!reports.length){toast('저장된 문제 신고가 없습니다.');return}
    const text=formatReports(reports);
    try{await navigator.clipboard.writeText(text);toast(`문제 신고 ${reports.length}건을 복사했습니다.`)}catch(e){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(`문제 신고 ${reports.length}건을 복사했습니다.`)
    }
  }
  function clearReports(){
    const reports=readReports();if(!reports.length){toast('삭제할 문제 신고가 없습니다.');return}
    if(typeof window.confirm==='function'&&!window.confirm(`저장된 문제 신고 ${reports.length}건을 모두 삭제하시겠습니까?`))return;
    try{localStorage.removeItem(REPORTS_KEY)}catch(e){}
    document.getElementById('md-report-list-btn')?.remove();
    document.getElementById('md-report-list-modal')?.remove();
    toast(`문제 신고 ${reports.length}건을 삭제했습니다.`);
  }
  function openReportListModal(){
    document.getElementById('md-report-list-modal')?.remove();
    const reports=readReports();
    const overlay=document.createElement('div');overlay.id='md-report-list-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px';
    const rows=reports.length?reports.slice().reverse().map((r,ri)=>{
      const detail=String(r.detail||'').trim();
      return `<div style="padding:10px;border:1px solid #E2E8F0;border-radius:9px;background:#F8FAFC"><div style="font-size:12px;font-weight:900">${escapeText(r.reason||'신고')} · #${reports.length-ri}</div><div style="font-size:10px;color:#64748B;margin-top:3px">${escapeText((r.tags||[]).join(' · '))} ${escapeText(r.counter||'')}</div><div style="font-size:12px;line-height:1.55;margin-top:6px">${escapeText(r.question||'문제 문구 없음')}</div>${detail?`<div style="font-size:12px;line-height:1.55;margin-top:7px;padding:8px;border-radius:7px;background:#FFF;border:1px solid #E2E8F0"><b>신고 내용</b><br>${escapeText(detail)}</div>`:''}</div>`;
    }).join(''):'<div style="padding:18px;text-align:center;color:#64748B">저장된 문제 신고가 없습니다.</div>';
    overlay.innerHTML=`<div class="card" style="width:min(640px,100%);max-height:85vh;overflow:auto;margin:0;background:#fff"><div style="font-size:17px;font-weight:900">저장된 문제 신고 · ${reports.length}건</div><div style="font-size:11px;color:#64748B;margin:5px 0 12px">신고는 이 브라우저의 localStorage에만 저장됩니다. 2026-09-17 검수 완료 이전 신고는 자동 정리되며, 이후 신고만 여기에 남습니다.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn btn-accent" style="flex:1;min-width:120px" id="md-report-copy" ${reports.length?'':'disabled'}>전체 복사</button><button class="btn btn-outline" style="flex:1;min-width:120px" id="md-report-clear" ${reports.length?'':'disabled'}>전체 삭제</button><button class="btn btn-outline" style="flex:1;min-width:120px" id="md-report-list-close">닫기</button></div><div style="display:flex;flex-direction:column;gap:8px">${rows}</div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#md-report-copy').onclick=copyReports;
    overlay.querySelector('#md-report-clear').onclick=clearReports;
    overlay.querySelector('#md-report-list-close').onclick=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  }
  window.openMaritimeProblemReports=openReportListModal;
  window.copyMaritimeProblemReports=copyReports;
  window.clearMaritimeProblemReports=clearReports;

  function saveReport(reason,detail=''){
    const note=String(detail||'').trim();
    if(reason==='직접 입력'&&!note){toast('신고 내용을 입력해 주세요.');return false}
    const snap=collectQuestionSnapshot();
    const reports=readReports();
    reports.push({createdAt:new Date().toISOString(),reason,detail:note,...snap});
    try{localStorage.setItem(REPORTS_KEY,JSON.stringify(reports.slice(-500)))}catch(e){}
    toast(`문제 신고 저장됨 · ${reason}`);
    document.getElementById('md-report-modal')?.remove();
    return true;
  }
  function openReportModal(){
    document.getElementById('md-report-modal')?.remove();
    const count=readReports().length;
    const overlay=document.createElement('div');overlay.id='md-report-modal';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div class="card" style="width:min(420px,100%);margin:0;background:#fff"><div style="font-weight:900;font-size:17px;margin-bottom:12px">문제 신고</div><div style="font-size:12px;color:var(--textDim);margin-bottom:12px">현재 문제를 이 브라우저에 저장합니다. 유형을 바로 선택하거나 직접 내용을 입력할 수 있습니다.</div><div id="md-report-actions" style="display:flex;flex-direction:column;gap:8px"></div><div id="md-report-custom" style="display:none;margin-top:10px"><textarea id="md-report-detail" maxlength="500" rows="4" placeholder="어떤 점이 이상한지 직접 입력해 주세요. 예: 보기 3번 문장이 잘린 것 같음" style="width:100%;box-sizing:border-box;resize:vertical;padding:10px;border:1px solid #CBD5E1;border-radius:9px;font:inherit;line-height:1.5"></textarea><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:5px"><span id="md-report-detail-count" style="font-size:10px;color:#64748B">0/500</span><button class="btn btn-accent" id="md-report-custom-save" style="min-width:110px">내용 저장</button></div></div><button class="btn btn-outline" style="width:100%;margin-top:10px" id="md-report-list">저장된 신고 ${count}건 보기</button><button class="btn btn-outline" style="width:100%;margin-top:8px" id="md-report-cancel">취소</button></div>`;
    document.body.appendChild(overlay);
    const actions=overlay.querySelector('#md-report-actions');
    ['정답 이상','해설 이상','오타/깨짐'].forEach(reason=>{const b=document.createElement('button');b.className='btn btn-outline';b.style.width='100%';b.textContent=reason;b.onclick=()=>saveReport(reason);actions.appendChild(b)});
    const customBtn=document.createElement('button');customBtn.className='btn btn-outline';customBtn.style.width='100%';customBtn.textContent='직접 입력(주관식)';actions.appendChild(customBtn);
    const custom=overlay.querySelector('#md-report-custom'),detail=overlay.querySelector('#md-report-detail'),countEl=overlay.querySelector('#md-report-detail-count'),save=overlay.querySelector('#md-report-custom-save');
    customBtn.onclick=()=>{custom.style.display='block';customBtn.style.display='none';setTimeout(()=>detail.focus(),0)};
    detail.addEventListener('input',()=>{countEl.textContent=`${detail.value.length}/500`});
    detail.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save.click()}});
    save.onclick=()=>saveReport('직접 입력',detail.value);
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


  // today-result-subject-breakdown-v1
  function mdResultSubjectName(q){
    let item=null;
    try{if(q&&q._planKey&&typeof ppGetItemByKey==='function')item=ppGetItemByKey(q._planKey)}catch(e){}
    let subject=String((item&&item.subject)||(q&&q.subject)||(q&&q['과목'])||'기타').trim();
    const compact=subject.replace(/\s+/g,'');
    if(/^영어/.test(compact))return '영어';
    if(/^항해/.test(compact))return '항해';
    if(/^법규/.test(compact))return '법규';
    if(/^(운용|선박운용)/.test(compact))return '운용';
    if(/^상선전문/.test(compact))return '상선전문';
    return subject||'기타';
  }
  function mdPercent(n,d){
    if(!d)return '0%';
    const v=Math.round((n/d)*1000)/10;
    return (Number.isInteger(v)?String(v):v.toFixed(1))+'%';
  }
  function mdTodayResultStats(){
    if(typeof planSessionQueue==='undefined'||!Array.isArray(planSessionQueue)||!planSessionQueue.length)return null;
    const answers=(typeof planSessionAnswers!=='undefined'&&Array.isArray(planSessionAnswers))?planSessionAnswers:[];
    let progress=null,today=null,canReadCleared=false;
    try{
      if(typeof ppLoadProgress==='function'&&typeof ppDateKey==='function'&&typeof ppProgressFor==='function'&&typeof ppTodayCleared==='function'){
        progress=ppLoadProgress();today=ppDateKey(new Date());canReadCleared=true;
      }
    }catch(e){}
    const unique=new Map();
    planSessionQueue.forEach((q,i)=>{
      if(!q)return;
      const key=q._planKey?String(q._planKey):'idx:'+i;
      if(unique.has(key))return;
      const answer=answers[i];
      const firstCorrect=Number.isInteger(answer)&&answer===q['정답'];
      let cleared=firstCorrect;
      if(canReadCleared&&q._planKey){
        try{cleared=!!ppTodayCleared(ppProgressFor(progress,q._planKey),today)}catch(e){}
      }
      unique.set(key,{key,subject:mdResultSubjectName(q),firstCorrect,cleared});
    });
    if(!unique.size)return null;
    const bySubject=new Map();
    for(const row of unique.values()){
      const subject=row.subject||'기타';
      if(!bySubject.has(subject))bySubject.set(subject,{subject,total:0,firstCorrect:0,cleared:0});
      const s=bySubject.get(subject);s.total++;if(row.firstCorrect)s.firstCorrect++;if(row.cleared)s.cleared++;
    }
    const preferred=['영어','항해','법규','운용','상선전문','기타'];
    const order=new Map(preferred.map((s,i)=>[s,i]));
    const subjects=[...bySubject.values()].sort((a,b)=>{
      const ao=order.has(a.subject)?order.get(a.subject):preferred.length;
      const bo=order.has(b.subject)?order.get(b.subject):preferred.length;
      return ao-bo||a.subject.localeCompare(b.subject,'ko');
    });
    const total=unique.size;
    const firstCorrect=[...unique.values()].filter(x=>x.firstCorrect).length;
    const cleared=[...unique.values()].filter(x=>x.cleared).length;
    return {subjects,total,firstCorrect,cleared,unresolved:total-cleared};
  }
  function enhanceTodayResult(){
    const root=appRoot();if(!root||document.getElementById('md-today-subject-result'))return;
    const title=[...root.querySelectorAll('h1')].find(el=>(el.textContent||'').trim()==='오늘의 숙제 결과');
    if(!title)return;
    const stats=mdTodayResultStats();if(!stats||!stats.subjects.length)return;
    const firstCard=root.querySelector('.card');if(!firstCard)return;
    const rows=stats.subjects.map(s=>{
      const firstRate=mdPercent(s.firstCorrect,s.total),clearedRate=mdPercent(s.cleared,s.total),unresolved=s.total-s.cleared;
      return '<div style="display:grid;grid-template-columns:minmax(90px,1.15fr) minmax(150px,1.8fr) minmax(135px,1.6fr) minmax(80px,.8fr);gap:12px;align-items:center;padding:11px 14px;border-top:1px solid #E2E8F0">'
        +'<div style="font-size:13px;font-weight:900;color:#0F172A">'+escapeText(s.subject)+'</div>'
        +'<div><div style="display:flex;justify-content:space-between;gap:8px;font-size:11px"><span>'+s.firstCorrect+' / '+s.total+'</span><b>'+firstRate+'</b></div><div style="height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden;margin-top:5px"><div style="height:100%;width:'+firstRate+';background:#7C3AED;border-radius:999px"></div></div></div>'
        +'<div style="font-size:11px"><b style="font-size:12px;color:#334155">'+s.cleared+' / '+s.total+'</b><span style="color:#64748B"> · '+clearedRate+'</span></div>'
        +'<div style="font-size:12px;font-weight:900;color:'+(unresolved?'#B45309':'#047857')+'">'+unresolved+'문제</div>'
        +'</div>';
    }).join('');
    let weakestHtml='';
    if(stats.subjects.length>=2){
      const ranked=stats.subjects.slice().sort((a,b)=>(a.firstCorrect/Math.max(1,a.total))-(b.firstCorrect/Math.max(1,b.total))||(b.total-b.cleared)-(a.total-a.cleared));
      const w=ranked[0];
      weakestHtml='<div style="padding:10px 14px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:11px;color:#475569">첫 시도 정답률 최저: <b style="color:#B91C1C">'+escapeText(w.subject)+' '+mdPercent(w.firstCorrect,w.total)+'</b> · 현재 미해결 '+(w.total-w.cleared)+'문제</div>';
    }
    const section=document.createElement('div');
    section.id='md-today-subject-result';section.className='card';section.style.cssText='padding:0;overflow:hidden';
    section.innerHTML=
      '<div style="padding:15px 14px 12px">'
      +'<div style="font-size:16px;font-weight:900;color:#0F172A">과목별 결과</div>'
      +'<div style="font-size:10px;color:#64748B;margin-top:4px">첫 시도 정답률과 현재 숙제 통과 상태를 분리해 표시합니다. 재확인 문제는 중복 집계하지 않습니다.</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:11px">'
      +'<span style="padding:6px 9px;border-radius:999px;background:#F1F5F9;color:#334155">고유 문항 <b>'+stats.total+'</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#F5F3FF;color:#6D28D9">첫 시도 정답 <b>'+stats.firstCorrect+' ('+mdPercent(stats.firstCorrect,stats.total)+')</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#ECFDF5;color:#047857">현재 통과 <b>'+stats.cleared+'</b></span>'
      +'<span style="padding:6px 9px;border-radius:999px;background:#FFF7ED;color:#B45309">미해결 <b>'+stats.unresolved+'</b></span>'
      +'</div></div>'
      +'<div style="overflow-x:auto"><div style="min-width:620px">'
      +'<div style="display:grid;grid-template-columns:minmax(90px,1.15fr) minmax(150px,1.8fr) minmax(135px,1.6fr) minmax(80px,.8fr);gap:12px;padding:8px 14px;background:#F8FAFC;font-size:10px;font-weight:900;color:#64748B"><div>과목</div><div>첫 시도 정답</div><div>현재 통과</div><div>미해결</div></div>'
      +rows+weakestHtml+'</div></div>';
    firstCard.insertAdjacentElement('afterend',section);
  }

  let queued=false;
  function enhance(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;cleanLegacyConfidenceUi();addResumeBanner();applyExplanationMode();addReportButton();enhanceTodayResult();syncWakeLock()});
  }
  new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',enhance);
  document.addEventListener('pointerdown',requestWakeLock,{passive:true});
  document.addEventListener('keydown',requestWakeLock);
  readReports();
  enhance();
})();