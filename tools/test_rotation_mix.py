from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "assignmentPolicy:'knowledge-gap-priority-v3'" in text, 'knowledge-gap assignment policy missing'
assert 'knowledge-gap-priority-v3' in text, 'knowledge-gap marker missing'
assert 'const current2026Unseen=' in text
assert "label:'2단계 · 전범위 1회독 보장 + 최근 5개년 전체 + 취약 복습'" in text
assert 'const daysLeft=' in text and 'phase.dday+1' in text
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in text
assert 'const requiredNew=Math.min(cap,requestedNew);' in text
assert 'const priority=ppPriorityProfile(plan,today);' in text
assert 'const quotas=ppAllocateNewSlots(requests,requiredNew);' in text
assert 'const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);' in text
assert 'const candidates=(phase.allRemaining||[])' in text
assert "PLAN_GRADES.some(g=>(requests[g]||0)>(newByGrade[g]||0))" in text
assert 'const ordered=[];let ri=0,ni=0;' in text
assert "rotationPolicy:'knowledge-gap-priority-v3'" in text

m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert body.find('const phases=') < body.find('const due=')
assert body.find("if(priority.mode==='auto')") < body.find('const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);')
manual_start=body.find('const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);')
weak=body.find('takeReviewList(weakDue,g,target,used);',manual_start)
new=body.find('for(const item of sortedNewCandidates(g))',manual_start)
normal=body.find('takeReviewList(normalDue,g,target,used);',manual_start)
strong=body.find('takeReviewList(strongDue,g,target,used);',manual_start)
assert manual_start>=0 and weak>manual_start and new>weak and normal>new and strong>normal, 'manual priority order must be weak -> unseen -> normal -> strong'
assert body.find('const ordered=') < body.find('return {keys:ordered.map')

print('deadline coverage + full-day ratio + knowledge-gap rotation tests: PASS')
