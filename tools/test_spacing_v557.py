"""v5.57: spacing fixes only insert spaces, and they are in the shipped bundles."""
import base64, gzip, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
fixes = json.loads((ROOT / 'tools' / 'spacing_fixes_v557.json').read_text(encoding='utf-8'))
pairs = [p for f in fixes for p in [f.get('문제')] + (f.get('선택지') or []) if p]
assert len(pairs) > 5000, len(pairs)
for old, new in pairs:
    assert re.sub(r'\s+', '', old) == re.sub(r'\s+', '', new), (old, new)
    assert ' ?' not in new or ' ?' in old, new
html = (ROOT / 'index.html').read_text(encoding='utf-8')
m = re.search(r'id="md-bundle-past-2023-navi3-2_js">(.*?)</script>', html, re.S)
payload = json.loads(re.search(r'const PAYLOAD = (\{.*?\n\});\n', gzip.decompress(base64.b64decode(m.group(1).strip())).decode(), re.S).group(1))
q = next(q for q in payload['questions'] if q['과목'] == '항해' and q['번호'] == 2)
assert '에서 제한항로 관련하여' in q['문제'], q['문제']
print(f'spacing v557: {len(pairs)} strings respaced')
