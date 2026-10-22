from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

# Model + persistence
assert "priorityMode:'auto'" in text
assert 'priorityNavi3Pct:80' in text
assert "base.priorityMode=priorityModes.has" in text
assert 'base.priorityNavi3Pct=Math.max(0,Math.min(100' in text

# UI + copy
for label in ['학습 우선순위','자동 추천','3급 우선','2급 우선','직접 설정']:
    assert label in text, f'priority UI label missing: {label}'
assert 'name="pp-priority-mode"' in text
assert 'id="pp-priority-navi3-pct"' in text
assert 'toggleNavigatorPassPlanPriorityCustom' in text
assert "plan.priorityMode=['auto','navi3','navi2','custom'].includes" in text
assert 'delete daily[today];ppSaveDaily(daily)' in text
assert '급수 비율은 기본문항에 적용' in text
assert '7일 이상 연체를 우선' in text

# Grade ratios and review/new ordering are exercised against the actual scheduler.
import subprocess
assert '// scheduler-v522-adapter:start' in text
subprocess.run(['node','tools/test_scheduler_v522.js'],check=True)

# Recent independent recalls determine spacing; cumulative totals remain historical statistics.
commit=re.search(r"function ppCommitOutcome\(q,answer,confidence\)\{.*?\n  \}",text,re.S)
assert commit, 'commit outcome missing'
c=commit.group(0)
assert 'ppInitializeReviewSchedule(r)' in c
assert 'ppResetReviewSchedule(r,today)' in c
assert 'r.reviewSuccessDate!==today' in c
assert '[1,5,7,14,21,30]' in c
assert 'ppReviewDueDate(today,interval,exam)' in c
assert 'sureRate=' not in c, 'lifetime accuracy must not trap recent recovery or override a new lapse'

# Grade ratio stays exact.
helper=re.search(r"function ppPriorityProfile\(plan,today\)\{.*?\n  \}",text,re.S)
assert helper
h=helper.group(0)
assert "mode==='navi3'" in h and 'navi2:20,navi3:80' in h and '전체 숙제 20:80' in h
assert "mode==='navi2'" in h and 'navi2:80,navi3:20' in h and '전체 숙제 80:20' in h
assert "mode==='custom'" in h and '100-navi3' in h

def quota(total,n2,n3):
    s=n2+n3
    q2=int(total*n2//s); q3=int(total*n3//s)
    rest=total-q2-q3
    order=['navi3','navi2'] if n3>=n2 else ['navi2','navi3']
    out={'navi2':q2,'navi3':q3}
    for i in range(rest): out[order[i%len(order)]]+=1
    return out
assert quota(190,10,90)=={'navi2':19,'navi3':171}

print('grade priority + knowledge-gap ordering checks: PASS')
