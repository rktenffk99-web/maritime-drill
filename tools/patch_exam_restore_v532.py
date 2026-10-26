"""Explicit backup restoration gives active exams fresh identities."""
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'index.html'
s=p.read_text(encoding='utf-8-sig')
def replace(old,new):
 global s
 if new in s:return
 assert s.count(old)==1,old[:100]
 s=s.replace(old,new,1)
replace('function prepareExactBackupItems(entries){','function prepareExactBackupItems(entries,restoreExams=false){')
replace('''  let items=Object.fromEntries(validateImportedBackupEntries(entries,{}));
  if(window.__mdDailyStorage)''','''  let items=Object.fromEntries(validateImportedBackupEntries(entries,{}));
  if(restoreExams&&window.__mdExamSessions)items=window.__mdExamSessions.restoreItems(items);
  if(window.__mdDailyStorage)''')
replace('before=collectBackupItems();target=prepareExactBackupItems(entries);','before=collectBackupItems();target=prepareExactBackupItems(entries,true);')
replace('''  const imported=Object.fromEntries(normalizedEntries);
  const merged=api.mergeSnapshots''','''  let imported=Object.fromEntries(normalizedEntries);
  if(window.__mdExamSessions)imported=window.__mdExamSessions.restoreItems(imported);
  const merged=api.mergeSnapshots''')
replace('''${result.removed}개 정리 후 앱을 다시 불러옵니다.`);''','''${result.removed}개 정리 후 앱을 다시 불러옵니다. 진행 중 시험은 새 시험 번호로 복구됩니다.`);''')
replace('''${restored}개를 기존 기록과 병합했습니다. 앱을 다시 불러옵니다.`);''','''${restored}개를 기존 기록과 병합했습니다. 진행 중 시험은 새 시험 번호로 복구됩니다. 앱을 다시 불러옵니다.`);''')
p.write_text(s,encoding='utf-8')
print('explicit exam restore v5.32 integration ready')
