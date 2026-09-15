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

# Replace the whole daily-session start function so the queue always contains the
# complete daily assignment. This keeps the denominator fixed (e.g. 13/110)
# instead of rebuilding a shorter queue such as 1/108 after a restart.
start_fn = """  window.startNavigatorPassPlanToday=async function(){
    const plan=ppLoadPlan();await ppBuildPools(plan);const progress=ppLoadProgress(),today=ppDateKey(new Date());
    const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);
    const allKeys=(assignment.keys||[]).slice();
    const unresolvedKeys=allKeys.filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
    if(!unresolvedKeys.length){showToast('오늘 숙제를 모두 완료했습니다.');ppClearPassSessionCheckpoint();renderNavigatorPassPlan(planEntrySubject);return}
    try{
      const checkpoint=ppLoadPassSessionCheckpoint();
      const queue=await ppHydrateKeys(allKeys);if(!queue.length||queue.length!==allKeys.length)throw new Error('문제 원문을 찾지 못했습니다.');
      const checkpointMatches=checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length===allKeys.length&&checkpoint.queueKeys.every((k,i)=>k===allKeys[i]);
      if(checkpointMatches){
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
      let startIndex=allKeys.findIndex(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(startIndex<0)startIndex=0;
      planSessionQueue=queue;planSessionIdx=startIndex;planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();
      for(let i=0;i<startIndex;i++)if(ppTodayCleared(ppProgressFor(progress,allKeys[i]),today))planSessionCommitted.add(i);
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
