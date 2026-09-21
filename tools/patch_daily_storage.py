"""Keep v5.12 storage fixes after all legacy app generators. Safe to rerun."""
from pathlib import Path
import re

p=Path('index.html');text=p.read_text(encoding='utf-8-sig');original=text
def replace(old,new):
    global text
    if new in text:return
    if old not in text:raise RuntimeError('missing daily-storage anchor: '+old[:100])
    text=text.replace(old,new)

text=re.sub(r"const APP_VERSION = '[^']+';","const APP_VERSION = '5.12';",text,count=1)
text=re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>','<title>Maritime Drill v5.12 · Android</title>',text,count=1)

# The save boundary also covers imports and automatic restore points.
replace('function safeStorageSet(key, value, label){\n  try{', 'function safeStorageSet(key, value, label){\n  try{\n    if(window.__mdDailyStorage)value=window.__mdDailyStorage.compactValue(key,value);')
replace('function driveSyncInit(){\n  driveSyncInstallStorageHooks();', 'function driveSyncInit(){\n  driveSyncInstallStorageHooks();\n  window.__mdDailyStorage.migrateLocal();')
replace('setTimeout(driveSyncInit,0);', "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',driveSyncInit,{once:true});else driveSyncInit();")

# Never include runtime question pools in an assignment returned to the cache.
replace('createdAt:Date.now(),phases,requests,requiredNew,', 'createdAt:Date.now(),requests,requiredNew,')
old="""  function ppLoadDaily(){
    try{const raw=localStorage.getItem(DAILY_KEY);return raw?JSON.parse(raw)||{}:{}}catch(e){return {}}
  }
  function ppSaveDaily(daily){safeStorageSet(DAILY_KEY,JSON.stringify(daily),'합격 플랜 오늘 숙제')}"""
new="""  let planDailySaveSucceeded=true;
  function ppLoadDaily(){
    try{
      const raw=localStorage.getItem(DAILY_KEY);if(!raw)return {};
      const next=window.__mdDailyStorage.compactValue(DAILY_KEY,raw);
      if(next!==raw)planDailySaveSucceeded=safeStorageSet(DAILY_KEY,next,'합격 플랜 오늘 숙제');
      return JSON.parse(next)||{};
    }catch(e){return {}}
  }
  function ppSaveDaily(daily){
    const compact=window.__mdDailyStorage.compactDaily(daily);
    planDailySaveSucceeded=safeStorageSet(DAILY_KEY,JSON.stringify(compact),'합격 플랜 오늘 숙제');
    return planDailySaveSucceeded;
  }"""
replace(old,new)
replace("    safeStorageSet(PLAN_KEY,JSON.stringify(plan),'2·3급 합격 플랜');", "    return safeStorageSet(PLAN_KEY,JSON.stringify(plan),'2·3급 합격 플랜');")
replace("    ppSavePlan(plan);const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);showToast('합격 플랜 설정을 저장했습니다.');renderNavigatorPassPlan(planEntrySubject);", "    if(!ppSavePlan(plan))return;const daily=ppLoadDaily();delete daily[today];if(!ppSaveDaily(daily))return;\n    await renderNavigatorPassPlan(planEntrySubject);\n    if(planDailySaveSucceeded)showToast('합격 플랜 설정을 저장했습니다.');")

# Give actionable error detail without recommending removal of learning data.
replace("  if(detail) detail.textContent=`${label||'학습 데이터'} 저장에 실패했습니다. 브라우저 저장공간과 개인정보 보호 설정을 확인한 뒤 다시 시도하세요.`;", """  const quota=error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED');
  const blocked=error&&error.name==='SecurityError';
  if(detail)detail.textContent=`${label||'학습 데이터'} 저장에 실패했습니다. `+(quota?'브라우저의 이 사이트 저장 공간이 가득 찼습니다. 기존 기록을 지우지 말고 전체 학습 데이터를 파일로 백업하세요.':blocked?'브라우저가 이 사이트의 저장을 차단했습니다. 사이트 데이터 저장 허용 설정을 확인하세요.':'기존 기록을 보존한 채 다시 시도하세요. 계속되면 오류 화면을 알려주세요.');""")
text=re.sub(r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>',lambda m:f'<script src="{m[1]}.js?v=5.12"></script>',text)
if text!=original:p.write_text(text,encoding='utf-8')
print('daily storage v5.12 patch applied')
