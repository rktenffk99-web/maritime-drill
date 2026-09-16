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

# Allocation semantics: mandatory deadline coverage first, manual priority only on flexible slots.
m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert 'const priority=ppPriorityProfile(plan,today);' in body
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in body
assert 'const requiredNew=Math.min(cap,requestedNew);' in body
assert "if(requestedNew>cap&&priority.mode!=='auto')" in body, 'priority may not distort feasible mandatory coverage'
assert 'const quotas=ppAllocateNewSlots(quotaRequests,requiredNew);' in body
assert "if(priority.mode==='auto')" in body, 'automatic allocation compatibility branch missing'
assert "priority.mode!=='auto'" in body, 'manual flexible allocation branch missing'
assert 'const flexQuotas=ppPriorityFlexQuotas(plan,today,fill);' in body
assert 'priorityLabel:priority.label' in body
assert "rotationPolicy:'deadline-coverage-priority-v1'" in body

# Presets are deliberately simple and understandable: flexible slots 80:20.
helper=re.search(r"function ppPriorityProfile\(plan,today\)\{.*?\n  \}",text,re.S)
assert helper, 'priority helper missing'
h=helper.group(0)
assert "mode==='navi3'" in h and 'navi2:20,navi3:80' in h
assert "mode==='navi2'" in h and 'navi2:80,navi3:20' in h
assert "mode==='custom'" in h and '100-navi3' in h

print('grade priority checks: PASS')
