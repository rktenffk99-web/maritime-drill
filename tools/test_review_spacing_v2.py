from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "reviewSpacingPolicy:'review-spacing-v2'" in text, 'review spacing policy marker missing'
assert "rotationPolicy:'knowledge-gap-priority-v4-dedupe'" in text, 'knowledge-gap priority missing'

m=re.search(r"function ppCommitOutcome\(q,answer,confidence\)\{(.*?)\n  \}",text,re.S)
assert m, 'ppCommitOutcome missing'
body=m.group(1)
assert "sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,2);" in body, 'confirmed correct item still returns next day'
assert "sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,1);" not in body, 'old next-day spacing remains'
assert "if(attempts>=4&&accuracy>=0.90" in body and "interval=14" in body, 'high-accuracy mastered spacing missing'
assert "else if(attempts>=3&&accuracy>=0.80)interval=7;" in body, 'medium mastered spacing missing'

# Selection order must keep strong mastered reviews at the back of the queue policy.
b=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{(.*?)\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert b, 'assignment builder missing'
bb=b.group(1)
assert 'const strongDue=due.filter(item=>reviewTier(item)===0);' in bb
assert bb.find('for(const item of weakDue)') < bb.find('for(const item of normalDue)') < bb.find('for(const item of strongDue)'), 'review priority order incorrect'
assert 'globalNewRows()' in bb, 'unseen fill path missing'

print('review spacing + unseen/weak priority checks: PASS')
