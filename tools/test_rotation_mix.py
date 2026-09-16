from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert "assignmentPolicy:'balanced-rotation-v3'" in text, 'balanced assignment policy missing'
assert 'balanced-rotation-v3' in text, 'rotation marker missing'
assert 'const current2026Unseen=' in text, 'seen-but-unmastered 2026 items can still block stage2'
assert "label:'2단계 · 최근 5개년 전체 신규 + 취약 복습'" in text, 'stage2 mixed label missing'
assert 'const protectedNew=' in text, 'new-question reserve missing'
assert 'const ordered=[];let ri=0,ni=0;' in text, 'review/new interleaving missing'
assert "rotationPolicy:'balanced-rotation-v3'" in text, 'assignment result rotation policy missing'

m=re.search(r"function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)",text,re.S)
assert m, 'assignment builder missing'
body=m.group(0)
assert body.find('const phases=') < body.find('const due='), 'phase/new demand should be computed before due-cap allocation'
assert body.find('const dueSelected=') < body.find('const quotas='), 'due/new allocation order invalid'
assert body.find('const ordered=') < body.find('return {keys:ordered.map'), 'mixed queue must be returned'

print('rotation mix tests: PASS')
