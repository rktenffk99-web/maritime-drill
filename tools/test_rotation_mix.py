from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "assignmentPolicy:'deadline-coverage-v4'" in text, 'deadline coverage assignment policy missing'
assert 'deadline-coverage-v4' in text, 'deadline coverage marker missing'
assert 'const current2026Unseen=' in text, 'seen-but-unmastered 2026 items can still block stage2'
assert "label:'2단계 · 전범위 1회독 보장 + 최근 5개년 전체 + 취약 복습'" in text, 'stage2 coverage label missing'
assert 'const daysLeft=' in text and 'phase.dday+1' in text, 'deadline day calculation missing'
assert 'requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;' in text, 'minimum daily new-question calculation missing'
assert 'const requiredNew=Math.min(cap,requestedNew);' in text, 'required new-question reserve missing'
assert 'const dueSelected=due.slice(0,Math.max(0,cap-requiredNew));' in text, 'review must not invade required new slots'
assert 'const preferred=new Set((phase.candidates||[]).map(item=>item.key));' in text, 'priority set missing'
assert 'const candidates=(phase.allRemaining||[])' in text, 'new selection must cover all unseen groups'
assert 'coverageAtRisk:requestedNew>cap' in text, 'impossible-schedule warning flag missing'
assert 'const ordered=[];let ri=0,ni=0;' in text, 'review/new interleaving missing'
assert "rotationPolicy:'deadline-coverage-v4'" in text, 'assignment result policy missing'

m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert body.find('const phases=') < body.find('const due='), 'coverage demand should be computed before review allocation'
assert body.find('const requiredNew=') < body.find('const dueSelected='), 'required new quota must be reserved first'
assert body.find('const dueSelected=') < body.find('const quotas='), 'allocation order invalid'
assert body.find('const ordered=') < body.find('return {keys:ordered.map'), 'mixed queue must be returned'

print('deadline coverage rotation tests: PASS')
