"""Apply record-preserving import and durable homework commits after legacy patches."""
from pathlib import Path
import re


def patch_html(text):
    def replace(old, new):
        nonlocal text
        if new in text:
            return
        if old not in text:
            raise RuntimeError('missing record-safety anchor: ' + old[:100])
        text = text.replace(old, new, 1)

    helper = '''function validateImportedBackupEntries(entries,before){
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const normalized=[];
  const numeric=(raw,key,min=0,max=Number.MAX_SAFE_INTEGER,integer=false)=>{
    if((typeof raw!=='number'&&typeof raw!=='string')||(typeof raw==='string'&&(!raw.trim()||!/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?$/i.test(raw.trim()))))throw new Error('백업 숫자 형식이 올바르지 않습니다: '+key);
    const n=Number(raw);
    if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error('백업 숫자 범위가 올바르지 않습니다: '+key);
    return n;
  };
  const counts=['attempts','correct','wrong','unsure','masteryReviews'];
  const fields=(row,names,key,min=0,max=Number.MAX_SAFE_INTEGER,integer=true)=>{
    for(const name of names)if(Object.prototype.hasOwnProperty.call(row,name))row[name]=numeric(row[name],key+'.'+name,min,max,integer);
  };
  const normalizeBox=(row,key)=>{
    fields(row,['box'],key,1,3);fields(row,['correct','wrong','reps','interval'],key);fields(row,['recoveryStreak'],key,0,2);
    fields(row,['ef'],key,1.3,Number.MAX_SAFE_INTEGER,false);fields(row,['sm2DayQuality'],key,0,5);
    if(row.sm2DayBase!=null){
      if(!object(row.sm2DayBase))throw new Error('백업 복습 기록 형식이 올바르지 않습니다: '+key);
      fields(row.sm2DayBase,['ef'],key+'.sm2DayBase',1.3,Number.MAX_SAFE_INTEGER,false);fields(row.sm2DayBase,['reps','interval'],key+'.sm2DayBase');
    }
    if(row.typedStats!=null){
      if(!object(row.typedStats))throw new Error('백업 타이핑 통계 형식이 올바르지 않습니다: '+key);
      fields(row.typedStats,['attempts','verifiedAttempts'],key+'.typedStats');
      fields(row.typedStats,['avgScore','avgScoreVerified','bestScore'],key+'.typedStats',0,100,false);
      fields(row.typedStats,['trend'],key+'.typedStats',-100,100,false);fields(row.typedStats,['rubricVersionAtLast'],key+'.typedStats',1);
    }
    if(row.typedAttempts!=null){
      if(!Array.isArray(row.typedAttempts)||row.typedAttempts.some(a=>!object(a)))throw new Error('백업 타이핑 답안 기록 형식이 올바르지 않습니다: '+key);
      for(const attempt of row.typedAttempts){
        fields(attempt,['score'],key+'.typedAttempts',0,100,false);fields(attempt,['durationSec'],key+'.typedAttempts');fields(attempt,['rubricVersion'],key+'.typedAttempts',1);
      }
    }
  };
  for(const [key,raw] of entries){
    let value,prior;try{value=JSON.parse(raw)}catch(e){
      if(/^md_state_|^md_focus_history_|^md_nav23_pass_progress_v1$/.test(key))throw new Error('백업 학습 데이터 형식이 올바르지 않습니다: '+key);
      normalized.push([key,raw]);
      continue;
    }
    if(/^md_state_/.test(key)){
      if(!object(value)||!object(value.boxes)||Object.values(value.boxes).some(row=>!object(row)))throw new Error('백업 문제별 학습 기록을 확인할 수 없습니다: '+key);
      for(const [id,row] of Object.entries(value.boxes))normalizeBox(row,key+'.boxes.'+id);
    }
    if(key==='md_nav23_pass_progress_v1'&&(!object(value)||Object.values(value).some(row=>!object(row))))throw new Error('백업 합격 플랜 진도 형식이 올바르지 않습니다.');
    if(key==='md_nav23_pass_progress_v1')for(const [id,row] of Object.entries(value)){
      const path=key+'.'+id;fields(row,counts,path);fields(row,['_counterVersion'],path,1);
      if(row._counterBase!==undefined){
        if(!object(row._counterBase))throw new Error('백업 누적 진도 형식이 올바르지 않습니다: '+path);
        fields(row._counterBase,counts,path+'._counterBase');
      }
      if(row._counterComponents!==undefined){
        if(!object(row._counterComponents)||Object.values(row._counterComponents).some(c=>!object(c)))throw new Error('백업 기기별 진도 형식이 올바르지 않습니다: '+path);
        for(const [device,c] of Object.entries(row._counterComponents))fields(c,counts,path+'._counterComponents.'+device);
      }
    }
    if(/^md_focus_history_/.test(key)&&(!Array.isArray(value)||value.some(row=>!object(row)||!Array.isArray(row.ids))))throw new Error('백업 집중 학습 기록 형식이 올바르지 않습니다.');
    if(/^md_focus_history_/.test(key))for(const row of value){
      fields(row,['ts'],key,0,8640000000000000);fields(row,['dayNum','replayCount'],key);
    }
    normalized.push([key,/^md_state_|^md_focus_history_|^md_nav23_pass_progress_v1$/.test(key)?JSON.stringify(value):raw]);
    try{prior=JSON.parse(before[key])}catch(e){continue}
    if((object(prior)&&!object(value))||(Array.isArray(prior)&&!Array.isArray(value)))throw new Error('기존 기록과 백업의 데이터 형식이 다릅니다: '+key);
  }
  return normalized;
}
function mergeImportedBackupEntries(entries,backup){
  // Imports add history to the live snapshot; exact restores use applyBackupSnapshot.
  const api=window.__mdDriveSyncV2;
  if(!api)throw new Error('백업 병합 기능을 불러오지 못했습니다.');
  const before=collectBackupItems(),state=driveSyncLoadState();
  const normalizedEntries=validateImportedBackupEntries(entries,before);
  const stateRaw=localStorage.getItem(DRIVE_SYNC_STATE_KEY);
  const imported=Object.fromEntries(normalizedEntries);
  const merged=api.mergeSnapshots(before,imported,state.itemMeta||{},{},state.localUpdatedAt||driveSyncNowIso(),backup.exportedAt||'1970-01-01T00:00:00.000Z');
  // Match the storage hook's canonical legacy identities before checking writes.
  for(const [key,raw] of Object.entries(merged.items)){
    if(!/^md_focus_history_/.test(key))continue;
    const rows=JSON.parse(raw);
    if(Array.isArray(rows))merged.items[key]=JSON.stringify(rows.map(row=>{
      if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.sessionId==='string'&&row.sessionId)return row;
      return {...row,sessionId:api.historySessionId(row)};
    }));
  }
  try{
    for(const [key,value] of Object.entries(merged.items)){
      if(before[key]!==value&&!safeStorageSet(key,value,'백업 병합'))throw new Error('백업 병합 저장에 실패했습니다.');
    }
    if(api.stable(collectBackupItems())!==api.stable(merged.items))throw new Error('백업 병합 결과를 확인하지 못했습니다.');
    return entries.length;
  }catch(error){
    // Preserve change metadata as well as values when an import only partly writes.
    let recovered=false;
    driveSyncApplyingRemote=true;
    try{
      applyBackupSnapshot(Object.entries(before),'백업 병합 실패 복구');
      recovered=api.stable(collectBackupItems())===api.stable(before);
      if(recovered){if(stateRaw===null)localStorage.removeItem(DRIVE_SYNC_STATE_KEY);else localStorage.setItem(DRIVE_SYNC_STATE_KEY,stateRaw);}
    }finally{driveSyncApplyingRemote=false;}
    throw new Error((error.message||String(error))+(recovered?' 가져오기 전 기록을 복구했습니다.':' 일부 기록을 복구하지 못했습니다. 저장 공간·권한을 확인한 뒤 가져오기 전 자동 복구 지점으로 되돌려 주세요.'));
  }
}
'''
    if 'function mergeImportedBackupEntries(entries,backup)' not in text:
        replace('function importAllLearningData(){', helper + 'function importAllLearningData(){')
    else:
        start=text.index('function validateImportedBackupEntries(') if 'function validateImportedBackupEntries(' in text else text.index('function mergeImportedBackupEntries(')
        end=text.index('function importAllLearningData(){',start)
        text=text[:start]+helper+text[end:]
    replace("          const restored=applyBackupEntries(entries,'백업 복원');\n          alert(`학습 데이터 ${restored}개를 복원했습니다. 앱을 다시 불러옵니다.`);\n          location.reload();",
            """          try{
            const restored=mergeImportedBackupEntries(entries,backup);
            alert(`학습 데이터 ${restored}개를 기존 기록과 병합했습니다. 앱을 다시 불러옵니다.`);
            location.reload();
          }catch(error){alert('백업 병합을 완료하지 못했습니다: '+(error.message||error));}""")

    replace("  function ppSaveProgress(progress){safeStorageSet(PROGRESS_KEY,JSON.stringify(progress),'합격 플랜 진도')}",
            "  function ppSaveProgress(progress){return safeStorageSet(PROGRESS_KEY,JSON.stringify(progress),'합격 플랜 진도')}")
    start=text.index('  function ppCommitOutcome(q,answer,confidence){')
    end=text.index('  window.prevNavigatorPassPlanQuestion=', start)
    body=text[start:end]
    prefix="""    // homework-save-guard-v2: checkpoint occurrence identities survive queue filtering.
    const commitId=planSessionCommitIds[planSessionIdx]||(planSessionCommitIds[planSessionIdx]=window.__mdLearningIntegrity.getDeviceId()+'|'+planSessionStartedAt+'|'+planSessionIdx);
    const commitIds=Array.isArray(r.homeworkCommitIds)?r.homeworkCommitIds.filter(v=>typeof v==='string'):[];
    if(r.lastHomeworkCommitId===commitId||commitIds.includes(commitId))return true;
    let removeWrong=false;
    window.__mdLearningIntegrity.initializeCounters(r);const oldMasteryReviews=Number(r.masteryReviews)||0;"""
    if 'homework-save-guard-v1' in body:
        begin=body.index('    // homework-save-guard-v1:')
        finish=body.index('    const priorConfirmed=',begin)
        body=body[:begin]+prefix+'\n'+body[finish:]
        body=body.replace('    r.lastHomeworkCommitId=commitId;progress[q._planKey]=r;', '    r.lastHomeworkCommitId=commitId;r.homeworkCommitIds=commitIds.concat(commitId).slice(-64);progress[q._planKey]=r;')
        text=text[:start]+body+text[end:]
    elif 'homework-save-guard-v2' not in body:
        body=body.replace("    window.__mdLearningIntegrity.initializeCounters(r);const oldMasteryReviews=Number(r.masteryReviews)||0;",
                         prefix)
        body=body.replace('        removePastWrong(pqid(q));', '        removeWrong=true;')
        body=body.replace('      if(!correct)addPastWrong(q,answer);', '')
        body=body.replace('    progress[q._planKey]=r;ppSaveProgress(progress);',
                          """    r.lastHomeworkCommitId=commitId;r.homeworkCommitIds=commitIds.concat(commitId).slice(-64);progress[q._planKey]=r;
    if(!ppSaveProgress(progress))return false;
    if(removeWrong)removePastWrong(pqid(q));else if(!correct)addPastWrong(q,answer);
    return true;""")
        text=text[:start]+body+text[end:]
    replace('      ppCommitOutcome(q,answer,confidence);planSessionCommitted.add(planSessionIdx);',
            '      if(!ppCommitOutcome(q,answer,confidence))return;planSessionCommitted.add(planSessionIdx);')

    # IDs are aligned with the saved queue, including inserted recall occurrences.
    replace('  let planSessionConfidence=[];', '  let planSessionConfidence=[];\n  let planSessionCommitIds=[];')
    replace('        confidence:Array.isArray(planSessionConfidence)?planSessionConfidence.slice():[],',
            '        confidence:Array.isArray(planSessionConfidence)?planSessionConfidence.slice():[],\n        commitIds:planSessionCommitIds.slice(),')
    replace('    planSessionConfidence.splice(insertAt,0,null);', '    planSessionConfidence.splice(insertAt,0,null);\n    planSessionCommitIds.splice(insertAt,0,null);')
    for old,new in [
        ('planSessionConfidence=new Array(queue.length).fill(null);', 'planSessionConfidence=new Array(queue.length).fill(null);planSessionCommitIds=new Array(queue.length).fill(null);'),
        ('planSessionConfidence=new Array(planSessionQueue.length).fill(null);', 'planSessionConfidence=new Array(planSessionQueue.length).fill(null);planSessionCommitIds=new Array(planSessionQueue.length).fill(null);'),
        ('planSessionConfidence=[];planSessionCommitted=new Set();', 'planSessionConfidence=[];planSessionCommitIds=[];planSessionCommitted=new Set();'),
    ]:
        text=text.replace(new,old).replace(old,new)
    replace("              if(cv===null||['sure','unsure','wrong'].includes(cv))planSessionConfidence[newIdx]=cv;",
            "              if(cv===null||['sure','unsure','wrong'].includes(cv))planSessionConfidence[newIdx]=cv;\n              planSessionCommitIds[newIdx]=Array.isArray(checkpoint.commitIds)&&typeof checkpoint.commitIds[oldIdx]==='string'?checkpoint.commitIds[oldIdx]:window.__mdLearningIntegrity.getDeviceId()+'|'+(Number(checkpoint.startedAt)||0)+'|'+oldIdx;")
    replace("    planSessionConfidence[planSessionIdx]=i===q['정답']?'sure':'wrong';",
            "    planSessionConfidence[planSessionIdx]=i===q['정답']?'sure':'wrong';\n    if(!planSessionCommitIds[planSessionIdx])planSessionCommitIds[planSessionIdx]=window.__mdLearningIntegrity.getDeviceId()+'|'+planSessionStartedAt+'|'+planSessionIdx;")

    replace("      safeStorageSet(PROGRESS_KEY,'{}','합격 플랜 진도');safeStorageSet(DAILY_KEY,'{}','합격 플랜 오늘 숙제');ppClearPassSessionCheckpoint();",
            "      if(!window.__mdDriveSyncV2.resetKey(PROGRESS_KEY,'{}','합격 플랜 진도'))return;safeStorageSet(DAILY_KEY,'{}','합격 플랜 오늘 숙제');ppClearPassSessionCheckpoint();")
    replace("hist.unshift({ts:Date.now(),subjectId:", "hist.unshift({sessionId:driveSyncNewDeviceId(),ts:Date.now(),subjectId:")
    replace("()=>{saveFocusHistory([]);renderHome();}", "()=>{if(!window.__mdDriveSyncV2.resetKey(focusHistoryKey(),'[]','집중 학습 기록'))return;renderHome();}")
    # Legacy generators retain their anchors and can append this sentence and
    # spacer lines on every rebuild. Keep the checked-in final artifact stable.
    spacing_note='세션 끝부분은 최소 15문제 간격을 확보하고, 여유가 없으면 다음 날 재확인합니다.'
    text=re.sub(re.escape(spacing_note)+r'(?:\s+'+re.escape(spacing_note)+r')+',spacing_note,text)
    for anchor in ['  const ppBuildTodayAssignmentBeforeSubjectBalance=', '  window.startNavigatorWeakDrill=']:
        text=re.sub(r'\n{3,}(?='+re.escape(anchor)+r')','\n\n',text)
    text=re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.21';", text, count=1)
    text=re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>', '<title>Maritime Drill v5.21 · Android</title>', text, count=1)
    text=re.sub(r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>', lambda m: f'<script src="{m[1]}.js?v=5.21"></script>', text)
    return text


if __name__ == '__main__':
    p=Path('index.html')
    original=p.read_text(encoding='utf-8-sig')
    text=patch_html(original)
    if text!=original:
        p.write_text(text, encoding='utf-8')
    print('record-safety patch ready')
