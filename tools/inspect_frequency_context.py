from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
out=[]
for pat in ['function n3aData','n3aData=','ensureNavi3FrequencyData','NAVI3_FREQ','frequencyData','partialYears','completeYears','groups:']:
    out.append(f'===== {pat} =====')
    hits=[m.start() for m in re.finditer(re.escape(pat),src)]
    out.append(f'count={len(hits)}')
    for i,pos in enumerate(hits[:10],1):
        out.append(f'--- {i} @ {pos} ---\n'+src[max(0,pos-1500):min(len(src),pos+5000)])
Path('debug').mkdir(exist_ok=True)
Path('debug/frequency-context.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote debug/frequency-context.txt')
