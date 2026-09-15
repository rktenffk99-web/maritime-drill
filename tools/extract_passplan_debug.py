from pathlib import Path
import re

src = Path('index.html').read_text(encoding='utf-8-sig')
out = []

patterns = [
    ('ppBuildPools', r'(?:async\s+)?function\s+ppBuildPools\([^)]*\)\s*\{.*?\n\s*\}'),
    ('ppGetDailyAssignment', r'(?:async\s+)?function\s+ppGetDailyAssignment\([^)]*\)\s*\{.*?\n\s*\}'),
    ('renderNavigatorPassPlanCard', r'window\.renderNavigatorPassPlanCard\s*=\s*function\(\)\s*\{.*?\n\s*\};'),
]

for name, pat in patterns:
    m = re.search(pat, src, flags=re.S)
    out.append(f'===== {name} =====')
    if m:
        text = m.group(0)
        if len(text) > 20000:
            text = text[:20000] + '\n...TRUNCATED...'
        out.append(text)
    else:
        out.append('NOT FOUND')

# Show lines around any explicit recent-year filtering / weighting logic.
keywords = ['_year', '최근 5년', '2026', 'count', '_planCount', 'frequency', '빈출']
lines = src.splitlines()
out.append('===== keyword contexts =====')
seen = set()
for i, line in enumerate(lines):
    if any(k in line for k in keywords):
        start=max(0,i-3); end=min(len(lines),i+4)
        block='\n'.join(f'{j+1}: {lines[j]}' for j in range(start,end))
        if block not in seen:
            seen.add(block); out.append(block)
        if len(out) > 250:
            break

Path('debug').mkdir(exist_ok=True)
Path('debug/passplan-context.txt').write_text('\n\n'.join(out), encoding='utf-8')
print('wrote debug/passplan-context.txt')
