from pathlib import Path
import re

text = Path('index.html').read_text(encoding='utf-8-sig')

print('INDEX_BYTES', len(text.encode('utf-8')))
for pat in ['"groupId"', "'groupId'", 'groupId:', '"정답"', "'정답'", '"선택지"', "'선택지'"]:
    print('COUNT', pat, text.count(pat))

for needle in ['function ppBuildPools', 'function ppTrainingYears', 'function n3aData', 'const PLAN_GRADES', 'let planPools', 'const PAST_MOCK_PER_SUBJECT']:
    i = text.find(needle)
    print('\n===', needle, 'AT', i, '===')
    if i >= 0:
        print(text[max(0, i-1200):i+7000])

# Show nearby serialized analysis-data declarations if identifiable.
for m in list(re.finditer(r'(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*\{\s*["\']?meta["\']?\s*:', text))[:20]:
    print('\n=== META OBJECT', m.group(1), 'AT', m.start(), '===')
    print(text[m.start():m.start()+1500])
