from pathlib import Path
import re, json, sys

src=Path('index.html').read_text(encoding='utf-8-sig')
issues=[]
notes=[]

def count(s): return src.count(s)
def require_once(s,label=None):
    c=count(s)
    if c!=1: issues.append(f'{label or s}: expected once, found {c}')

for s in [
    'function ppProgressFor(progress,key)',
    'function ppCommitOutcome(q,answer,confidence)',
    'window.startNavigatorPassPlanToday=async function()',
    'window.startNavigatorWeakDrill=async function(kind)',
    'window.renderNavigatorPassPlanResult=function()',
    'window.prevNavigatorPassPlanQuestion=function()',
    'window.nextNavigatorPassPlanQuestion=function()',
    'window.chooseNavigatorPassPlanAnswer=function(i)',
]: require_once(s)

# Daily cap/default and settings occurrences
for pat in [r'dailyCap[^\n]{0,120}', r'Number\(plan\.dailyCap\)[^\n]{0,100}', r'dailyCap\s*:\s*\d+']:
    vals=re.findall(pat,src)
    notes.append(f'{pat}: {vals[:20]}')

# Policy markers
markers={
 'same_day_clear':'function ppTodayCleared(rec,today){return !!(rec&&rec.sameDayConfirmedDate===today)}',
 '2026_policy':"assignmentPolicy:'2026-unmastered-priority-v2'",
 'today_wrong':'오늘 오답 다시 풀기',
 'frequent_wrong':'자주 틀리는 문제',
 'checkpoint_v2':"md_pass_plan_session_checkpoint_v2",
 'predictive_mock':'startNavigatorPassPlanPredictiveMock',
}
for k,v in markers.items(): notes.append(f'{k}={count(v)}')

# Is there an automatic delayed same-day recheck inside the base daily queue?
# We look for queue duplication / confirmation injection patterns. The current implementation
# should be called out if confirmation only happens through a separate retry action.
auto_recheck_patterns=[
    r'planSessionQueue\.(?:push|splice)\(',
    r'(?:confirm|sameDay).*queue',
    r'30\s*[-~]\s*50',
    r'confirmation.*(?:delay|distance|after)',
]
auto_hits=[]
for pat in auto_recheck_patterns:
    auto_hits.extend(re.findall(pat,src,re.I))
notes.append(f'auto_same_day_recheck_hits={auto_hits[:20]}')
if not auto_hits:
    issues.append('No clear automatic delayed same-day recheck injection detected; first correct appears to remain unresolved until a separate retry/review flow.')

# Frequent-wrong retirement: lifetime wrong>=2 without a recovery threshold means list can become permanent.
if "filter(item=>(Number(ppProgressFor(progress,item.key).wrong)||0)>=2)" in src:
    issues.append('Frequent-wrong selector uses lifetime wrong>=2 only; recovered/mastered items can remain in this list indefinitely.')

# Today-wrong clear semantics
if "if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today" in src:
    notes.append('today-wrong review is cleared after a correct sure answer in the dedicated today-wrong session.')

# Ensure focus sessions do not overwrite daily checkpoint
if "if(planSessionKind!=='today'){localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return}" not in src:
    issues.append('Focused-drill checkpoint isolation marker missing.')

# Check that previous navigation cannot double commit
if 'planSessionCommitted.has(planSessionIdx)' not in src:
    issues.append('No planSessionCommitted guard found around answer commit.')

# Check visible mastery copy against actual semantics
copy='첫 정답은 학습 중 · 같은 날 한 번 더 맞히면 오늘 확인 완료 · 다음 날짜에 다시 맞히면 숙달됩니다.'
if copy not in src: issues.append('Expected mastery-rule copy missing.')

# Look for old contradictory copy
old_copies=[
 '같은 날 여러 번 맞혀도 숙달로 올리지 않습니다.',
 '첫 정답+확실 → 당일 통과, 다음 날 다시 출제',
]
for x in old_copies:
    if x in src: notes.append(f'legacy_copy_present: {x}')

# Basic script-tag sanity
opens=len(re.findall(r'<script\b',src,re.I)); closes=len(re.findall(r'</script>',src,re.I))
notes.append(f'script_tags open={opens} close={closes}')
if opens!=closes: issues.append(f'script tag mismatch {opens}!={closes}')

print('=== PASS PLAN DEEP AUDIT ===')
print('\n'.join(notes))
print('--- ISSUES ---')
if issues:
    for i,x in enumerate(issues,1): print(f'{i}. {x}')
else:
    print('NONE')
print('ISSUE_COUNT',len(issues))
