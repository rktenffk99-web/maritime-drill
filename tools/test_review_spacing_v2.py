from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "reviewSpacingPolicy:'review-spacing-v3-mastery-ladder'" in text, 'review spacing v3 policy marker missing'
assert "rotationPolicy:'knowledge-gap-priority-v4-dedupe'" in text, 'knowledge-gap priority missing'

m=re.search(r"function ppCommitOutcome\(q,answer,confidence\)\{(.*?)\n  \}",text,re.S)
assert m, 'ppCommitOutcome missing'
body=m.group(1)
assert "sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,2);" in body, 'confirmed correct item still returns next day'
assert "sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,1);" not in body, 'old next-day spacing remains'

# Long-term spacing must use repeated across-day mastery, not raw accuracy alone.
for needle in [
    'sureRate=Math.max(0,correctCount-unsureCount)/attempts',
    'reviews=Math.max(0,Number(r.masteryReviews)||0)',
    'reviews>=5&&attempts>=7&&sureRate>=0.90)interval=30;',
    'reviews>=4&&attempts>=6&&sureRate>=0.85)interval=21;',
    'reviews>=3&&attempts>=5&&sureRate>=0.80)interval=14;',
    'reviews>=2&&attempts>=4&&sureRate>=0.75)interval=7;',
    'else if(accuracy>=0.70)interval=5;',
]:
    assert needle in body, f'mastery spacing ladder missing: {needle}'

# Exam proximity compresses long intervals again.
for needle in [
    'const dday=ppDiffDays(today,exam);',
    'if(dday<=7)interval=Math.min(interval,3);',
    'else if(dday<=21)interval=Math.min(interval,7);',
    'else if(dday<=44)interval=Math.min(interval,21);',
]:
    assert needle in body, f'exam spacing cap missing: {needle}'

# Selection order must keep strong mastered reviews at the back of the queue policy.
b=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{(.*?)\n  \}(?=\n  // subject-balanced-homework-v1|\n  function ppGetItemByKey)",text,re.S)
assert b, 'assignment builder missing'
bb=b.group(1)
assert 'const strongDue=due.filter(item=>reviewTier(item)===0);' in bb
assert bb.find('for(const item of weakDue)') < bb.find('for(const item of normalDue)') < bb.find('for(const item of strongDue)'), 'review priority order incorrect'
assert 'globalNewRows()' in bb, 'unseen fill path missing'

print('review spacing v3 + unseen/weak priority checks: PASS')
