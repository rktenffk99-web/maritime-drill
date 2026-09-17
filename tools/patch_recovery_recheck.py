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

# Resume policy v3:
# - A same-day checkpoint is the authoritative queue for an unfinished session.
# - Do NOT rebuild today's adaptive assignment first and compare it with the checkpoint;
#   progress changes while studying can legitimately change a freshly rebuilt assignment.
# - Preserve delayed same-day recheck duplicates in the saved queue.
# - If an old build already discarded the checkpoint, recover from the contiguous prefix
#   of questions actually attempted today rather than from "today-cleared" status.
start_fn="""  window.startNavigatorPassPlanToday=async function(){
    planSessionKind='today'; // recovery-recheck-v1 checkpoint-authoritative-resume-v3
    const plan=ppLoadPlan();await ppBuildPools(plan);const progress=ppLoadProgress(),today=ppDateKey(new Date());
    try{
      const checkpoint=ppLoadPassSessionCheckpoint();
      if(checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length){
        const checkpointKeys=checkpoint.queueKeys.slice();
        const uniqueKeys=[...new Set(checkpointKeys)];
        const hydratedUnique=await ppHydrateKeys(uniqueKeys);
        const byKey=new Map((hydratedUnique||[]).filter(q=>q&&q._planKey).map(q=>[q._planKey,q]));
        const keptOldIndices=[];
        checkpointKeys.forEach((k,i)=>{if(byKey.has(k))keptOldIndices.push(i)});
        if(keptOldIndices.length){
          if(keptOldIndices.length!==checkpointKeys.length)console.warn('[pass-plan] stale checkpoint keys skipped',checkpointKeys.filter(k=>!byKey.has(k)));
          const seen=new Set();
          const queue=keptOldIndices.map(oldIdx=>{
            const key=checkpointKeys[oldIdx],repeat=seen.has(key);seen.add(key);
            return {...byKey.get(key),_sameDayRecheck:repeat};
          });
          const oldNext=Math.max(0,Math.min(checkpointKeys.length,Number(checkpoint.nextIndex)||0));
          const nextIndex=keptOldIndices.filter(i=>i<oldNext).length;
          if(nextIndex<queue.length){
            planSessionQueue=queue;planSessionIdx=nextIndex;
            planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionCommitted=new Set();
            keptOldIndices.forEach((oldIdx,newIdx)=>{
              const av=Array.isArray(checkpoint.answers)?checkpoint.answers[oldIdx]:null;
              const cv=Array.isArray(checkpoint.confidence)?checkpoint.confidence[oldIdx]:null;
              if(av===null||Number.isInteger(av))planSessionAnswers[newIdx]=av;
              if(cv===null||['sure','unsure','wrong'].includes(cv))planSessionConfidence[newIdx]=cv;
              if(Array.isArray(checkpoint.committed)&&checkpoint.committed.includes(oldIdx))planSessionCommitted.add(newIdx);
            });
            for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);
            planSessionStartedAt=Date.now();currentMode='pass-plan-session';
            ppSavePassSessionCheckpoint(nextIndex); // normalize after skipping stale keys, if any
            renderNavigatorPassPlanCard();return;
          }
        }
        console.warn('[pass-plan] saved checkpoint could not be restored; using progress recovery');
        ppClearPassSessionCheckpoint();
      }

      const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
      const allKeys=(assignment.keys||[]).slice();
      if(!allKeys.length){showToast('오늘 숙제가 없습니다.');renderNavigatorPassPlan(planEntrySubject);return}
      const hydrated=await ppHydrateKeys([...new Set(allKeys)]); // stale-assignment-recovery-v3
      const byKey=new Map((hydrated||[]).filter(q=>q&&q._planKey).map(q=>[q._planKey,q]));
      const activeKeys=allKeys.filter(k=>byKey.has(k));
      if(activeKeys.length!==allKeys.length)console.warn('[pass-plan] stale daily assignment keys skipped',allKeys.filter(k=>!byKey.has(k)));
      if(!activeKeys.length)throw new Error('현재 불러올 수 있는 문제 원문이 없습니다.');
      const queue=activeKeys.map(k=>({...byKey.get(k),_sameDayRecheck:false}));

      const unresolvedKeys=activeKeys.filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(!unresolvedKeys.length){showToast('오늘 숙제를 모두 완료했습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}

      // Emergency recovery for sessions whose checkpoint was already lost by an older build.
      // lastDate===today means the item was actually answered today; this is distinct from
      // sameDayConfirmedDate, which may still be null after the first correct answer.
      let startIndex=0;
      while(startIndex<activeKeys.length){
        const rec=ppProgressFor(progress,activeKeys[startIndex]);
        if(!(rec&&rec.lastDate===today&&Number(rec.attempts||0)>0))break;
        startIndex++;
      }
      if(startIndex>=activeKeys.length){
        startIndex=activeKeys.findIndex(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
        if(startIndex<0){showToast('오늘 숙제를 모두 완료했습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}
      }

      planSessionQueue=queue;planSessionIdx=startIndex;planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();
      for(let i=0;i<startIndex;i++){
        const rec=ppProgressFor(progress,activeKeys[i]);
        if(rec&&rec.lastDate===today)planSessionCommitted.add(i);
      }
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
if 'checkpoint-authoritative-resume-v3' not in text: raise SystemExit('checkpoint resume v3 marker missing after patch')
if 'stale-assignment-recovery-v3' not in text: raise SystemExit('stale assignment recovery v3 marker missing after patch')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched weakness retirement, delayed same-day recheck, and checkpoint-stable resume')
else:
    print('recovery/recheck already patched')
