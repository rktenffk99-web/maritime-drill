from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
out=[]
patterns=[
 'function n3aData','ensureNavi3FrequencyData','partialYears','completeYears',
 'window.MD_NAVI_FREQUENCY','MD_NAVI_FREQUENCY =','MD_NAVI_FREQUENCY=',
 "MD_NAVI_FREQUENCY['navi2']",'MD_NAVI_FREQUENCY.navi2',
 "MD_NAVI_FREQUENCY['navi3']",'MD_NAVI_FREQUENCY.navi3',
 'past-analysis-navi2.js','past-analysis-navi3.js','data-bundled-src="past-analysis-navi2.js"','data-bundled-src="past-analysis-navi3.js"'
]
for pat in patterns:
    out.append(f'===== {pat} =====')
    hits=[m.start() for m in re.finditer(re.escape(pat),src)]
    out.append(f'count={len(hits)}')
    for i,pos in enumerate(hits[:20],1):
        out.append(f'--- {i} @ {pos} ---\n'+src[max(0,pos-1200):min(len(src),pos+7000)])
Path('debug').mkdir(exist_ok=True)
Path('debug/frequency-context.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote debug/frequency-context.txt')
