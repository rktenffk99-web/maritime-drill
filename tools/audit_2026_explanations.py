from pathlib import Path
import re, base64, gzip, json

src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
rows=[]
for m in re.finditer(r'<script([^>]*)>(.*?)</script>',src,re.S|re.I):
    attrs=m.group(1)
    body=m.group(2).strip()
    mid=re.search(r'\bid=["\']([^"\']+)["\']',attrs,re.I)
    sid=mid.group(1) if mid else '(no-id)'
    decoded=None
    kind='plain'
    if body:
        try:
            raw=base64.b64decode(re.sub(r'\s+','',body), validate=True)
            try:
                decoded=gzip.decompress(raw).decode('utf-8')
                kind='base64+gzip'
            except Exception:
                try:
                    decoded=raw.decode('utf-8')
                    kind='base64'
                except Exception:
                    pass
        except Exception:
            pass
    text=decoded if decoded is not None else body
    if ('2026' in sid.lower() or 'explain' in sid.lower() or 'past' in sid.lower() or
        'MD_EXPLAIN' in text or 'MD_PAST' in text or '2026|' in text):
        rows.append({
          'id':sid,'kind':kind,'chars':len(text),
          'md_explain':text.count('MD_EXPLAIN'),'md_past':text.count('MD_PAST'),
          'navi2_2026':text.count('2026|navi2'),'navi3_2026':text.count('2026|navi3'),
          'snippet':text[:1200].replace('\n','\\n')
        })
Path('debug/2026-script-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('candidate scripts',len(rows))
for r in rows:
    print(r['id'],r['kind'],r['chars'],'explain',r['md_explain'],'past',r['md_past'],'n2',r['navi2_2026'],'n3',r['navi3_2026'])
