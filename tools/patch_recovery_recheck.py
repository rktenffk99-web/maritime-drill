from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='recovery-recheck-v1'

# 1) Frequent-wrong is a CURRENT weakness list, not a lifetime hall of fame.
# Keep cumulative wrong counts for ranking/history, but retire an item once it is mastered.
frequent_fn="""  function ppFrequentWrongItems(plan,progress){
    return ppActivePlanItems(plan).filter(item=>{
      const r=ppProgressFor(progress,item.key);
      return (Number(r.wrong)||0)>=2&&!r.mastered;
    }).sort((a,b)=>{
      const ra=ppProgressFor(progress,a.key),rb=ppProgressFor(progress,b.key);
      return (Number(rb.wrong)||0)-(Number(ra.wrong)||0)||String(rb.lastWrongDate||'').localeCompare(String(ra.lastWrongDate||''))||b.count-a.count||b.latest-a.latest;
    });
  }"""
text,n=re.subn(r"  function ppFrequentWrongItems\(plan,progress\)\{.*?\n  \}",frequent_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppFrequentWrongItems not found')

# 2) Schedule a delayed same-day confirmation after the first sure-correct recall.
# The repeat is injected 30-50 questions later where possible; near the end it is appended.
if 'function ppScheduleSameDayRecheck(q)' not in text:
    anchor="""  function ppSessionLabel(){
    if(planSessionKind==='today-wrong')return '오늘 오답';
    if(planSessionKind==='frequent-wrong')return '자주 틀리는 문제';
    return '오늘의 숙제';
  }
"""
    if anchor not in text: raise SystemExit('ppSessionLabel anchor not found')
    helper="""
  function ppScheduleSameDayRecheck(q){
    if(planSessionKind!=='today'||!q||!q._planKey)return false;
    const today=ppDateKey(new Date()),r=ppProgressFor(ppLoadProgress(),q._planKey);
    if(r.sameDayConfirmedDate===today||r.sameDayFirstCorrectDate!==today||r.lastOutcome!=='sure')return false;
    if(planSessionQueue.slice(planSessionIdx+1).some(x=>x&&x._planKey===q._planKey))return false;
    const delay=30+Math.floor(Math.random()*21);
    const insertAt=Math.min(planSessionQueue.length,planSessionIdx+1+delay);
    const copy={...q,_sameDayRecheck:true,_sameDayRecheckDelay:Math.max(0,insertAt-planSessionIdx-1)};
    planSessionQueue.splice(insertAt,0,copy);
    planSessionAnswers.splice(insertAt,0,null);
    planSessionConfidence.splice(insertAt,0,null);
    return true;
  }
"""
    text=text.replace(anchor,anchor+helper,1)

# Resume must accept checkpoint queues containing delayed repeat keys.
# If an older cached assignment contains stale keys, skip only those keys instead
# of blocking the entire daily session.
start_fn="""  window.startNavigatorPassPlanToday=async function(){
    planSessionKind='today'; // recovery-recheck-v1
    const plan=ppLoadPlan();await ppBuildPools(plan);const progress=ppLoadProgress(),today=ppDateKey(new Date());
    const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
    const allKeys=(assignment.keys||[]).slice();
    const unresolvedKeys=allKeys.filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
    if(!unresolvedKeys.length){showToast('오늘 숙제를 모두 완료했습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}
    try{
      const checkpoint=ppLoadPassSessionCheckpoint();
      const baseSet=new Set(allKeys);
      let checkpointMatches=!!(checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length>=allKeys.length&&checkpoint.queueKeys.every(k=>baseSet.has(k))&&allKeys.every(k=>checkpoint.queueKeys.includes(k)));
      let sourceKeys=checkpointMatches?checkpoint.queueKeys:allKeys;
      let activeKeys=allKeys.slice();
      let queue=await ppHydrateKeys(sourceKeys); // stale-assignment-recovery-v2
      if(!queue.length)throw new Error('현재 불러올 수 있는 문제 원문이 없습니다.');
      if(queue.length!==sourceKeys.length){
        const hydratedKeys=new Set(queue.map(q=>q&&q._planKey).filter(Boolean));
        const missing=allKeys.filter(k=>!hydratedKeys.has(k));
        console.warn('[pass-plan] stale daily assignment keys skipped',missing);
        activeKeys=allKeys.filter(k=>hydratedKeys.has(k));
        checkpointMatches=false;
        sourceKeys=activeKeys;
        ppClearPassSessionCheckpoint();
        queue=await ppHydrateKeys(activeKeys);
      }
      if(!queue.length)throw new Error('현재 불러올 수 있는 문제 원문이 없습니다.');
      if(checkpointMatches){
        const seen=new Set();
        queue=queue.map(q=>{if(seen.has(q._planKey))return {...q,_sameDayRecheck:true};seen.add(q._planKey);return q});
        const nextIndex=Number(checkpoint.nextIndex);
        if(Number.isInteger(nextIndex)&&nextIndex>=0&&nextIndex<queue.length){
          planSessionQueue=queue;planSessionIdx=nextIndex;
          planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);
          if(Array.isArray(checkpoint.answers))checkpoint.answers.slice(0,queue.length).forEach((v,i)=>{if(v===null||Number.isInteger(v))planSessionAnswers[i]=v});
          if(Array.isArray(checkpoint.confidence))checkpoint.confidence.slice(0,queue.length).forEach((v,i)=>{if(v===null||['sure','unsure','wrong'].includes(v))planSessionConfidence[i]=v});
          planSessionCommitted=new Set(Array.isArray(checkpoint.committed)?checkpoint.committed.filter(i=>Number.isInteger(i)&&i>=0&&i<queue.length):[]);
          for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);
          planSessionStartedAt=Date.now();currentMode='pass-plan-session';renderNavigatorPassPlanCard();return;
        }
      }
      if(checkpoint)ppClearPassSessionCheckpoint();
      let startIndex=activeKeys.findIndex(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(startIndex<0)startIndex=0;
      queue=queue.map(q=>({...q,_sameDayRecheck:false}));
      planSessionQueue=queue;planSessionIdx=startIndex;planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();
      for(let i=0;i<startIndex;i++)if(ppTodayCleared(ppProgressFor(progress,activeKeys[i]),today))planSessionCommitted.add(i);
      currentMode='pass-plan-session';ppSavePassSessionCheckpoint(startIndex);renderNavigatorPassPlanCard();
    }catch(e){app.innerHTML=`<div class=\"card\" style=\"margin-top:30px\"><b>오늘 숙제를 시작하지 못했습니다.</b><div style=\"font-size:12px;margin-top:7px\">${escapeHtml(e.message||String(e))}</div><button class=\"btn btn-outline\" style=\"margin-top:12px\" onclick=\"renderNavigatorPassPlan('${planEntrySubject}')\">플랜으로 돌아가기</button></div>`}
  };"""
text,n=re.subn(r"  window\.startNavigatorPassPlanToday=async function\(\)\{.*?\n  \};",start_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('startNavigatorPassPlanToday not found')

choose_fn="""  window.chooseNavigatorPassPlanAnswer=function(i){
    if(currentMode!=='pass-plan-session')return;
    const q=planSessionQueue[planSessionIdx];
    if(planSessionAnswers[planSessionIdx]!==null||!q||i<0||i>=q['선택지'].length)return;
    const confidence=i===q['정답']?'sure':'wrong';
    planSessionAnswers[planSessionIdx]=i;planSessionConfidence[planSessionIdx]=confidence;
    if(!planSessionCommitted.has(planSessionIdx)){
      ppCommitOutcome(q,i,confidence);planSessionCommitted.add(planSessionIdx);
      if(confidence==='sure')ppScheduleSameDayRecheck(q);
    }
    ppSavePassSessionCheckpoint(planSessionIdx+1);
    renderNavigatorPassPlanCard();
  };"""
text,n=re.subn(r"  window\.chooseNavigatorPassPlanAnswer=function\(i\)\{.*?\n  \};",choose_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('chooseNavigatorPassPlanAnswer not found')

# De-duplicate result-page unresolved counts because the queue can now contain confirmation copies.
old="const unresolved=planSessionQueue.filter(q=>!ppTodayCleared(ppProgressFor(progress,q._planKey),today));"
new="const unresolved=[...new Map(planSessionQueue.filter(q=>!ppTodayCleared(ppProgressFor(progress,q._planKey),today)).map(q=>[q._planKey,q])).values()];"
if old in text:text=text.replace(old,new,1)
elif new not in text: raise SystemExit('result unresolved selector not found')

# Safe copy updates: these sections are not rewritten by the earlier weak-drill patch once present.
text=text.replace(
    '오늘 한 번이라도 틀린 문제와 누적 2회 이상 틀린 문제를 별도로 다시 풀 수 있습니다.',
    '오늘 한 번이라도 틀린 문제와 누적 2회 이상 틀렸지만 아직 숙달되지 않은 문제를 별도로 다시 풀 수 있습니다. 오늘 숙제에서 처음 맞힌 문제는 30~50문제 뒤 자동 재확인됩니다.',1)
text=text.replace(
    '자주 틀리는 문제는 누적 오답 횟수가 많은 순으로 출제됩니다.',
    '자주 틀리는 문제는 누적 오답 횟수가 많은 순으로 출제되며 숙달되면 목록에서 빠집니다.',1)

if MARKER not in text: raise SystemExit('recovery-recheck marker missing after patch')
if 'stale-assignment-recovery-v2' not in text: raise SystemExit('stale assignment recovery marker missing after patch')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched weakness retirement, delayed same-day recheck, and stale assignment recovery')
else:
    print('recovery/recheck already patched')
