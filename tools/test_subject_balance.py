from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')
POLICY='knowledge-gap-priority-v6-coverage-balanced'

for needle in [
    '// subject-balanced-homework-v1',
    "const PP_SUBJECT_BALANCE_POLICY='coverage-even-v2'",
    'function ppEvenSubjectQuotas(subjects,total,today)',
    'function ppBalanceSingleGradeSubjects(plan,pools,progress,today,assignment)',
    'activeGrades.length!==1',
    'const target=Math.min(cap,originalKeys.length)',
    'const quotas=ppEvenSubjectQuotas(subjects,target,today)',
    'subjectQuotaTarget:quotas',
    'subjectCounts',
    'const balancedNewCount=',
    'const balancedReviewCount=',
    'gradeCounts[grade]={review:balancedReviewCount,new:balancedNewCount}',
    'subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY',
    "assignmentPolicy:'knowledge-gap-priority-v6-coverage-balanced'",
    "subjectBalancePolicy:'coverage-even-v2'",
    "cp.subjectBalancePolicy!=='coverage-even-v2'",
    'no-premature-review-v1',
    'if(ppHomeworkClusterSeen(item,progress)&&!ppIsDue(ppProgressFor(progress,item.key),today))continue;',
]:
    assert needle in text, f'missing subject-balance marker: {needle}'

def quota(subjects,total,today='2026-09-29'):
    subjects=list(dict.fromkeys(subjects))
    base=total//len(subjects);rest=total%len(subjects)
    out={s:base for s in subjects}
    seed=sum(ord(c) for c in today)%len(subjects)
    for i in range(rest):
        out[subjects[(seed+i)%len(subjects)]]+=1
    return out

subjects=['영어','항해','법규','운용','상선전문']
q70=quota(subjects,70)
assert list(q70.values())==[14,14,14,14,14], q70
for total in [40,41,69,71,73,120,121,250]:
    q=quota(subjects,total)
    assert sum(q.values())==total
    assert max(q.values())-min(q.values())<=1, (total,q)

assert 'for(const subject of order)' in text, 'subjects are not interleaved in final queue'
assert "if(due&&weak)return 0;" in text
assert "if(!ppHomeworkClusterSeen(item,progress))return 1;" in text
assert "if(due&&(!r.mastered||attempts<3||accuracy<0.85))return 2;" in text
assert "if(due)return 3;" in text

assert 'coverageProtected:balancedNewCount>=requiredNew' in text 
assert 'requiredNewReserved:' in text 
print('single-grade coverage-preserving subject balance checks: PASS')
