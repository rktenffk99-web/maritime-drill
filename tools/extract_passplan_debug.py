from pathlib import Path
import re

src = Path('index.html').read_text(encoding='utf-8-sig')
lines = src.splitlines()

Path('debug').mkdir(exist_ok=True)

# Broad context file (kept for reference)
out=[]
for name in ['ppTrainingYears','ppBuildPools','ppBuildTodayAssignment','ppGetDailyAssignment','ppHydrateKeys']:
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    out.append(f'===== {name} =====')
    if not m:
        out.append('NOT FOUND'); continue
    start=m.start(); out.append(src[start:start+16000])

m=re.search(r'window\.renderNavigatorPassPlanCard\s*=\s*function\s*\(',src)
out.append('===== renderNavigatorPassPlanCard =====')
out.append(src[m.start():m.start()+18000] if m else 'NOT FOUND')
Path('debug/passplan-context.txt').write_text('\n\n'.join(out),encoding='utf-8')

# Focused 2026 audit: count and show exact source contexts.
patterns={
    'year_json_colon': r'["\']year["\']\s*:\s*2026',
    'year_unquoted_colon': r'\byear\s*:\s*2026',
    'korean_2026': r'2026년',
    'generic_2026': r'2026',
}
focus=['===== 2026 occurrence counts =====']
for name,pat in patterns.items():
    focus.append(f'{name}: {len(re.findall(pat,src))}')

focus.append('\n===== first 80 2026 contexts =====')
idxs=[m.start() for m in re.finditer('2026',src)]
for n,pos in enumerate(idxs[:80],1):
    s=max(0,pos-220); e=min(len(src),pos+420)
    focus.append(f'--- {n} @ {pos} ---\n'+src[s:e].replace('\r',''))

# Look for grade/data markers near 2026 occurrences.
focus.append('\n===== 2026 nearby grade/data markers =====')
for n,pos in enumerate(idxs[:120],1):
    s=max(0,pos-1200); e=min(len(src),pos+1200); chunk=src[s:e]
    marks=[]
    for token in ['navi2','navi3','2급 항해사','3급 항해사','groups','hits','pastQuestions','year']:
        if token in chunk: marks.append(token)
    if marks:
        focus.append(f'{n}: {", ".join(marks)}')

Path('debug/passplan-2026.txt').write_text('\n'.join(focus),encoding='utf-8')
print('wrote debug/passplan-context.txt and debug/passplan-2026.txt')
