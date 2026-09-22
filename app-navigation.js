// Shared settings and focused study navigation. Learning/storage rules stay in their own modules.
(function(){
  'use strict';
  let selectedPlanTab='today';
  const esc=value=>escapeHTML(String(value==null?'':value));
  const button=(label,action,extra='')=>`<button type="button" class="btn btn-outline" onclick="${action}" ${extra}>${label}</button>`;

  const style=document.createElement('style');
  style.textContent=`
    #md-app-toolbar{padding-top:12px;padding-bottom:0;display:flex;gap:10px;align-items:center;justify-content:space-between}
    #md-sync-summary{min-width:0;flex:1;text-align:left;border:0;background:transparent;padding:6px 0;font:inherit;cursor:pointer}
    #md-sync-summary strong{display:block;font-size:12px;overflow-wrap:anywhere}
    #md-sync-summary small{display:block;font-size:10px;color:#64748B;margin-top:3px}
    #md-settings-button{width:auto;flex:none;min-height:42px;padding:8px 13px}
    body.md-question-screen #md-app-toolbar{padding-top:6px;padding-bottom:0}
    body.md-question-screen #md-sync-summary{padding:0;line-height:1.25}
    body.md-question-screen #md-sync-summary small{display:none}
    body.md-question-screen #md-settings-button{min-height:36px;padding:5px 10px}
    body.md-question-screen #app{padding-top:4px}
    body.md-question-screen #app>div:first-child{padding-top:0!important;margin-bottom:8px!important}
    body.md-question-screen #app>div:first-child>.btn{min-height:40px;padding:7px 10px;font-size:13px}
    .md-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .md-menu-grid .btn{width:100%;min-width:0;white-space:normal}
    .md-settings-section{padding:13px 0;border-bottom:1px solid #E2E8F0}
    .md-settings-section summary{font-weight:800;cursor:pointer;min-height:36px;padding:7px 0}
    .md-settings-section p,.md-menu-note{font-size:12px;color:#64748B;line-height:1.6}
    .md-settings-section .data-tools-actions{flex-wrap:wrap}
    .md-settings-section select{max-width:100%;padding:8px;border:1px solid #CBD5E1;border-radius:8px}
    #md-plan-navigation{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:14px 0}
    #md-plan-navigation button{font:inherit;font-size:12px;font-weight:800;padding:11px 4px;min-height:44px;border:1px solid #DDD6FE;border-radius:10px;color:#6D28D9;background:#fff;cursor:pointer}
    #md-plan-navigation button[aria-pressed="true"]{background:#6D28D9;color:#fff;border-color:#6D28D9}
    [data-md-plan-panel][hidden]{display:none!important}
    #md-plan-settings{padding:12px 16px}
    #md-plan-settings>summary{font-size:13px;font-weight:800;cursor:pointer;padding:4px 0;line-height:1.65}
    #md-plan-config{padding:14px 0 0!important;margin:0!important;border:0!important;box-shadow:none!important}
    #md-plan-settings input[type="date"]{max-width:100%;min-width:0}
    #md-plan-rules{margin-top:14px}
    #md-plan-rules summary{font-size:13px;font-weight:800;cursor:pointer;margin-bottom:8px}
    .md-settings-section .md-danger{color:#B91C1C;border-color:#FCA5A5}
  `;
  document.head.appendChild(style);

  function refreshSummary(){
    const label=document.getElementById('md-sync-summary-label');
    const last=document.getElementById('md-sync-summary-last');
    if(!label||!last)return;
    const state=driveSyncLoadState(),status=driveSyncPanelStatus();
    const text=state.enabled?'Drive · '+status.label:'이 기기에 저장 · Drive 연결 안 됨';
    if(label.textContent!==text)label.textContent=text;
    label.style.color=status.tone;
    const time='마지막 동기화: '+driveSyncFormat(state.lastSyncedAt);
    if(last.textContent!==time)last.textContent=time;
  }
  const originalRefresh=driveSyncRefreshPanel;
  driveSyncRefreshPanel=function(){originalRefresh();refreshSummary();};

  function mountToolbar(){
    if(document.getElementById('md-app-toolbar'))return;
    const root=document.getElementById('app');if(!root)return;
    const bar=document.createElement('div');bar.id='md-app-toolbar';bar.className='container';
    bar.innerHTML=`<button type="button" id="md-sync-summary" onclick="openMaritimeSettings()" aria-label="동기화 상태 및 설정"><strong id="md-sync-summary-label"></strong><small id="md-sync-summary-last"></small></button><button type="button" class="btn btn-outline" id="md-settings-button" onclick="openMaritimeSettings()">${icon('settings',16)} 설정</button>`;
    root.before(bar);refreshSummary();
  }

  window.mdToggleReading=function(){
    ttsEnabled=!ttsEnabled;saveTTS();if(!ttsEnabled)stopTTS();
    const b=document.getElementById('md-reading-toggle');
    if(b){b.textContent='면접 문제 읽기: '+(ttsEnabled?'켜짐':'꺼짐');b.setAttribute('aria-pressed',String(ttsEnabled));}
  };
  window.openMaritimeSettings=function(){
    const mode=document.documentElement.dataset.viewMode||'auto';
    const point=readAutomaticRestorePoint();
    const inPlan=typeof currentMode!=='undefined'&&currentMode==='pass-plan';
    const recovery=point?`<p>복구 지점: ${esc(backupDateLabel(point.exportedAt))}. 날짜별 백업이 아닌 최근 한 시점입니다.</p>${button('이전 상태로 되돌리기','restoreAutomaticRestorePoint()')}`:'<p>현재 저장된 복구 지점이 없습니다.</p>';
    openModal({
      title:'설정',sub:'Maritime Drill v'+APP_VERSION,
      body:`<section class="md-settings-section" aria-label="동기화">${driveSyncPanelHTML()}</section>
        <details class="md-settings-section" id="md-backup-settings"><summary>백업·복구</summary><p>현재 학습 기록을 파일로 따로 보관합니다. 잘못 삭제하거나 덮어쓴 기록을 복구할 때 사용하세요.</p><div class="md-menu-grid">${button('전체 백업 저장','exportAllLearningData()')}${button('백업 불러오기','importAllLearningData()')}</div><details class="md-settings-section"><summary>자동 복구 지점</summary>${recovery}</details></details>
        <details class="md-settings-section" id="md-display-settings"><summary>화면·읽기</summary><p><label>화면 폭 <select id="md-view-select" onchange="setViewMode(this.value)">${[['auto','자동'],['compact','컴팩트'],['wide','넓게']].map(([v,label])=>`<option value="${v}"${v===mode?' selected':''}>${label}</option>`).join('')}</select></label></p><div class="md-menu-grid">${button('전체화면 전환','toggleFullscreen()')}${button('면접 문제 읽기: '+(ttsEnabled?'켜짐':'꺼짐'),'mdToggleReading()',`id="md-reading-toggle" aria-pressed="${ttsEnabled}"`)}</div></details>
        ${inPlan?`<details class="md-settings-section" id="md-advanced-settings"><summary>고급 도구</summary><p>숙제 구성을 다시 만들거나 합격 플랜 진도를 처음부터 시작할 때만 사용하세요.</p><div class="md-menu-grid">${button('오늘 숙제 다시 계산','closeModal();recalculateNavigatorPassPlanToday()')}${button('합격 플랜 진도 초기화','closeModal();resetNavigatorPassPlanProgress()','data-danger="reset"')}</div></details>`:''}
        <details class="md-settings-section" id="md-app-info"><summary>도움말·앱 정보</summary><p>기록은 이 기기에 자동 저장됩니다. Drive가 연결돼 있으면 다른 기기의 변경 내용도 동기화합니다. 연결이 만료되면 갱신 버튼을 눌러주세요.</p><div class="md-menu-grid">${button('제작자의 말','showCredit()')}${button('이용약관·개인정보','showTerms()')}</div></details>`,
      footer:button('닫기','closeModal()')
    });
    document.querySelector('[data-danger="reset"]')?.classList.add('md-danger');
    driveSyncRefreshPanel();
  };

  window.mdOpenPastCollection=function(kind,subjectId){
    closeModal();pastSubjectId=subjectId;
    currentSubject=SUBJECTS.find(s=>s.id===subjectId)||currentSubject;
    if(kind==='wrong')renderPastWrongsList();else renderPastMarksList();
  };
  window.openMaritimeReview=function(subjectId){
    const wrongs=Object.keys(loadPastWrongs()).length,marks=Object.keys(loadPastMarks()).length;
    const plan=/^navi[23]$/.test(subjectId);
    openModal({title:'복습',sub:'필기 기록에서 다시 풀 문제를 선택하세요.',
      body:`<div class="md-menu-grid">${button('필기 오답노트 · '+wrongs,`mdOpenPastCollection('wrong','${subjectId}')`)}${button('북마크 · '+marks,`mdOpenPastCollection('mark','${subjectId}')`)}</div>${plan?`<p class="md-menu-note">합격 플랜의 오늘 오답과 자주 틀리는 문제는 전용 복습에서 확인하세요.</p>${button('합격 플랜 복습',`closeModal();mdOpenPlanReview('${subjectId}')`)}`:''}`,
      footer:button('닫기','closeModal()')});
  };
  window.mdOpenPlanReview=async function(subjectId){selectedPlanTab='review';await renderNavigatorPassPlan(subjectId);};
  window.mdSelectPlanTab=function(tab){
    if(!['today','review','mock','records'].includes(tab))return;
    selectedPlanTab=tab;
    document.querySelectorAll('[data-md-plan-panel]').forEach(el=>{el.hidden=el.dataset.mdPlanPanel!==tab;});
    document.querySelectorAll('[data-md-plan-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mdPlanTab===tab)));
  };

  // Move the existing controls, retaining their handlers and the underlying records.
  window.mdOrganizePassPlan=function(subjectId){
    const root=document.getElementById('app');
    const config=document.getElementById('md-plan-config'),today=document.getElementById('md-plan-today'),review=document.getElementById('md-plan-review'),records=document.getElementById('md-plan-records'),rules=document.getElementById('md-plan-rules-source');
    if(!config||!today||!review||!records||document.getElementById('md-plan-navigation'))return;
    const settings=document.createElement('details');settings.id='md-plan-settings';settings.className='card';
    const enabled=[...config.querySelectorAll('input[id^="pp-enable-"]')].filter(el=>el.checked);
    const dates=enabled.map(el=>{
      const grade=el.id.endsWith('navi3')?'3급':'2급';
      const date=config.querySelector('#'+el.id.replace('enable','date'))?.value;
      return grade+' '+(date||'시험일 미설정');
    });
    settings.innerHTML=`<summary>시험 설정 변경 <span style="font-weight:400;color:#64748B">· ${esc(dates.join(' / ')||'응시 급수 선택')}</span></summary>`;
    settings.open=!enabled.length||enabled.some(el=>!config.querySelector('#'+el.id.replace('enable','date'))?.value);
    config.before(settings);settings.append(config);
    const nav=document.createElement('nav');nav.id='md-plan-navigation';nav.setAttribute('aria-label','합격 플랜 메뉴');
    nav.innerHTML=[['today','오늘 공부'],['review','복습'],['mock','모의시험'],['records','학습 기록']].map(([key,label])=>`<button type="button" data-md-plan-tab="${key}" aria-controls="md-plan-panel-${key}" onclick="mdSelectPlanTab('${key}')">${label}</button>`).join('');
    settings.after(nav);
    const panels={};let previous=nav;
    for(const key of ['today','review','mock','records']){
      const el=document.createElement('div');el.id='md-plan-panel-'+key;el.dataset.mdPlanPanel=key;
      previous.after(el);previous=el;panels[key]=el;
    }
    panels.today.append(today);panels.review.append(review);panels.records.append(records);
    // Each grade keeps its distinct mock formats under a single menu.
    for(const gradeCard of [...records.children]){
      const actions=[...gradeCard.querySelectorAll('button[onclick^="startNavigator"]')];
      if(!actions.length)continue;
      const card=document.createElement('section');card.className='card';
      const grade=actions[0].getAttribute('onclick').includes('navi3')?'3급 항해사':'2급 항해사';
      card.innerHTML=`<h2 style="font-size:16px;margin:0 0 12px">${grade} 모의시험</h2>`;
      for(const action of actions){
        const note=action.nextElementSibling;
        card.append(action);
        if(note&&note.tagName==='DIV'&&note.textContent.includes('가중 랜덤'))card.append(note);
      }
      panels.mock.append(card);
    }
    if(!panels.mock.children.length)panels.mock.innerHTML='<div class="card">시험 설정에서 응시 급수와 시험일을 지정하면 모의시험을 시작할 수 있습니다.</div>';
    const collections=document.createElement('section');collections.className='card';
    collections.innerHTML=`<div class="md-menu-grid">${button('필기 오답노트',`mdOpenPastCollection('wrong','${subjectId}')`)}${button('북마크',`mdOpenPastCollection('mark','${subjectId}')`)}</div><p class="md-menu-note">일반 기출 풀이에서 남긴 오답과 북마크입니다. 합격 플랜 복습 목록과 별도로 유지됩니다.</p>`;
    panels.review.append(collections);
    if(rules){
      const details=document.createElement('details');details.id='md-plan-rules';details.className='card';
      details.innerHTML='<summary>학습·숙달 규칙</summary>';rules.classList.remove('card');rules.style.cssText='margin:0;padding:0';
      details.append(rules);
      const note=document.createElement('p');note.className='md-menu-note';
      note.textContent='그림·밑줄 원문 확인이 필요한 문항은 자동 출제에서 제외합니다.';
      details.append(note);panels.records.append(details);
    }
    try{
      const cp=JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2')||'null');
      const start=today.querySelector('button[onclick="startNavigatorPassPlanToday()"]');
      if(cp?.queueKeys?.length&&start&&!start.disabled)start.textContent='오늘 공부 이어서 풀기';
    }catch(e){}
    document.getElementById('md-resume-banner')?.remove();
    mdSelectPlanTab(selectedPlanTab);
  };
  function syncQuestionScreenLayout(){
    const compact=typeof currentMode!=='undefined'&&['pass-plan-session','past'].includes(currentMode);
    document.body.classList.toggle('md-question-screen',compact);
  }
  const appRoot=document.getElementById('app');
  if(appRoot)new MutationObserver(syncQuestionScreenLayout).observe(appRoot,{childList:true});
  syncQuestionScreenLayout();
  mountToolbar();
})();
