from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')
required=[
    'predictive-priority-core-v1',
    'const PREDICTIVE_CORE_SHARE=0.40;',
    'const PREDICTIVE_TOP_POOL_SHARE=0.30;',
    'function ppPredictivePrioritySample(items,data,count,history,progress)',
    'const ranked=unique.slice().sort((a,b)=>ppPredictiveWeight(b,history,progress)-ppPredictiveWeight(a,history,progress));',
    'const coreCount=Math.min(target,Math.max(1,Math.round(target*PREDICTIVE_CORE_SHARE)));',
    'const topPoolSize=Math.min(ranked.length,Math.max(coreCount,Math.ceil(ranked.length*PREDICTIVE_TOP_POOL_SHARE)));',
    'const core=ppPredictiveSample(topPool,data,coreCount,history,progress);',
    'const rest=ppPredictiveSample(remainder,data,target-core.length,history,progress);',
    'ppPredictivePrioritySample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress)',
    '핵심 중요도 상위군 40% 우선',
    '동일 문항 중복 금지',
]
for needle in required:
    assert needle in text, f'missing predictive priority-core marker: {needle}'

m=re.search(r"window\.startNavigatorPredictiveMock=async function\(gradeId\)\{(.*?)\n  \};",text,re.S)
assert m, 'predictive mock start function missing'
body=m.group(1)
assert 'const draw=ppPredictivePrioritySample(' in body, 'predictive mock is not using priority-core sampling'
assert 'const draw=ppPredictiveSample(candidates' not in body, 'old all-random draw still active'

# 25-question subject block should reserve 10 questions (40%) for the top-priority pool.
assert round(25*0.40)==10

print('predictive mock priority-core checks: PASS')
