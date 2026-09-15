from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

# Session kind: normal daily homework vs focused drills.
anchor="  let planSessionCommitted=new Set();"
if "let planSessionKind='today';" not in text:
    if anchor not in text: raise SystemExit('plan session anchor not found')
    text=text.replace(anchor,anchor+"\n  let planSessionKind='today';",1)

# Only the normal daily-homework session should create a resumable checkpoint.
old="""  function ppSavePassSessionCheckpoint(nextIndex){
    try{"""
new="""  function ppSavePassSessionCheckpoint(nextIndex){
    try{
      if(planSessionKind!=='today'){localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return}"""
if new not in text:
    if old not in text: raise SystemExit('checkpoint save function not found')
    text=text.replace(old,new,1)

# Extend progress with dedicated weak-drill bookkeeping.
progress_fn="""  function ppProgressFor(progress,key){
    if(!progress[key])progress[key]={firstPassDate:null,mastered:false,status:'new',dueDate:null,lastDate:null,lastSureDate:null,lastOutcome:null,attempts:0,correct:0,wrong:0,unsure:0,masteryReviews:0,recoveryStartDate:null,sameDayFirstCorrectDate:null,sameDayConfirmedDate:null,lastWrongDate:null,todayWrongReviewDate:null};
    const r=progress[key];
    // Migrate old records without discarding prior study history.
    if(!Object.prototype.hasOwnProperty.call(r,'sameDayFirstCorrectDate'))r.sameDayFirstCorrectDate=(!r.mastered&&r.lastSureDate)?r.lastSureDate:null;
    if(!Object.prototype.hasOwnProperty.call(r,'sameDayConfirmedDate'))r.sameDayConfirmedDate=r.mastered?(r.lastSureDate||r.firstPassDate||null):null;
    if(!Object.prototype.hasOwnProperty.call(r,'lastWrongDate'))r.lastWrongDate=null;
    if(!Object.prototype.hasOwnProperty.call(r,'todayWrongReviewDate'))r.todayWrongReviewDate=null;
    return r;
  }"""
text,n=re.subn(r"  function ppProgressFor\(progress,key\)\{.*?\n  \}",progress_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppProgressFor not found')

# Focused drill selectors and starter. Insert after hydration helper.
if 'window.startNavigatorWeakDrill=async function(kind)' not in text:
    marker="""  async function ppHydrateKeys(keys){
    const grades=[...new Set(keys.map(k=>(ppGetItemByKey(k)||{}).gradeId).filter(Boolean))];
    renderPastLoading('오늘 숙제 문제를 준비하는 중입니다');
    for(const g of grades){if(!pastDataSubjectsLoaded.has(g))await ensurePastDataForSubject(g)}
    const out=[];
    keys.forEach(key=>{const item=ppGetItemByKey(key);if(!item)return;const q=ppFindQuestion(item.gradeId,item);if(q)out.push(q)});
    await ensurePastExplainForYears(out.map(q=>q._year));
    return out;
  }
"""
    if marker not in text: raise SystemExit('ppHydrateKeys marker not found')
    helpers="""
  function ppActivePlanItems(plan){
    return PLAN_GRADES.flatMap(g=>(plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate)?(planPools[g]||[]):[]);
  }
  function ppTodayWrongItems(plan,progress,today){
    return ppActivePlanItems(plan).filter(item=>{
      const r=ppProgressFor(progress,item.key);
      return r.lastWrongDate===today&&r.todayWrongReviewDate!==today;
    }).sort((a,b)=>{
      const ra=ppProgressFor(progress,a.key),rb=ppProgressFor(progress,b.key);
      return (Number(rb.wrong)||0)-(Number(ra.wrong)||0)||b.count-a.count||b.latest-a.latest;
    });
  }
  function ppFrequentWrongItems(plan,progress){
    return ppActivePlanItems(plan).filter(item=>(Number(ppProgressFor(progress,item.key).wrong)||0)>=2).sort((a,b)=>{
      const ra=ppProgressFor(progress,a.key),rb=ppProgressFor(progress,b.key);
      return (Number(rb.wrong)||0)-(Number(ra.wrong)||0)||String(rb.lastWrongDate||'').localeCompare(String(ra.lastWrongDate||''))||b.count-a.count||b.latest-a.latest;
    });
  }
  function ppSessionLabel(){
    if(planSessionKind==='today-wrong')return '오늘 오답';
    if(planSessionKind==='frequent-wrong')return '자주 틀리는 문제';
    return '오늘의 숙제';
  }
  window.startNavigatorWeakDrill=async function(kind){
    if(!['today-wrong','frequent-wrong'].includes(kind))return;
    const plan=ppLoadPlan();
    renderPastLoading(kind==='today-wrong'?'오늘 틀린 문제를 준비하는 중입니다':'자주 틀리는 문제를 준비하는 중입니다');
    try{
      await ppBuildPools(plan);
      const progress=ppLoadProgress(),today=ppDateKey(new Date());
      const items=kind==='today-wrong'?ppTodayWrongItems(plan,progress,today):ppFrequentWrongItems(plan,progress);
      if(!items.length){showToast(kind==='today-wrong'?'오늘 다시 풀 오답이 없습니다.':'2회 이상 틀린 문제가 없습니다.');renderNavigatorPassPlan(planEntrySubject);return}
      const keys=items.map(item=>item.key),hydrated=await ppHydrateKeys(keys);
      if(hydrated.length!==keys.length)throw new Error('일부 기출문제 원문을 찾지 못했습니다.');
      ppClearPassSessionCheckpoint();planSessionKind=kind;
      planSessionQueue=kind==='today-wrong'?shuffle(hydrated):hydrated;
      planSessionIdx=0;planSessionAnswers=new Array(planSessionQueue.length).fill(null);planSessionConfidence=new Array(planSessionQueue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();currentMode='pass-plan-session';renderNavigatorPassPlanCard();
    }catch(e){
      app.innerHTML=`<div class=\"card\" style=\"margin-top:30px\"><b>취약문제 풀이를 시작하지 못했습니다.</b><div style=\"font-size:12px;margin-top:7px\">${escapeHtml(e.message||String(e))}</div><button class=\"btn btn-outline\" style=\"margin-top:12px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">합격 플랜으로 돌아가기</button></div>`;
    }
  };
"""
    text=text.replace(marker,marker+helpers,1)

# Track the date of every wrong answer and whether today's wrong-only review has been cleared.
commit_fn="""  function ppCommitOutcome(q,answer,confidence){
    const progress=ppLoadProgress(),r=ppProgressFor(progress,q._planKey),today=ppDateKey(new Date()),correct=answer===q['정답'];
    const priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;
    r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';
    if(correct)r.correct=(r.correct||0)+1;else r.wrong=(r.wrong||0)+1;
    if(correct&&confidence==='unsure')r.unsure=(r.unsure||0)+1;
    if(correct&&confidence==='sure'){
      r.lastSureDate=today;
      const retainedAcrossDay=!!(priorConfirmed&&priorConfirmed<today);
      if(retainedAcrossDay){
        r.status='mastered';r.mastered=true;r.masteryReviews=(r.masteryReviews||0)+1;
        r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;
        const exam=ppExamDay(ppLoadPlan(),q._planGrade);let due=ppAddDays(today,3);if(exam){const dayBefore=ppAddDays(exam,-1);due=ppMinDate(due,dayBefore)}r.dueDate=due;
        removePastWrong(pqid(q));
      }else if(priorFirstCorrect===today){
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,1);
        removePastWrong(pqid(q));
      }else{
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
      }
      if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today;
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;r.todayWrongReviewDate=null;
      if(!correct)addPastWrong(q,answer);
    }
    progress[q._planKey]=r;ppSaveProgress(progress);
  }"""
text,n=re.subn(r"  function ppCommitOutcome\(q,answer,confidence\)\{.*?\n  \}",commit_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppCommitOutcome not found')

# Predictive mock wrong answers should also appear in focused wrong drills.
old="r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.dueDate=today;"
new="r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;r.todayWrongReviewDate=null;r.dueDate=today;"
if old in text: text=text.replace(old,new,1)
elif new not in text: raise SystemExit('predictive wrong-state marker not found')

# Normal daily homework always restores the normal session kind.
old="""  window.startNavigatorPassPlanToday=async function(){
    const plan=ppLoadPlan();"""
new="""  window.startNavigatorPassPlanToday=async function(){
    planSessionKind='today';
    const plan=ppLoadPlan();"""
if new not in text:
    if old not in text: raise SystemExit('today start marker not found')
    text=text.replace(old,new,1)

# Add focused-drill counts to the plan screen.
old="""    const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
    const unresolved=(assignment.keys||[]).filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));"""
new="""    const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
    const unresolved=(assignment.keys||[]).filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
    const todayWrongItems=ppTodayWrongItems(plan,progress,today),frequentWrongItems=ppFrequentWrongItems(plan,progress);"""
if new not in text:
    if old not in text: raise SystemExit('plan count marker not found')
    text=text.replace(old,new,1)

mastery_marker='''      <section class="card" style="padding:15px;margin-top:14px;background:#F8FAFC"><div style="font-size:13px;font-weight:900;margin-bottom:6px">숙달 규칙</div>'''
if '취약문제 집중' not in text:
    if mastery_marker not in text: raise SystemExit('mastery card marker not found')
    focus_card='''      <section class="card" style="padding:15px;margin-top:14px;border-left:4px solid #DC2626">
        <div style="font-size:15px;font-weight:900">취약문제 집중</div>
        <div style="font-size:11px;color:var(--textDim);margin-top:4px;line-height:1.55">오늘 한 번이라도 틀린 문제와 누적 2회 이상 틀린 문제를 별도로 다시 풀 수 있습니다.</div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px">
          <button class="btn btn-outline" style="border-color:#DC2626;color:#B91C1C" ${todayWrongItems.length?'':'disabled'} onclick="startNavigatorWeakDrill('today-wrong')">오늘 오답 다시 풀기 · ${todayWrongItems.length}</button>
          <button class="btn btn-outline" style="border-color:#D97706;color:#92400E" ${frequentWrongItems.length?'':'disabled'} onclick="startNavigatorWeakDrill('frequent-wrong')">자주 틀리는 문제 · ${frequentWrongItems.length}</button>
        </div>
        <div style="font-size:10px;color:var(--textMuted);margin-top:8px">오늘 오답은 전용 복습에서 맞히면 목록에서 빠집니다. 자주 틀리는 문제는 누적 오답 횟수가 많은 순으로 출제됩니다.</div>
      </section>
'''
    text=text.replace(mastery_marker,focus_card+mastery_marker,1)

# Give focused sessions a clear label and useful wrong-count tag.
old="""    const isCorrect=showFeedback&&selected===correct;
    const canNext=showFeedback;
    app.innerHTML=`"""
new="""    const isCorrect=showFeedback&&selected===correct;
    const canNext=showFeedback;
    const sessionLabel=ppSessionLabel(),rec=ppProgressFor(ppLoadProgress(),q._planKey),wrongTag=planSessionKind==='frequent-wrong'?`<span class=\"tag\" style=\"margin:0;background:#FEE2E2;color:#B91C1C\">누적 오답 ${Number(rec.wrong)||0}회</span>`:'';
    app.innerHTML=`"""
if new not in text:
    if old not in text: raise SystemExit('card variable marker not found')
    text=text.replace(old,new,1)

text=text.replace(
'''<button class="btn btn-outline" style="width:auto" onclick="showConfirm('오늘 숙제를 중단하시겠습니까? 진행 기록은 저장됩니다.',()=>renderNavigatorPassPlan('${planEntrySubject}'))">${icon('arrowLeft',14)} 그만</button><div style="font-size:15px;color:var(--text);font-weight:900">문제 ${planSessionIdx+1}/${planSessionQueue.length}</div>''',
'''<button class="btn btn-outline" style="width:auto" onclick="showConfirm('${sessionLabel} 풀이를 중단하시겠습니까? 진행 기록은 저장됩니다.',()=>renderNavigatorPassPlan('${planEntrySubject}'))">${icon('arrowLeft',14)} 그만</button><div style="text-align:right"><div style="font-size:10px;color:#7C3AED;font-weight:900">${sessionLabel}</div><div style="font-size:15px;color:var(--text);font-weight:900">문제 ${planSessionIdx+1}/${planSessionQueue.length}</div></div>''',1)

oldtag='''<span class="tag" style="margin:0;background:#F1F5F9;color:#475569">${q._year}년 ${q['회차']}회 Q${q['번호']}</span></div>'''
newtag='''<span class="tag" style="margin:0;background:#F1F5F9;color:#475569">${q._year}년 ${q['회차']}회 Q${q['번호']}</span>${wrongTag}</div>'''
if newtag not in text:
    if oldtag not in text: raise SystemExit('question tag marker not found')
    text=text.replace(oldtag,newtag,1)

oldfoot='''      <div style="text-align:center;margin-top:8px;font-size:10px;color:var(--textMuted)">첫 정답은 학습 중 · 같은 날 한 번 더 맞히면 오늘 확인 완료 · 다음 날짜에 다시 맞히면 숙달됩니다.</div>`;'''
newfoot='''      <div style="text-align:center;margin-top:8px;font-size:10px;color:var(--textMuted)">${planSessionKind==='today-wrong'?'오늘 틀린 문제만 복습 중 · 정답이면 오늘 오답 복습 목록에서 빠집니다.':planSessionKind==='frequent-wrong'?'누적 2회 이상 오답 문제 집중 훈련 · 많이 틀린 문제부터 출제됩니다.':'첫 정답은 학습 중 · 같은 날 한 번 더 맞히면 오늘 확인 완료 · 다음 날짜에 다시 맞히면 숙달됩니다.'}</div>`;'''
if newfoot not in text:
    if oldfoot not in text: raise SystemExit('card footer marker not found')
    text=text.replace(oldfoot,newfoot,1)

# Focused result screens are separate from today's-homework completion result.
result_fn="""  window.renderNavigatorPassPlanResult=function(){
    currentMode='pass-plan-result';const today=ppDateKey(new Date()),progress=ppLoadProgress();let sure=0,unsure=0,wrong=0;
    planSessionQueue.forEach((q,i)=>{const a=planSessionAnswers[i],c=planSessionConfidence[i];if(a===q['정답']&&c==='sure')sure++;else if(a===q['정답'])unsure++;else wrong++});
    const elapsed=Math.floor((Date.now()-planSessionStartedAt)/1000);
    if(planSessionKind==='today-wrong'){
      const plan=ppLoadPlan(),remaining=ppTodayWrongItems(plan,progress,today);
      app.innerHTML=`<div style=\"padding-top:22px;margin-bottom:14px\"><div style=\"font-size:12px;letter-spacing:2px;font-weight:900;color:#DC2626\">WRONG REVIEW</div><h1 style=\"font-size:24px;margin:4px 0\">오늘 오답 복습 결과</h1></div><div class=\"card\" style=\"text-align:center;border-left:4px solid #DC2626\"><div style=\"font-size:40px;font-weight:900;color:#DC2626\">${sure} / ${planSessionQueue.length}</div><div style=\"font-size:14px;font-weight:800;margin-top:5px\">이번 복습 정답</div><div style=\"font-size:11px;color:var(--textDim);margin-top:5px\">오답 ${wrong} · ${Math.floor(elapsed/60)}분 ${elapsed%60}초</div></div>${remaining.length?`<button class=\"btn btn-accent\" style=\"width:100%;background:#DC2626;border-color:#DC2626\" onclick=\"startNavigatorWeakDrill('today-wrong')\">남은 오늘 오답 다시 풀기 · ${remaining.length}문제</button>`:`<div class=\"card\" style=\"background:#D1FAE5;text-align:center\"><div style=\"font-size:18px;font-weight:900;color:#065F46\">오늘 오답 복습 완료</div></div>`}<button class=\"btn btn-outline\" style=\"width:100%;margin-top:10px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">합격 플랜으로 돌아가기</button>`;
      return;
    }
    if(planSessionKind==='frequent-wrong'){
      app.innerHTML=`<div style=\"padding-top:22px;margin-bottom:14px\"><div style=\"font-size:12px;letter-spacing:2px;font-weight:900;color:#D97706\">WEAK DRILL</div><h1 style=\"font-size:24px;margin:4px 0\">자주 틀리는 문제 결과</h1></div><div class=\"card\" style=\"text-align:center;border-left:4px solid #D97706\"><div style=\"font-size:40px;font-weight:900;color:#D97706\">${sure} / ${planSessionQueue.length}</div><div style=\"font-size:14px;font-weight:800;margin-top:5px\">정답</div><div style=\"font-size:11px;color:var(--textDim);margin-top:5px\">오답 ${wrong} · ${Math.floor(elapsed/60)}분 ${elapsed%60}초</div></div><button class=\"btn btn-accent\" style=\"width:100%;background:#D97706;border-color:#D97706\" onclick=\"startNavigatorWeakDrill('frequent-wrong')\">자주 틀리는 문제 다시 풀기</button><button class=\"btn btn-outline\" style=\"width:100%;margin-top:10px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">합격 플랜으로 돌아가기</button>`;
      return;
    }
    const unresolved=planSessionQueue.filter(q=>!ppTodayCleared(ppProgressFor(progress,q._planKey),today));
    app.innerHTML=`<div style=\"padding-top:22px;margin-bottom:14px\"><div style=\"font-size:12px;letter-spacing:2px;font-weight:900;color:#7C3AED\">TODAY RESULT</div><h1 style=\"font-size:24px;margin:4px 0\">오늘의 숙제 결과</h1></div><div class=\"card\" style=\"text-align:center;border-left:4px solid #7C3AED\"><div style=\"font-size:40px;font-weight:900;color:#7C3AED\">${sure} / ${planSessionQueue.length}</div><div style=\"font-size:14px;font-weight:800;margin-top:5px\">정답 + 확실 통과</div><div style=\"font-size:11px;color:var(--textDim);margin-top:5px\">애매 ${unsure} · 오답 ${wrong} · ${Math.floor(elapsed/60)}분 ${elapsed%60}초</div></div>${unresolved.length?`<div class=\"card\" style=\"background:#FEF3C7;border-left:4px solid #D97706\"><div style=\"font-size:15px;font-weight:900;color:#92400E\">미해결 ${unresolved.length}문제</div><div style=\"font-size:11px;color:#78350F;margin-top:5px;line-height:1.6\">오늘 숙제 완료로 처리되지 않습니다. 같은 날 다시 맞혀 ‘확실’까지 만들 수 있지만, 숙달 판정은 다른 날 재확인이 필요합니다.</div></div><button class=\"btn btn-accent\" style=\"width:100%;background:#D97706;border-color:#D97706\" onclick=\"retryNavigatorPassPlanUnresolved()\">미해결만 다시 풀기 · ${unresolved.length}문제</button>`:`<div class=\"card\" style=\"background:#D1FAE5;text-align:center\"><div style=\"font-size:18px;font-weight:900;color:#065F46\">오늘 숙제 완료</div><div style=\"font-size:11px;color:#047857;margin-top:5px\">내일 복습 대상은 시험일까지 자동으로 다시 계산됩니다.</div></div>`}<button class=\"btn btn-outline\" style=\"width:100%;margin-top:10px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">합격 플랜으로 돌아가기</button>`;
  };"""
text,n=re.subn(r"  window\.renderNavigatorPassPlanResult=function\(\)\{.*?\n  \};",result_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('result function not found')

# The old unresolved retry is still part of the normal daily-homework flow.
old="""  window.retryNavigatorPassPlanUnresolved=async function(){
    const today="""
new="""  window.retryNavigatorPassPlanUnresolved=async function(){
    planSessionKind='today';
    const today="""
if new not in text:
    if old not in text: raise SystemExit('retry function marker not found')
    text=text.replace(old,new,1)

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched today-wrong and frequent-wrong drills')
else:
    print('weak drills already patched')
