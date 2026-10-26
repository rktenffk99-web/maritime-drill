"""Keep homework answers and navigation recoverable when checkpoint storage fails."""
from pathlib import Path
import argparse,re,sys
MARKER='homework-checkpoint-safety-v533'
def patch(s):
    if MARKER in s:return s
    def replace(old,new):
        nonlocal s
        assert s.count(old)==1,old[:120]
        s=s.replace(old,new,1)
    def function(name,new):
        nonlocal s
        s,n=re.subn(r'  function '+name+r'\([^\n]*\)\{[\s\S]*?\n  \}',lambda _:new,s,count=1)
        assert n==1,name
    function('ppSavePassSessionCheckpoint',r'''  // homework-checkpoint-safety-v533: keep the live answer until its exact checkpoint is durable.
  let ppCheckpointSaveFailed=false;
  function ppSavePassSessionCheckpoint(nextIndex){
    if(planSessionKind!=='today'||!Array.isArray(planSessionQueue)||!planSessionQueue.length)return true;
    try{
      const idx=Math.max(0,Number(nextIndex)||0);
      if(idx>=planSessionQueue.length)return ppClearPassSessionCheckpoint();
      const value=JSON.stringify({
        version:2,dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY,subjectBalancePolicy:'coverage-even-v2',date:ppDateKey(new Date()),savedAt:new Date().toISOString(),
        queueKeys:planSessionQueue.map(q=>q._planKey),nextIndex:idx,startedAt:planSessionStartedAt,
        answers:Array.isArray(planSessionAnswers)?planSessionAnswers.slice():[],
        confidence:Array.isArray(planSessionConfidence)?planSessionConfidence.slice():[],
        commitIds:planSessionCommitIds.slice(),committed:Array.from(planSessionCommitted||[]),firstAnswers:planSessionFirstAnswers
      });
      localStorage.setItem(PASS_SESSION_CHECKPOINT_KEY,value);
      if(localStorage.getItem(PASS_SESSION_CHECKPOINT_KEY)!==value)throw new Error('checkpoint readback mismatch');
      ppCheckpointSaveFailed=false;return true;
    }catch(e){
      ppCheckpointSaveFailed=true;
      console.warn('[pass-plan] checkpoint save failed',e);
      showToast('오늘 공부 답안을 저장하지 못했습니다. 이 화면을 유지하고 저장을 다시 시도하세요.',6000);
      return false;
    }
  }''')
    replace("  function ppClearPassSessionCheckpoint(){try{localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY)}catch(e){}}",r'''  function ppClearPassSessionCheckpoint(){
    try{
      localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);
      if(localStorage.getItem(PASS_SESSION_CHECKPOINT_KEY)!==null)throw new Error('checkpoint removal failed');
      ppCheckpointSaveFailed=false;return true;
    }catch(e){ppCheckpointSaveFailed=true;showToast('오늘 공부 완료 기록을 저장하지 못했습니다. 다시 시도하세요.',6000);return false}
  }
  function ppCheckpointWarning(){
    return ppCheckpointSaveFailed?'<div class="card" role="alert" data-homework-save-status style="background:#FEF2F2;border-left:4px solid #DC2626"><b>답안 저장 실패</b><p style="font-size:12px">현재 답안은 이 화면에 남아 있습니다. 저장 전에는 앱을 종료하지 마세요.</p><button class="btn btn-outline" onclick="retryNavigatorPassPlanSave()">저장 다시 시도</button></div>':'';
  }
  window.retryNavigatorPassPlanSave=function(){
    if(currentMode!=='pass-plan-session')return false;
    const saved=ppSavePassSessionCheckpoint(planSessionIdx);renderNavigatorPassPlanCard();return saved;
  };
  window.__mdHomeworkPersistence={
    beforeLeave(){
      if(currentMode!=='pass-plan-session'&&!ppCheckpointSaveFailed)return true;
      const saved=ppFlushTodayAnswer();
      if(!saved){currentMode='pass-plan-session';renderNavigatorPassPlanCard();}
      return saved;
    },
    checkpoint(){return !ppCheckpointSaveFailed;},
    hasUnsaved(){return ppCheckpointSaveFailed;}
  };''')
    replace("    app.innerHTML=`\n      <div style=\"padding-top:20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px\"><button class=\"btn btn-outline\" style=\"width:auto\" onclick=\"showConfirm('${sessionLabel}","    app.innerHTML=`${ppCheckpointWarning()}\n      <div style=\"padding-top:20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px\"><button class=\"btn btn-outline\" style=\"width:auto\" onclick=\"showConfirm('${sessionLabel}")
    replace("    if(planSessionAnswers[planSessionIdx]!==null||!q||!Number.isInteger(i)||i<0||i>=q['선택지'].length)return;", "    if(!q||!Number.isInteger(i)||i<0||i>=q['선택지'].length)return;\n    if(planSessionAnswers[planSessionIdx]!==null){if(planSessionAnswers[planSessionIdx]===i&&ppCheckpointSaveFailed)retryNavigatorPassPlanSave();return;}")
    function('ppFlushTodayAnswer',r'''  function ppFlushTodayAnswer(){
    // mastery-home-detour-r3: a pending occurrence owns its answer across navigation.
    if(planSessionKind!=='today')return true;
    const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx];
    if(!q||!Array.isArray(q['선택지']))return !ppCheckpointSaveFailed;
    if(currentMode!=='pass-plan-session'&&!ppCheckpointSaveFailed){
      const checkpoint=ppLoadPassSessionCheckpoint();
      if(!checkpoint||Number(checkpoint.startedAt)!==Number(planSessionStartedAt)||Number(checkpoint.nextIndex)!==planSessionIdx||checkpoint.queueKeys[planSessionIdx]!==q._planKey||!Array.isArray(checkpoint.answers)||checkpoint.answers[planSessionIdx]!==answer)return true;
    }
    if(!ppSavePassSessionCheckpoint(planSessionIdx))return false;
    if(Number.isInteger(answer)&&answer>=0&&answer<q['선택지'].length&&!planSessionCommitted.has(planSessionIdx)){
      const confidence=answer===q['정답']?'sure':'wrong';planSessionConfidence[planSessionIdx]=confidence;
      if(!ppCommitOutcome(q,answer,confidence))return false;
      planSessionCommitted.add(planSessionIdx);if(confidence==='sure')ppScheduleSameDayRecheck(q);
    }
    return ppSavePassSessionCheckpoint(planSessionIdx);
  }''')
    replace('''    planSessionIdx--;
    ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();''','''    if(!ppSavePassSessionCheckpoint(planSessionIdx-1)){renderNavigatorPassPlanCard();return;}
    planSessionIdx--;
    renderNavigatorPassPlanCard();''')
    replace('''    if(!planSessionCommitted.has(planSessionIdx)){
      planSessionConfidence[planSessionIdx]=confidence;''','''    if(!ppSavePassSessionCheckpoint(planSessionIdx)){renderNavigatorPassPlanCard();return;}
    if(!planSessionCommitted.has(planSessionIdx)){
      planSessionConfidence[planSessionIdx]=confidence;''')
    replace('''    planSessionIdx++;
    if(planSessionIdx>=planSessionQueue.length){if(planSessionKind==='today')ppClearPassSessionCheckpoint();}else ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();''','''    const nextIndex=planSessionIdx+1;
    if(!ppSavePassSessionCheckpoint(nextIndex)){renderNavigatorPassPlanCard();return;}
    planSessionIdx=nextIndex;
    renderNavigatorPassPlanCard();''')
    # Preserve the original in-memory answer if returning to today's session after a failed save.
    replace("  window.startNavigatorPassPlanToday=async function(){\n    planSessionKind='today';", "  window.startNavigatorPassPlanToday=async function(){\n    if(ppCheckpointSaveFailed){currentMode='pass-plan-session';renderNavigatorPassPlanCard();return;}\n    planSessionKind='today';")
    return s
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stdin',action='store_true');parser.add_argument('--stdout',action='store_true');args=parser.parse_args()
    path=Path(__file__).resolve().parents[1]/'index.html';original=sys.stdin.read() if args.stdin else path.read_text(encoding='utf-8-sig');result=patch(original)
    if args.stdout:sys.stdout.write(result)
    else:path.write_text(result,encoding='utf-8');print('homework checkpoint safety v5.33 ready')
