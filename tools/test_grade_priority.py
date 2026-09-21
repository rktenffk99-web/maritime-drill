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
assert '하루 전체 숙제를 선택 비율로 배분' in text
assert '틀렸거나 불확실한 문제 → 아직 안 본 신규 문제 → 일반 복습 → 정답률 높은 숙달 문제' in text

m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert 'knowledge-gap-priority-v4-dedupe' in body
assert 'const priority=ppPriorityProfile(plan,today);' in body
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in body
assert 'const requiredNew=Math.min(cap,requestedNew);' in body
assert 'function reviewTier(item)' in body
assert "r.status==='weak'" in body and "r.lastOutcome==='wrong'" in body and "r.lastOutcome==='unsure'" in body
assert 'const weakDue=' in body and 'const normalDue=' in body and 'const strongDue=' in body
assert "if(priority.mode==='auto')" in body
assert 'const quotas=ppAllocateNewSlots(requests,requiredNew);' in body
assert 'const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);' in body
assert 'takeReviewList(weakDue,g,target,used);' in body
assert 'for(const item of sortedNewCandidates(g))' in body
assert 'takeReviewList(normalDue,g,target,used);' in body
assert 'takeReviewList(strongDue,g,target,used);' in body
manual_start=body.index('const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);')
assert body.index('takeReviewList(weakDue,g,target,used);',manual_start) < body.index('for(const item of sortedNewCandidates(g))',manual_start) < body.index('takeReviewList(normalDue,g,target,used);',manual_start) < body.index('takeReviewList(strongDue,g,target,used);',manual_start)
assert 'const deferredStrongReviewCount=' in body
assert 'deferredStrongReviewCount,rotationPolicy:' in body
assert "rotationPolicy:'knowledge-gap-priority-v4-dedupe'" in body
assert "assignmentPolicy:'knowledge-gap-priority-v4-dedupe'" in text

# High-accuracy mastered questions get longer intervals.
commit=re.search(r"function ppCommitOutcome\(q,answer,confidence\)\{.*?\n  \}",text,re.S)
assert commit, 'commit outcome missing'
c=commit.group(0)
assert 'accuracy>=0.90' in c and 'interval=14' in c
assert 'accuracy>=0.80' in c and 'interval=7' in c
assert 'accuracy>=0.70' in c and 'interval=5' in c

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
