from pathlib import Path
import re, base64, gzip, statistics

src=Path('index.html').read_text(encoding='utf-8-sig')

def bundles():
    for m in re.finditer(r'<script[^>]*id=["\']([^"\']+)["\'][^>]*>(.*?)</script>',src,re.S|re.I):
        sid=m.group(1)
        if 'explain' not in sid: continue
        payload=m.group(2).strip()
        try: raw=gzip.decompress(base64.b64decode(payload)).decode('utf-8')
        except Exception: continue
        yield sid,raw

def balanced_object(raw,start):
    i=raw.find('{',start)
    if i<0:return None
    depth=0; quote=None; esc=False
    for j in range(i,len(raw)):
        c=raw[j]
        if quote:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c==quote: quote=None
            continue
        if c in "'\"`": quote=c; continue
        if c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth==0:return raw[i:j+1]
    return None

def english_blocks(raw,year):
    out=[]
    pat=re.compile(r'["\']('+re.escape(str(year))+r'\|navi[23]\|\d+\|영어\|\d+)["\']\s*:')
    for m in pat.finditer(raw):
        block=balanced_object(raw,m.end())
        if block: out.append((m.group(1),block))
    return out

print('=== English explanation audit ===')
all_years={}
for sid,raw in bundles():
    ym=re.search(r'(20\d{2})',sid)
    if not ym:continue
    y=int(ym.group(1))
    blocks=english_blocks(raw,y)
    if blocks: all_years.setdefault(y,[]).extend(blocks)

for y in sorted(all_years):
    rows=all_years[y]
    lens=[len(v) for _,v in rows]
    markers={k:sum(k in v for _,v in rows) for k in ['정답','해석','직독','어휘','문법','핵심','오답']}
    print(f'YEAR {y}: n={len(rows)} avg={statistics.mean(lens):.1f} median={statistics.median(lens):.1f} min={min(lens)} max={max(lens)} markers={markers}')
    if y in (2024,2025,2026):
        for key,v in rows[:2]:
            print(' SAMPLE',key, v[:900].replace('\n',' '))

# Session 3 supplemental English reasons are plain one-liners; report their lengths too.
p=Path('explain-2026-navi3-3.js')
if p.exists():
    js=p.read_text(encoding='utf-8')
    vals=re.findall(r"'영어\|(\d+)'\s*:\s*'((?:\\.|[^'])*)'",js)
    if vals:
        lens=[len(v) for _,v in vals]
        print(f'2026 SESSION3 supplemental: n={len(vals)} avg={statistics.mean(lens):.1f} median={statistics.median(lens):.1f} min={min(lens)} max={max(lens)}')
        for n,v in vals[:5]: print(' S3',n,v[:400])
