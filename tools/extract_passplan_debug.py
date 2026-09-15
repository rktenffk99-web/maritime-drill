from pathlib import Path
import re

src = Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

out=[]
for name in ['ppTrainingYears','ppBuildPools','ppBuildTodayAssignment','ppGetDailyAssignment','ppHydrateKeys','startPastSession','getPastExamsByBase']:
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    out.append(f'===== {name} =====')
    if not m:
        out.append('NOT FOUND'); continue
    out.append(src[m.start():m.start()+18000])

m=re.search(r'window\.renderNavigatorPassPlanCard\s*=\s*function\s*\(',src)
out.append('===== renderNavigatorPassPlanCard =====')
out.append(src[m.start():m.start()+18000] if m else 'NOT FOUND')

needle='2026 실전 모의를 준비하는 중입니다'
pos=src.find(needle)
out.append('===== 2026 mock function vicinity =====')
if pos>=0:
    # Walk back to the nearest window.* or function declaration.
    start=max(0,pos-5000)
    pre=src[start:pos]
    matches=list(re.finditer(r'(?:window\.[A-Za-z0-9_]+\s*=\s*async\s+function|async\s+function\s+[A-Za-z0-9_]+|function\s+[A-Za-z0-9_]+)',pre))
    if matches:
        start=start+matches[-1].start()
    out.append(src[start:pos+9000])
else:
    out.append('NOT FOUND')

Path('debug/passplan-context.txt').write_text('\n\n'.join(out),encoding='utf-8')

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
Path('debug/passplan-2026.txt').write_text('\n'.join(focus),encoding='utf-8')
print('wrote debug outputs')
