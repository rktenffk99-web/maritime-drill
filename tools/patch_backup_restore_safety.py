"""Validate structured backups and verify automatic restores before success."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'index.html'
text = path.read_text(encoding='utf-8-sig')


def replace(old, new):
    global text
    if new in text:
        return
    if text.count(old) != 1:
        raise RuntimeError('missing or ambiguous backup safety anchor: ' + old[:100])
    text = text.replace(old, new, 1)


replace("""  return Object.entries(backup.items).filter(([key,value])=>isManagedStorageKey(key)&&typeof value==='string');""", """  const entries=[];
  for(const [key,value] of Object.entries(backup.items)){
    if(!isManagedStorageKey(key))continue;
    if(typeof value!=='string')throw new Error('백업 저장 항목 형식이 올바르지 않습니다: '+key);
    entries.push([key,value]);
  }
  return entries;""")

replace("""  for(const [key,value] of entries){
    if(safeStorageSet(key,value,label||'백업 복원')) restored++;
  }
  return restored;
}
function applyBackupSnapshot""", """  // Shrinking a later key can make room for an earlier growing replacement.
  const ordered=entries.map(([key,value])=>({key,value,delta:value.length-(localStorage.getItem(key)||'').length})).sort((a,b)=>a.delta-b.delta);
  for(const {key,value} of ordered){
    if(localStorage.getItem(key)===value||safeStorageSet(key,value,label||'백업 복원'))restored++;
  }
  return restored;
}
function applyBackupSnapshot""")

restore = """// backup-restore-transaction-v527
function restoreRawBackupValues(values){
  const hasSync=typeof driveSyncApplyingRemote!=='undefined',previous=hasSync?driveSyncApplyingRemote:false;
  if(hasSync)driveSyncApplyingRemote=true;
  try{
    const operations=[...values].map(([key,value])=>({key,value,before:localStorage.getItem(key)}));
    operations.sort((a,b)=>(a.value===null?-Infinity:a.value.length-(a.before||'').length)-(b.value===null?-Infinity:b.value.length-(b.before||'').length));
    for(const {key,value,before} of operations){
      if(value===before)continue;
      if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
    }
    return [...values].every(([key,value])=>localStorage.getItem(key)===value);
  }catch(error){console.warn('[backup] rollback incomplete',error);return false}
  finally{if(hasSync)driveSyncApplyingRemote=previous}
}
function prepareExactBackupItems(entries){
  // An exact restore must also repair a corrupted current container shape.
  let items=Object.fromEntries(validateImportedBackupEntries(entries,{}));
  if(window.__mdDailyStorage)items=window.__mdDailyStorage.compactItems(items);
  const api=window.__mdDriveSyncV2;
  // The storage hook promotes legacy history identities. Verify that same shape.
  if(api)for(const [key,raw] of Object.entries(items))if(/^md_focus_history_/.test(key)){
    const rows=JSON.parse(raw);
    items[key]=JSON.stringify(rows.map(row=>typeof row.sessionId==='string'&&row.sessionId?row:{...row,sessionId:api.historySessionId(row)}));
  }
  return items;
}
function restoreAutomaticRestorePoint(){
  const point=readAutomaticRestorePoint();
  if(!point){alert('되돌릴 자동 복구 지점이 없습니다.');return}
  let entries;
  try{entries=validBackupEntries(point);prepareExactBackupItems(entries)}
  catch(error){alert('복구 지점을 확인하지 못했습니다: '+(error.message||error));return}
  showConfirm(`${backupDateLabel(point.exportedAt)}에 저장한 가져오기 전 상태(${entries.length}개)로 되돌릴까요?\\n현재 상태도 다시 자동 저장되어 한 번 더 되돌릴 수 있습니다.`,()=>{
    let before,target,values;
    try{
      before=collectBackupItems();target=prepareExactBackupItems(entries);
      values=new Map([...new Set([...Object.keys(before),...Object.keys(target),RESTORE_POINT_KEY,'md_drive_sync_state_v1'])].map(key=>[key,localStorage.getItem(key)]));
    }catch(error){alert('복구 준비에 실패했습니다: '+(error.message||error));return}
    if(!writeAutomaticRestorePoint(before,'before-restore-point')){
      alert('현재 상태를 안전하게 저장하지 못해 되돌리기를 취소했습니다.');return;
    }
    try{
      const result=applyBackupSnapshot(Object.entries(target),'자동 복구'),actual=collectBackupItems();
      if(Object.keys(actual).length!==Object.keys(target).length||Object.entries(target).some(([key,value])=>actual[key]!==value))throw new Error('일부 저장 항목을 복원하지 못했습니다.');
      alert(`이전 상태로 되돌렸습니다. ${result.restored}개 복원 · ${result.removed}개 정리 후 앱을 다시 불러옵니다.`);
      location.reload();
    }catch(error){
      const recovered=restoreRawBackupValues(values);
      alert('자동 복구를 완료하지 못했습니다: '+(error.message||error)+(recovered?' 복구 시도 전 기록을 그대로 보존했습니다.':' 일부 기록의 되돌리기에도 실패했습니다. 이 화면을 닫지 말고 전체 백업 파일을 저장하세요.'));
    }
  });
}
"""
if '// backup-restore-transaction-v527' not in text:
    start = text.index('function restoreAutomaticRestorePoint(){')
    end = text.index('async function exportAllLearningData(){', start)
    text = text[:start] + restore + text[end:]

replace("""  for(const [key,raw] of entries){
    let value,prior;try{value=JSON.parse(raw)}catch(e){
      if(/^md_state_|^md_focus_history_|^md_nav23_pass_progress_v1$/.test(key))throw new Error('백업 학습 데이터 형식이 올바르지 않습니다: '+key);
      normalized.push([key,raw]);
      continue;
    }
    if(/^md_state_/.test(key)){""", """  const objectKeys=new Set(['md_nav23_pass_progress_v1','md_nav23_pass_plan_v1','md_nav23_pass_daily_v1','md_past_wrongs_v1','md_past_marks_v1','md_past_history_v1','md_past_progress_v1','md_past_progress_meta_v1','md_past_checkpoint_v2','md_pass_plan_session_checkpoint_v2','md_evaluation_score_history_v1','md_predictive_mock_history_v2','md_predictive_mock_fingerprint_history_v1','md_weak_topic_profile_v1','md_evaluation_mock_exposure_v1','md_mock_exposure_v1']);
  for(const [key,raw] of entries){
    let value,prior;try{prior=JSON.parse(before[key])}catch(e){}
    const wantsObject=objectKeys.has(key)||/^md_state_/.test(key),wantsArray=key==='md_problem_reports_v1'||key==='md_predictive_mock_history_v1'||/^md_focus_history_/.test(key);
    try{value=JSON.parse(raw)}catch(e){
      if(wantsObject||wantsArray||object(prior)||Array.isArray(prior))throw new Error('백업 학습 데이터 형식이 올바르지 않습니다: '+key);
      normalized.push([key,raw]);continue;
    }
    if((wantsObject&&!object(value))||(wantsArray&&!Array.isArray(value)))throw new Error('백업 저장 항목 형식이 올바르지 않습니다: '+key);
    if((object(prior)&&!object(value))||(Array.isArray(prior)&&!Array.isArray(value)))throw new Error('기존 기록과 백업의 데이터 형식이 다릅니다: '+key);
    if(key==='md_problem_reports_v1'&&value.some(row=>!object(row)||(row.tags!==undefined&&!Array.isArray(row.tags))))throw new Error('백업 문제 신고 형식이 올바르지 않습니다.');
    if((key==='md_past_wrongs_v1'||key==='md_past_marks_v1')&&Object.values(value).some(row=>!object(row)||!object(row.q)||!Array.isArray(row.q['선택지'])))throw new Error('백업 오답·북마크 문항 형식이 올바르지 않습니다.');
    if(/^md_state_/.test(key)){""")

path.write_text(text, encoding='utf-8')
print('backup validation and verified restore integration ready')
