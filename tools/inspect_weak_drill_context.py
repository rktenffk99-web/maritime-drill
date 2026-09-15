from pathlib import Path
import re

src=Path('index.html').read_text(encoding='utf-8-sig')
patterns=[
 'function ppLoadProgress',
 'function ppSaveProgress',
 'function addPastWrong',
 'function removePastWrong',
 'window.startNavigatorPassPlanRetry',
 'function renderNavigatorPassPlan(',
 '오늘의 숙제',
 '숙달 규칙',
 'function ppHydrateKeys',
 'function ppProgressFor',
 'function ppCommitOutcome',
]
for pat in patterns:
    print('\n===== '+pat+' =====')
    m=re.search(re.escape(pat),src)
    if not m:
        print('NOT FOUND'); continue
    pos=m.start()
    print(src[max(0,pos-2500):min(len(src),pos+12000)])
