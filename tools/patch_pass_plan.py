from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8-sig')
original = text

tag = '<script src="keyboard-controls.js"></script>'
if tag not in text:
    marker = '</body>'
    text = text.replace(marker, tag + '\n' + marker, 1) if marker in text else text + '\n' + tag + '\n'

cp_marker = "const PASS_SESSION_CHECKPOINT_KEY='md_pass_plan_session_checkpoint_v2';"
if cp_marker not in text:
    anchor = '  let planSessionCommitted=new Set();'
    helper = """
  const PASS_SESSION_CHECKPOINT_KEY='md_pass_plan_session_checkpoint_v2';
  function ppSavePassSessionCheckpoint(nextIndex){
    try{
      if(!Array.isArray(planSessionQueue)||!planSessionQueue.length)return;
      const idx=Math.max(0,Number(nextIndex)||0);
      if(idx>=planSessionQueue.length){localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return}
      localStorage.setItem(PASS_SESSION_CHECKPOINT_KEY,JSON.stringify({
        version:2,date:ppDateKey(new Date()),savedAt:new Date().toISOString(),
        queueKeys:planSessionQueue.map(q=>q._planKey),nextIndex:idx,
        answers:Array.isArray(planSessionAnswers)?planSessionAnswers.slice():[],
        confidence:Array.isArray(planSessionConfidence)?planSessionConfidence.slice():[],
        committed:Array.from(planSessionCommitted||[])
      }));
    }catch(e){console.warn('[pass-plan] checkpoint save failed',e)}
  }
  function ppLoadPassSessionCheckpoint(){
    try{
      const raw=localStorage.getItem(PASS_SESSION_CHECKPOINT_KEY);if(!raw)return null;
      const cp=JSON.parse(raw);
      if(!cp||cp.version!==2||cp.date!==ppDateKey(new Date())||!Array.isArray(cp.queueKeys)){
        localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return null
      }
      return cp;
    }catch(e){localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return null}
  }
  function ppClearPassSessionCheckpoint(){try{localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY)}catch(e){}}
""".rstrip()
    if anchor not in text:
        raise SystemExit('checkpoint anchor not found')
    text = text.replace(anchor, anchor + '\n' + helper, 1)

# The checkpoint queue is authoritative for an unfinished same-day session.
# Rebuilding today's adaptive assignment after every reload can change its order/content
# because progress is updated while the user studies. A strict comparison against that
# rebuilt assignment used to discard a valid checkpoint and could send e.g. 36/110 back
# to 3/110. Restore the saved queue first, and only build today's assignment when there
# is no usable checkpoint.
start_fn = """  window.startNavigatorPassPlanToday=async function(){
    const plan=ppLoadPlan();await ppBuildPools(plan);const progress=ppLoadProgress(),today=ppDateKey(new Date());
    try{
      const checkpoint=ppLoadPassSessionCheckpoint();
      if(checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length){
        const checkpointKeys=checkpoint.queueKeys.slice();
        const hydrated=await ppHydrateKeys(checkpointKeys);
        const byKey=new Map((hydrated||[]).filter(q=>q&&q._planKey).map(q=>[q._planKey,q]));
        const activeKeys=checkpointKeys.filter(k=>byKey.has(k));
        if(activeKeys.length){
          const queue=activeKeys.map(k=>byKey.get(k));
          const oldNext=Math.max(0,Math.min(checkpointKeys.length,Number(checkpoint.nextIndex)||0));
          let nextIndex=0;
          for(let i=0;i<oldNext;i++)if(byKey.has(checkpointKeys[i]))nextIndex++;
          if(nextIndex<queue.length){
            planSessionQueue=queue;planSessionIdx=nextIndex;
            planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionCommitted=new Set();
            let newIdx=0;
            for(let oldIdx=0;oldIdx<checkpointKeys.length;oldIdx++){
              if(!byKey.has(checkpointKeys[oldIdx]))continue;
              const av=Array.isArray(checkpoint.answers)?checkpoint.answers[oldIdx]:null;
              const cv=Array.isArray(checkpoint.confidence)?checkpoint.confidence[oldIdx]:null;
              if(av===null||Number.isInteger(av))planSessionAnswers[newIdx]=av;
              if(cv===null||['sure','unsure','wrong'].includes(cv))planSessionConfidence[newIdx]=cv;
              if(Array.isArray(checkpoint.committed)&&checkpoint.committed.includes(oldIdx))planSessionCommitted.add(newIdx);
              newIdx++;
            }
            for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);
            planSessionStartedAt=Date.now();currentMode='pass-plan-session';
            // Normalize the checkpoint if stale/missing source keys were skipped.
            ppSavePassSessionCheckpoint(nextIndex);
            renderNavigatorPassPlanCard();return;
          }
        }
        console.warn('[pass-plan] saved checkpoint could not be restored; falling back to progress recovery');
      }

      const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
      const allKeys=(assignment.keys||[]).slice();
      if(!allKeys.length){showToast('오늘 숙제가 없습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}
      let hydrated=await ppHydrateKeys(allKeys);
      if(!hydrated.length)throw new Error('문제 원문을 찾지 못했습니다.');
      const byKey=new Map(hydrated.filter(q=>q&&q._planKey).map(q=>[q._planKey,q]));
      const activeKeys=allKeys.filter(k=>byKey.has(k));
      if(activeKeys.length!==allKeys.length)console.warn('[pass-plan] stale daily assignment keys skipped',allKeys.filter(k=>!byKey.has(k)));
      const queue=activeKeys.map(k=>byKey.get(k));
      if(!queue.length)throw new Error('현재 불러올 수 있는 문제 원문이 없습니다.');

      const unresolvedKeys=activeKeys.filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(!unresolvedKeys.length){showToast('오늘 숙제를 모두 완료했습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}

      // Emergency recovery when an older build already discarded the checkpoint:
      // resume after the contiguous prefix that was actually attempted today.
      let startIndex=0;
      while(startIndex<activeKeys.length){
        const rec=ppProgressFor(progress,activeKeys[startIndex]);
        if(!(rec&&rec.lastDate===today&&Number(rec.attempts||0)>0))break;
        startIndex++;
      }
      // If every item has already been attempted once today, move to the first item
      // that still needs same-day confirmation instead of producing an invalid index.
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
    }catch(e){app.innerHTML=`<div class="card" style="margin-top:30px"><b>오늘 숙제를 시작하지 못했습니다.</b><div style="font-size:12px;margin-top:7px">${escapeHtml(e.message||String(e))}</div><button class="btn btn-outline" style="margin-top:12px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">플랜으로 돌아가기</button></div>`}
  };
"""
pattern = r"  window\.startNavigatorPassPlanToday=async function\(\)\{.*?\n  \};\n  function ppGradeColor"
if not re.search(pattern, text, flags=re.S):
    raise SystemExit('start function not found')
text = re.sub(pattern, start_fn + '  function ppGradeColor', text, count=1, flags=re.S)

choose_fn = """  window.chooseNavigatorPassPlanAnswer=function(i){
    if(currentMode!=='pass-plan-session')return;
    const q=planSessionQueue[planSessionIdx];
    if(planSessionAnswers[planSessionIdx]!==null||!q||i<0||i>=q['선택지'].length)return;
    const confidence=i===q['정답']?'sure':'wrong';
    planSessionAnswers[planSessionIdx]=i;planSessionConfidence[planSessionIdx]=confidence;
    if(!planSessionCommitted.has(planSessionIdx)){ppCommitOutcome(q,i,confidence);planSessionCommitted.add(planSessionIdx)}
    ppSavePassSessionCheckpoint(planSessionIdx+1);
    renderNavigatorPassPlanCard();
  };"""
text, n = re.subn(r"  window\.chooseNavigatorPassPlanAnswer=function\(i\)\{.*?\n  \};", choose_fn, text, count=1, flags=re.S)
if n != 1:
    raise SystemExit('answer function not found')

next_fn = """  window.nextNavigatorPassPlanQuestion=function(){
    if(currentMode!=='pass-plan-session')return;const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx],conf=planSessionConfidence[planSessionIdx];if(answer===null)return;
    if(!planSessionCommitted.has(planSessionIdx)){ppCommitOutcome(q,answer,conf||'wrong');planSessionCommitted.add(planSessionIdx)}
    planSessionIdx++;
    if(planSessionIdx>=planSessionQueue.length)ppClearPassSessionCheckpoint();else ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();
  };"""
text, n = re.subn(r"  window\.nextNavigatorPassPlanQuestion=function\(\)\{.*?\n  \};", next_fn, text, count=1, flags=re.S)
if n != 1:
    raise SystemExit('next function not found')

text = text.replace("const canNext=showFeedback&&(!isCorrect||confidence==='sure'||confidence==='unsure');", "const canNext=showFeedback;", 1)

# Keep the visible counter tied to the full daily queue.
text = re.sub(
    r"\$\{planSessionIdx\+1\}\s*/\s*\$\{planSessionQueue\.length\}",
    '${planSessionIdx+1}/${planSessionQueue.length}',
    text,
    count=1,
)

# Retrying unresolved questions intentionally starts a new smaller retry set.
text = text.replace(
    "const queue=await ppHydrateKeys(keys);planSessionQueue=shuffle(queue);planSessionIdx=0;",
    "const queue=await ppHydrateKeys(keys);ppClearPassSessionCheckpoint();planSessionQueue=shuffle(queue);planSessionIdx=0;",
    1,
)

if text != original:
    p.write_text(text, encoding='utf-8')
    print('index.html patched')
else:
    print('no change needed')
