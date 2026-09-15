from pathlib import Path
import re

src = Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

# Core pass-plan context.
out=[]
for name in ['ppTrainingYears','ppBuildPools','ppBuildTodayAssignment','ppGetDailyAssignment','ppHydrateKeys','getPastExamsByBase']:
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    out.append(f'===== {name} =====')
    out.append(src[m.start():m.start()+18000] if m else 'NOT FOUND')

m=re.search(r'window\.renderNavigatorPassPlanCard\s*=\s*function\s*\(',src)
out.append('===== renderNavigatorPassPlanCard =====')
out.append(src[m.start():m.start()+18000] if m else 'NOT FOUND')
Path('debug/passplan-context.txt').write_text('\n\n'.join(out),encoding='utf-8')

# Exact-ish chunks for 2026/past-session work.
m=re.search(r'async\s+function\s+startPastSession\s*\(',src)
Path('debug/startPastSession.txt').write_text(src[m.start():m.start()+24000] if m else 'NOT FOUND',encoding='utf-8')

m=re.search(r'window\.startNavigatorPassPlanMock\s*=\s*async\s+function\s*\(',src)
Path('debug/startNavigatorPassPlanMock.txt').write_text(src[m.start():m.start()+12000] if m else 'NOT FOUND',encoding='utf-8')

# Focused 2026 audit.
patterns={
    'year_json_colon': r'["\']year["\']\s*:\s*2026',
    'year_unquoted_colon': r'\byear\s*:\s*2026',
    'korean_2026': r'2026년',
    'generic_2026': r'2026',
}
focus=['===== 2026 occurrence counts =====']
for name,pat in patterns.items():
    focus.append(f'{name}: {len(re.findall(pat,src))}')
idxs=[m.start() for m in re.finditer('2026',src)]
focus.append('\n===== first 80 2026 contexts =====')
for n,pos in enumerate(idxs[:80],1):
    s=max(0,pos-220); e=min(len(src),pos+420)
    focus.append(f'--- {n} @ {pos} ---\n'+src[s:e].replace('\r',''))
Path('debug/passplan-2026.txt').write_text('\n'.join(focus),encoding='utf-8')
print('wrote debug outputs')
