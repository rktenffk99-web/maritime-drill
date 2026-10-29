from pathlib import Path
s = Path('index.html').read_text(encoding='utf-8-sig')
needles = [
  'function variantLabel(short){',
  'function renderPastYearPick(subjectId, baseShort){',
  'function renderPastRunner(subjectId, baseShort, year, session){',
  'function getPastExamsForSession(baseShort, year, session, variant){',
  'async function startPastYearPickSession(mode){',
  'async function startPastAllYearsSession(mode){',
  'function changePastVariant',
]
for n in needles:
    j=s.find(n)
    print('\nDIAGNOSTIC '+n+' POSITION '+str(j),flush=True)
    if j>=0: print(s[j:j+4200],flush=True)
