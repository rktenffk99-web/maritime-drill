from pathlib import Path
import re,base64,gzip
src=Path('index.html').read_text(encoding='utf-8-sig')
js=Path('explain-2026-navi3-3.js').read_text(encoding='utf-8')
keys=re.findall(r"'(항해|운용|법규|영어|상선전문)\|(\d+)'\s*:",js)
assert len(keys)==125, f'reason count {len(keys)} != 125'
assert len(set(keys))==125, 'duplicate explanation keys'
for subject in ('항해','운용','법규','영어','상선전문'):
    nums=sorted(int(n) for s,n in keys if s==subject)
    assert nums==list(range(1,26)), f'{subject} explanation numbers incomplete: {nums}'
assert '<script src="explain-2026-navi3-3.js"></script>' in src
assert 'get2026Navi3Session3Explain(q)' in src
m=re.search(r'<script[^>]*id=["\']md-bundle-past-2026-navi3-3_js["\'][^>]*>(.*?)</script>',src,re.S|re.I)
assert m,'2026 navi3 session3 bundle missing'
raw=gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')
nav='Q(21, "레이더 물표상에서 상대선의 상대운동 벡터에 관한 설명으로 옳은 것은?"'
law='Q(21, "국제해상충돌방지규칙상 예인선이 그림의 등화를 표시하여야 하는 경우는?'
navline=next(x for x in raw.splitlines() if nav in x)
lawline=next(x for x in raw.splitlines() if law in x)
assert '], 2, "항해", "navi")' in navline, navline
assert '], 2, "법규", "law")' in lawline, lawline
print('2026 session3 explanations: 125/125; verified answer corrections present')
