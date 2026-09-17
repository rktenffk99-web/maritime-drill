from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

# Model + persistence
assert "priorityMode:'auto'" in text, 'default priority mode missing'
assert 'priorityNavi3Pct:80' in text, 'default custom ratio missing'
assert "base.priorityMode=priorityModes.has" in text, 'saved priority mode is not loaded'
assert 'base.priorityNavi3Pct=Math.max(0,Math.min(100' in text, 'saved custom ratio is not clamped'

# UI
for label in ['학습 우선순위','자동 추천','3급 우선','2급 우선','직접 설정']:
    assert label in text, f'priority UI label missing: {label}'
assert 'name="pp-priority-mode"' in text, 'priority radio group missing'
assert 'id="pp-priority-navi3-pct"' in text, 'custom navi3 percentage control missing'
assert 'toggleNavigatorPassPlanPriorityCustom' in text, 'custom ratio visibility handler missing'
assert "plan.priorityMode=['auto','navi3','navi2','custom'].includes" in text, 'priority mode save logic missing'
assert 'delete daily[today];ppSaveDaily(daily)' in text, 'saving priority must invalidate today assignment cache'
assert '배분 기준: ${escapeHtml(assignment.priorityLabel' in text, 'today assignment priority summary missing'
assert "assignment.priorityMode==='auto'?'필수 신규량 우선':'설정 비율 우선'" in text, 'manual ratio rule is not shown on homework card'
assert '하루 전체 숙제를 선택 비율로 배분' in text, 'settings help must explain full-day ratio semantics'

# Allocation semantics: auto keeps deadline coverage; manual applies ratio to the whole daily cap.
m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert 'const priority=ppPriorityProfile(plan,today);' in body
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in body
assert 'const requiredNew=Math.min(cap,requestedNew);' in body
assert "if(priority.mode==='auto')" in body, 'automatic allocation compatibility branch missing'
assert 'const quotas=ppAllocateNewSlots(requests,requiredNew);' in body, 'auto mode must still reserve deadline-required new questions'
assert 'const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);' in body, 'manual mode must allocate the whole daily cap by grade ratio'
assert '190문제에서 2급 10% / 3급 90%라면 목표는 19 / 171문제' in body, '10:90 regression example missing'
assert '각 급수 쿼터 안에서는 기한도래 복습을 먼저 넣고, 남는 자리를 신규로 채운다.' in body, 'manual grade quota order must be review then new'
assert "priority.mode==='auto'?null:ppPriorityFlexQuotas(plan,today,cap)" in body, 'manual quota target metadata missing'
assert 'quotaTarget:totalQuotas' in body
assert 'gradeCounts:{navi2:' in body
assert 'priorityLabel:priority.label' in body
assert "rotationPolicy:'grade-ratio-priority-v2'" in body
assert "assignmentPolicy:'grade-ratio-priority-v2'" in text

# Presets remain 80:20, but now refer to the whole homework set.
helper=re.search(r"function ppPriorityProfile\(plan,today\)\{.*?\n  \}",text,re.S)
assert helper, 'priority helper missing'
h=helper.group(0)
assert "mode==='navi3'" in h and 'navi2:20,navi3:80' in h and '전체 숙제 20:80' in h
assert "mode==='navi2'" in h and 'navi2:80,navi3:20' in h and '전체 숙제 80:20' in h
assert "mode==='custom'" in h and '100-navi3' in h

# Helper rounding regression: 190 at 10:90 must be exactly 19 / 171.
def quota(total,n2,n3):
    s=n2+n3
    q2=int(total*n2//s)
    q3=int(total*n3//s)
    rest=total-q2-q3
    order=['navi3','navi2'] if n3>=n2 else ['navi2','navi3']
    out={'navi2':q2,'navi3':q3}
    for i in range(rest):
        out[order[i%len(order)]]+=1
    return out
assert quota(190,10,90)=={'navi2':19,'navi3':171}

print('grade priority full-day ratio checks: PASS')
