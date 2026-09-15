from pathlib import Path
import re, base64, gzip
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
for grade in ('navi2','navi3'):
    sid=f'md-bundle-past-analysis-{grade}_js'
    m=re.search(r'<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>(.*?)</script>',src,re.S)
    if not m:
        raise SystemExit(f'{sid} not found')
    payload=m.group(1).strip()
    code=gzip.decompress(base64.b64decode(payload)).decode('utf-8')
    Path(f'debug/past-analysis-{grade}.js').write_text(code,encoding='utf-8')
    print(grade,len(code))
