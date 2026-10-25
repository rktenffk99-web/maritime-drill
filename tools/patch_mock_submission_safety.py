"""Keep papers recoverable until every synchronous result write succeeds."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'index.html'
text = path.read_text(encoding='utf-8-sig')


def replace(old, new):
    global text
    if new in text:
        return
    if text.count(old) != 1:
        raise RuntimeError('missing or ambiguous submission anchor: ' + old[:100])
    text = text.replace(old, new, 1)


if '// mock-submission-save-guard-v526:' not in text:
    replace("""function renderPastResult(){
  if(currentMode!=='past')return;
  currentMode='past-result';""", """function renderPastResult(){
  if(currentMode!=='past')return;
  // mock-submission-save-guard-v526: retain the live answers and last checkpoint on failure.
  if(savePastProgress()!==true){
    showToast('답안을 저장하지 못해 제출을 중단했습니다. 다시 저장하거나 답안 파일을 백업하세요.',6000);
    if(pastIdx>=0&&pastIdx<pastQueue.length)renderPastCard();
    return;
  }
  currentMode='past-result';""")

helper = """// mock-submission-transaction-v526: rollback all result keys, including sync metadata.
let mdPastSubmissionRecovery=null;
function mdRestorePastSubmission(snapshot){
  const hasSync=typeof driveSyncApplyingRemote!=='undefined';
  const wasApplying=hasSync?driveSyncApplyingRemote:false;
  if(hasSync)driveSyncApplyingRemote=true;
  try{
    // Restore shrinking values first; the old snapshot can fit even when a growing key cannot fit yet.
    const values=new Map([...snapshot.values,['md_drive_sync_state_v1',snapshot.sync]]);
    const operations=[...values].map(([key,value])=>({key,value,before:localStorage.getItem(key)}));
    operations.sort((a,b)=>(a.value===null?-Infinity:a.value.length-(a.before||'').length)-(b.value===null?-Infinity:b.value.length-(b.before||'').length));
    for(const {key,value,before} of operations){
      if(value===before)continue;
      if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
    }
    return [...snapshot.values].every(([key,value])=>localStorage.getItem(key)===value)&&localStorage.getItem('md_drive_sync_state_v1')===snapshot.sync;
  }catch(error){console.warn('[mock-submit] result rollback failed',error);return false}
  finally{if(hasSync)driveSyncApplyingRemote=wasApplying}
}
function mdCommitPastSubmission(action){
  // Never replay an old rollback after the user has made other changes.
  if(mdPastSubmissionRecovery)return false;
  const originalSet=safeStorageSet,originalRemove=safeStorageRemove;
  let snapshot,failed=false;
  try{snapshot={values:new Map(),sync:localStorage.getItem('md_drive_sync_state_v1')}}catch(error){return false}
  const remember=key=>{if(!snapshot.values.has(key))snapshot.values.set(key,localStorage.getItem(key))};
  safeStorageSet=function(key,value,label){
    try{
      remember(key);
      if(failed||originalSet(key,value,label)!==true)throw new Error('채점 기록 저장 실패: '+(label||key));
      return true;
    }catch(error){failed=true;throw error}
  };
  safeStorageRemove=function(key,label){
    try{
      remember(key);
      if(failed||originalRemove(key,label)!==true)throw new Error('채점 기록 정리 실패: '+(label||key));
      return true;
    }catch(error){failed=true;throw error}
  };
  try{action();if(failed)throw new Error('채점 기록 저장 실패');return true}
  catch(error){
    mdPastSubmissionRecovery=snapshot;
    if(mdRestorePastSubmission(snapshot))mdPastSubmissionRecovery=null;
    console.warn('[mock-submit] submission kept for retry',error);
    return false;
  }finally{safeStorageSet=originalSet;safeStorageRemove=originalRemove}
}

"""
if '// mock-submission-transaction-v526:' not in text:
    replace('function renderPastResult(){', helper + 'function renderPastResult(){')

replace("""  currentMode='past-result';
  pastResultId=pastProgressId;
  clearPastProgress();
  const total = pastQueue.length;""", """  pastResultId=pastProgressId;
  const total = pastQueue.length;""")

old = """  // v4.46: 오답 자동 누적 + 정답은 오답노트에서 자동 제거 + 풀이 기록 저장 (단일 회차만)
  wrongs.forEach(({q,ans}) => {if(!q._evaluationMock)addPastWrong(q, ans)});
  pastQueue.forEach((q,i)=>{
    if(!q._evaluationMock&&pastAnswers[i] === q['정답']) removePastWrong(pqid(q));
  });
  if(isPredictiveMock&&typeof window.commitNavigatorPredictiveMockResult==='function'){
    window.commitNavigatorPredictiveMockResult(pastQueue,pastAnswers);
  }
  if(!pastAllYears && !pastReturnView && pastBaseShort && pastYear && pastSession){
    recordPastSession(pastBaseShort, pastYear, pastSession, correct, total, pastMode);
  }
"""
new = """  const committed=mdCommitPastSubmission(()=>{
    wrongs.forEach(({q,ans}) => {if(!q._evaluationMock)addPastWrong(q, ans)});
    pastQueue.forEach((q,i)=>{
      if(!q._evaluationMock&&pastAnswers[i] === q['정답']) removePastWrong(pqid(q));
    });
    if(isPredictiveMock&&typeof window.commitNavigatorPredictiveMockResult==='function'){
      if(window.commitNavigatorPredictiveMockResult(pastQueue,pastAnswers)===false)throw new Error('학습 진도 저장 실패');
    }
    if(!pastAllYears && !pastReturnView && pastBaseShort && pastYear && pastSession){
      if(recordPastSession(pastBaseShort, pastYear, pastSession, correct, total, pastMode)===false)throw new Error('기출 풀이 기록 저장 실패');
    }
    const analytics=window.__mdWeakTopicAnalytics;
    if(analytics&&typeof analytics.persistResult==='function')analytics.persistResult(pastQueue,pastAnswers);
    // Deleting the paper is the final transaction step, after every result is durable.
    clearPastProgress();
  });
  if(!committed){
    showToast(mdPastSubmissionRecovery?'일부 채점 기록을 복구하지 못했습니다. 답안 파일을 백업한 뒤 새로고침하여 다시 제출하세요.':'채점 기록을 저장하지 못해 제출을 중단했습니다. 답안을 보존했습니다. 다시 제출하거나 파일로 백업하세요.',6000);
    if(pastIdx>=0&&pastIdx<pastQueue.length)renderPastCard();
    return;
  }
  currentMode='past-result';
"""
replace(old, new)
replace("""  const prev = h[key];
  const rate = correct/total;
  h[key] = {
    correct, total, mode, at: Date.now(),""", """  const prev = h[key];
  const resultId=typeof pastResultId!=='undefined'&&pastResultId?String(pastResultId):null;
  if(resultId&&prev&&prev.resultId===resultId)return true;
  const rate = correct/total;
  h[key] = {
    correct, total, mode, at: Date.now(),resultId,""")
replace('  savePastHistory(h);\n}\nfunction getPastSessionHistory', '  return savePastHistory(h);\n}\nfunction getPastSessionHistory')
replace("""      const r=ppProgressFor(progress,q._planKey);window.__mdLearningIntegrity.initializeCounters(r);r.lastPracticeMode='predictive-mock';""", """      const r=ppProgressFor(progress,q._planKey);
      const commitId=String((typeof pastResultId!=='undefined'&&pastResultId)||(typeof pastProgressId!=='undefined'&&pastProgressId)||'');
      if(commitId&&r.lastMockCommitId===commitId)return;
      if(commitId)r.lastMockCommitId=commitId;
      window.__mdLearningIntegrity.initializeCounters(r);r.lastPracticeMode='predictive-mock';""")
replace('    ppSaveProgress(progress);\n    const daily=ppLoadDaily(),checkpoint=ppLoadPassSessionCheckpoint();', '    if(!ppSaveProgress(progress))return false;\n    const daily=ppLoadDaily(),checkpoint=ppLoadPassSessionCheckpoint();')
replace('    ppSaveDaily(daily);\n  };\n\n  const PP_EVALUATION_EXPOSURE_KEY', '    return ppSaveDaily(daily);\n  };\n\n  const PP_EVALUATION_EXPOSURE_KEY')
path.write_text(text, encoding='utf-8')
print('mock submission transaction integration ready')
