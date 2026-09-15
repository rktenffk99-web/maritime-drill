from pathlib import Path

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

# Replace the whole "today homework" session starter.  This intentionally keeps
# the full daily assignment as the session queue.  Previously already-cleared
# questions were filtered out before hydration, so 110 questions could become
# 108 and a reopened session incorrectly showed 1/108.
start_marker = '  window.startNavigatorPassPlanToday=async function(){'
end_marker = '  function ppGradeColor'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('startNavigatorPassPlanToday block not found')

new_start = """  window.startNavigatorPassPlanToday=async function(){
    const plan=ppLoadPlan();await ppBuildPools(plan);const progress=ppLoadProgress(),today=ppDateKey(new Date());
    const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
    const assignmentKeys=(assignment.keys||[]).slice();
    const unresolvedKeys=assignmentKeys.filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
    if(!unresolvedKeys.length){ppClearPassSessionCheckpoint();showToast('오늘 숙제를 모두 완료했습니다.');renderNavigatorPassPlan(planEntrySubject);return}
    try{
      const assignmentSet=new Set(assignmentKeys);
      const checkpoint=ppLoadPassSessionCheckpoint();
      if(checkpoint&&checkpoint.queueKeys.length===assignmentKeys.length&&checkpoint.queueKeys.every(k=>assignmentSet.has(k))){
        const restored=await ppHydrateKeys(checkpoint.queueKeys);
        const nextIndex=Number(checkpoint.nextIndex);
        if(restored.length===checkpoint.queueKeys.length&&Number.isInteger(nextIndex)&&nextIndex>=0&&nextIndex<restored.length){
          planSessionQueue=restored;planSessionIdx=nextIndex;
          planSessionAnswers=new Array(restored.length).fill(null);planSessionConfidence=new Array(restored.length).fill(null);
          if(Array.isArray(checkpoint.answers))checkpoint.answers.slice(0,restored.length).forEach((v,i)=>{if(v===null||Number.isInteger(v))planSessionAnswers[i]=v});
          if(Array.isArray(checkpoint.confidence))checkpoint.confidence.slice(0,restored.length).forEach((v,i)=>{if(v===null||['sure','unsure','wrong'].includes(v))planSessionConfidence[i]=v});
          planSessionCommitted=new Set(Array.isArray(checkpoint.committed)?checkpoint.committed.filter(i=>Number.isInteger(i)&&i>=0&&i<restored.length):[]);
          for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);
          planSessionStartedAt=Date.now();currentMode='pass-plan-session';renderNavigatorPassPlanCard();return;
        }
      }
      if(checkpoint)ppClearPassSessionCheckpoint();

      const queue=await ppHydrateKeys(assignmentKeys);if(!queue.length)throw new Error('문제 원문을 찾지 못했습니다.');
      planSessionQueue=queue;
      const firstUncleared=queue.findIndex(q=>!ppTodayCleared(ppProgressFor(progress,q._planKey),today));
      planSessionIdx=firstUncleared<0?0:firstUncleared;
      planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionCommitted=new Set();
      for(let i=0;i<planSessionIdx;i++){
        if(ppTodayCleared(ppProgressFor(progress,queue[i]._planKey),today)){
          planSessionAnswers[i]=queue[i]['정답'];planSessionConfidence[i]='sure';planSessionCommitted.add(i);
        }
      }
      planSessionStartedAt=Date.now();currentMode='pass-plan-session';ppSavePassSessionCheckpoint(planSessionIdx);renderNavigatorPassPlanCard();
    }catch(e){app.innerHTML=`<div class="card" style="margin-top:30px"><b>오늘 숙제를 시작하지 못했습니다.</b><div style="font-size:12px;margin-top:7px">${escapeHtml(e.message||String(e))}</div><button class="btn btn-outline" style="margin-top:12px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">플랜으로 돌아가기</button></div>`}
  };
"""
text = text[:start] + new_start + text[end:]

# Make the progress indicator explicitly cumulative against the stable full queue.
text = text.replace('${planSessionIdx+1} / ${planSessionQueue.length}', '${planSessionIdx+1}/${planSessionQueue.length}')
text = text.replace('>${planSessionIdx+1}/${planSessionQueue.length}</div>', '>문제 ${planSessionIdx+1}/${planSessionQueue.length}</div>', 1)

# Keep answer autosave and automatic confidence behavior if the main file still
# contains the older handlers.
old_choose = """  window.chooseNavigatorPassPlanAnswer=function(i){
    if(currentMode!=='pass-plan-session')return;const q=planSessionQueue[planSessionIdx];if(planSessionAnswers[planSessionIdx]!==null||!q||i<0||i>=q['선택지'].length)return;planSessionAnswers[planSessionIdx]=i;if(i!==q['정답'])planSessionConfidence[planSessionIdx]='wrong';renderNavigatorPassPlanCard();
  };"""
new_choose = """  window.chooseNavigatorPassPlanAnswer=function(i){
    if(currentMode!=='pass-plan-session')return;
    const q=planSessionQueue[planSessionIdx];
    if(planSessionAnswers[planSessionIdx]!==null||!q||i<0||i>=q['선택지'].length)return;
    const confidence=i===q['정답']?'sure':'wrong';
    planSessionAnswers[planSessionIdx]=i;planSessionConfidence[planSessionIdx]=confidence;
    if(!planSessionCommitted.has(planSessionIdx)){ppCommitOutcome(q,i,confidence);planSessionCommitted.add(planSessionIdx)}
    ppSavePassSessionCheckpoint(planSessionIdx+1);
    renderNavigatorPassPlanCard();
  };"""
if old_choose in text:
    text = text.replace(old_choose, new_choose, 1)

text = text.replace("const canNext=showFeedback&&(!isCorrect||confidence==='sure'||confidence==='unsure');", "const canNext=showFeedback;", 1)

old_next = """  window.nextNavigatorPassPlanQuestion=function(){
    if(currentMode!=='pass-plan-session')return;const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx],conf=planSessionConfidence[planSessionIdx];if(answer===null)return;if(answer===q['정답']&&!['sure','unsure'].includes(conf))return;
    if(!planSessionCommitted.has(planSessionIdx)){ppCommitOutcome(q,answer,conf);planSessionCommitted.add(planSessionIdx)}
    planSessionIdx++;renderNavigatorPassPlanCard();
  };"""
new_next = """  window.nextNavigatorPassPlanQuestion=function(){
    if(currentMode!=='pass-plan-session')return;const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx],conf=planSessionConfidence[planSessionIdx];if(answer===null)return;
    if(!planSessionCommitted.has(planSessionIdx)){ppCommitOutcome(q,answer,conf||'wrong');planSessionCommitted.add(planSessionIdx)}
    planSessionIdx++;
    if(planSessionIdx>=planSessionQueue.length)ppClearPassSessionCheckpoint();else ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();
  };"""
if old_next in text:
    text = text.replace(old_next, new_next, 1)

# The explicit "retry unresolved only" mode is allowed to build a smaller queue.
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
