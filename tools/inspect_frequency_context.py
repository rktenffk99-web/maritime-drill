from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
patterns=['function loadOptionalScript','loadOptionalScript=','past-analysis-','BUNDLED','bundled','optionalScript','OPTIONAL']
out=[]
for pat in patterns:
    hits=[m.start() for m in re.finditer(re.escape(pat),src)]
    out.append(f'===== {pat} count={len(hits)} =====')
    for i,pos in enumerate(hits[:30],1):
        out.append(f'--- {i} @ {pos} ---\n'+src[max(0,pos-2500):min(len(src),pos+12000)])
Path('debug/loader-context.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote loader context')
