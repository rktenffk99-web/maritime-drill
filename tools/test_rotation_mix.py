from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "assignmentPolicy:'grade-ratio-priority-v2'" in text, 'grade ratio priority assignment policy missing'
assert 'grade-ratio-priority-v2' in text, 'grade ratio priority marker missing'
assert 'const current2026Unseen=' in text, 'seen-but-unmastered 2026 items can still block stage2'
assert "label:'2단계 · 전범위 1회독 보장 + 최근 5개년 전체 + 취약 복습'" in text, 'stage2 coverage label missing'
assert 'const daysLeft=' in text and 'phase.dday+1' in text, 'deadline day calculation missing'
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in text, 'minimum daily new-question calculation missing'
assert 'const requiredNew=Math.min(cap,requestedNew);' in text, 'required new-question calculation missing'
assert 'const priority=ppPriorityProfile(plan,today);' in text, 'priority profile missing'
assert 'const quotas=ppAllocateNewSlots(requests,requiredNew);' in text, 'auto required-new allocation missing'
assert 'const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);' in text, 'manual full-cap ratio allocation missing'
assert 'const candidates=(phase.allRemaining||[])' in text, 'new selection must cover all unseen groups'
assert "PLAN_GRADES.some(g=>(requests[g]||0)>(newByGrade[g]||0))" in text, 'manual ratio coverage-risk signal missing'
assert 'const ordered=[];let ri=0,ni=0;' in text, 'review/new interleaving missing'
assert "rotationPolicy:'grade-ratio-priority-v2'" in text, 'assignment result policy missing'

m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert body.find('const phases=') < body.find('const due='), 'coverage demand should be computed before assignment allocation'
assert body.find("if(priority.mode==='auto')") < body.find('const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);'), 'auto and manual branches are ordered incorrectly'
manual_start=body.find('const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);')
manual_review=body.find('for(const item of due){',manual_start)
manual_new=body.find('for(const item of sortedNewCandidates(g))',manual_start)
assert manual_start>=0 and manual_review>manual_start and manual_new>manual_review, 'manual quota must take due reviews before new questions'
assert body.find('const ordered=') < body.find('return {keys:ordered.map'), 'mixed queue must be returned'

print('deadline coverage + full-day grade ratio rotation tests: PASS')
