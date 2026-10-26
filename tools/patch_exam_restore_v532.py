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
# A verified explicit restore/import replaces durable state. Reload must not run
# the previous screen's autosave against that replacement; do not complete or
# delete the live exam, since that would create a new tombstone after restore.
replace("""      alert(`이전 상태로 되돌렸습니다. ${result.restored}개 복원 · ${result.removed}개 정리 후 앱을 다시 불러옵니다. 진행 중 시험은 새 시험 번호로 복구됩니다.`);
      location.reload();""","""      alert(`이전 상태로 되돌렸습니다. ${result.restored}개 복원 · ${result.removed}개 정리 후 앱을 다시 불러옵니다. 진행 중 시험은 새 시험 번호로 복구됩니다.`);
      const modeBeforeReload=currentMode;
      currentMode='backup-reloading'; // backup-reload-autosave-guard-v533
      try{location.reload()}catch(error){currentMode=modeBeforeReload;throw error;}""")
replace("""            alert(`학습 데이터 ${restored}개를 기존 기록과 병합했습니다. 진행 중 시험은 새 시험 번호로 복구됩니다. 앱을 다시 불러옵니다.`);
            location.reload();""","""            alert(`학습 데이터 ${restored}개를 기존 기록과 병합했습니다. 진행 중 시험은 새 시험 번호로 복구됩니다. 앱을 다시 불러옵니다.`);
            const modeBeforeReload=currentMode;
            currentMode='backup-reloading'; // backup-reload-autosave-guard-v533
            try{location.reload()}catch(error){currentMode=modeBeforeReload;throw error;}""")
p.write_text(s,encoding='utf-8')
print('explicit exam restore v5.32 integration ready')
