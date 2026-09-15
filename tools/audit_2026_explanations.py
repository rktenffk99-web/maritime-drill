from pathlib import Path
import re, json, base64, gzip
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
rows=[]
for m in re.finditer(r'<script[^>]*id=["\']([^"\']+)["\'][^>]*>(.*?)</script>',src,re.S|re.I):
    sid=m.group(1); body=m.group(2).strip()
    if any(k in sid.lower() for k in ('2026','explain','past')):
        info={'id':sid,'chars':len(body),'head':body[:120]}
        try:
            raw=gzip.decompress(base64.b64decode(body)).decode('utf-8')
            info['decoded_chars']=len(raw); info['decoded_head']=raw[:500]
            if '2026' in sid.lower() or 'explain' in sid.lower():
                Path('debug/'+re.sub(r'[^A-Za-z0-9_.-]','_',sid)+'.txt').write_text(raw,encoding='utf-8')
        except Exception as e:
            info['decode_error']=str(e)
        rows.append(info)
Path('debug/2026-script-index.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([r['id'] for r in rows],ensure_ascii=False))
