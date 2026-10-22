"""v5.22 successor to the historic spacing marker test; behavior is tested in JS."""
from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')
m=re.search(r"function ppCommitOutcome\(q,answer,confidence\)\{(.*?)\n  \}",text,re.S)
assert m, 'ppCommitOutcome missing'
body=m.group(1)
for needle in [
    'ppInitializeReviewSchedule(r)',
    'ppResetReviewSchedule(r,today)',
    'r.reviewSuccessDate!==today',
    '[1,5,7,14,21,30]',
    'ppReviewDueDate(today,interval,exam)',
    'ppReviewDueDate(today,2,exam)',
    "priorConfirmed===today&&r.mastered",
]:
    assert needle in body, f'recent-recall spacing rule missing: {needle}'
assert 'sureRate=' not in body, 'spacing still depends on lifetime accuracy'
assert "r.homeworkCommitIds=commitIds.concat(commitId).slice(-64)" in body
helper=re.search(r"function ppReviewDueDate\(today,interval,exam\)\{(.*?)\n  \}",text,re.S)
assert helper
for needle in ['if(dday<=7)days=Math.min(days,3)', 'else if(dday<=21)days=Math.min(days,7)', 'else if(dday<=44)days=Math.min(days,21)', 'else if(dday<=1)days=1']:
    assert needle in helper.group(1), f'exam-aware scheduling missing: {needle}'
assert 'function ppNextDayPending(rec,today)' in text
assert 'rec.sameDayConfirmedDate=null;' in text
assert "getEvidenceRevision()" in text
if "assignmentPolicy:'scheduler-v522'" in text:
    assert 'window.__mdSchedulerV522' in text
else:
    assert 'function ppBuildTodayAssignment(' in text
print('review spacing v5.22 policy checks: PASS; actual sequences covered by test_mastery_sessions_v522.js')
