from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
pat='window.MD_NAVI_FREQUENCY'
hits=[m.start() for m in re.finditer(re.escape(pat),src)]
out=[f'count={len(hits)}']
for i,pos in enumerate(hits,1):
    out.append(f'===== OCCURRENCE {i} @ {pos} =====\n'+src[max(0,pos-2500):min(len(src),pos+12000)])
Path('debug/md-navi-frequency-occurrences.txt').write_text('\n\n'.join(out),encoding='utf-8')
# Also find any object-looking navi2/navi3 keys near the second occurrence.
for label,needle in [('navi2_key','"navi2"'),('navi3_key','"navi3"'),('single_navi2',"'navi2'"),('single_navi3',"'navi3'")]:
    positions=[m.start() for m in re.finditer(re.escape(needle),src)]
    Path(f'debug/{label}.txt').write_text('\n\n'.join(src[max(0,p-1000):min(len(src),p+3000)] for p in positions[-10:]),encoding='utf-8')
print('wrote targeted frequency diagnostics')
