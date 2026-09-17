from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

required=[
    'predictive-no-duplicate-v1',
    'function ppPredictiveQuestionFingerprint(item)',
    'function ppUniquePredictiveCandidates(items)',
    'selectedFingerprints=new Set()',
    'ppUniquePredictiveCandidates(pool.filter(item=>item.subject===subject))',
    'if(selectedFingerprints.has(fp))continue;',
    'selectedFingerprints.add(fp);selected.push(item);',
]
for needle in required:
    assert needle in text, f'missing duplicate-guard marker: {needle}'

m=re.search(r"window\.startNavigatorPredictiveMock=async function\(gradeId\)\{(.*?)\n  \};",text,re.S)
assert m, 'predictive mock start function missing'
body=m.group(1)
assert 'selected.push(...draw)' not in body, 'raw draw append can reintroduce duplicate question stems'
assert body.index('selectedFingerprints=new Set()') < body.index('for(const subject of subjects)')
assert body.index('ppUniquePredictiveCandidates') < body.index('ppPredictivePrioritySample')
assert body.index('if(selectedFingerprints.has(fp))continue;') < body.index('selectedFingerprints.add(fp);selected.push(item);')

# The priority-core sampler itself must still consume already de-duplicated candidates.
assert "const unique=typeof ppUniquePredictiveCandidates==='function'?ppUniquePredictiveCandidates(items||[]):[...(items||[])];" in text

# The fingerprint must collapse harmless presentation differences that would otherwise
# let the same stem appear twice under different source keys/years.
assert ".normalize('NFKC').toLowerCase().replace(/\\s+/g,' ').trim()" in text

print('predictive mock no-duplicate checks: PASS')
