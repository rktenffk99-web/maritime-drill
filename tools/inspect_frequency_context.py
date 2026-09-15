from pathlib import Path
import re, base64, gzip, json

src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

def load_grade(grade):
    sid=f'md-bundle-past-analysis-{grade}_js'
    m=re.search(r'<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>(.*?)</script>',src,re.S)
    if not m: raise SystemExit(f'{sid} not found')
    code=gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')
    assign=f'window.MD_NAVI_FREQUENCY["{grade}"] = '
    start=code.find(assign)
    fragment=code[start+len(assign):].lstrip()
    data,_=json.JSONDecoder().raw_decode(fragment)
    return data

out={}
for grade in ('navi2','navi3'):
    data=load_grade(grade)
    samples=[]
    for g in data.get('groups',[])[:8]:
        samples.append({
            'group_keys':list(g.keys()),
            'group':g,
            'first_hit_keys':list((g.get('hits') or [{}])[0].keys()) if g.get('hits') else [],
        })
    out[grade]=samples
Path('debug/group-schema-sample.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('wrote schema sample')
