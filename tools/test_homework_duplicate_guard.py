from pathlib import Path
import json,re,subprocess,tempfile

text=Path('index.html').read_text(encoding='utf-8-sig')
for needle in [
    '// homework-near-duplicate-v1:start',
    "const PP_HOMEWORK_DEDUPE_POLICY=\"near-duplicate-v1\"",
    "assignmentPolicy:'knowledge-gap-priority-v4-dedupe'",
    "rotationPolicy:'knowledge-gap-priority-v4-dedupe'",
    'function ppHomeworkUniqueUnseen(pool,progress)',
    'ppHomeworkClusterSeen(item,progress)',
    'ppHomeworkImportanceCount(item)',
    'selectedClusters=new Set()',
    'dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY',
    'cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY',
]:
    assert needle in text, f'missing duplicate guard marker: {needle}'

m=re.search(r'const PP_HOMEWORK_DUPLICATE_CLUSTER=Object\.freeze\((\{.*?\})\);',text,re.S)
assert m,'duplicate cluster map missing'
cluster=json.loads(m.group(1))
m=re.search(r'const PP_HOMEWORK_DUPLICATE_MEMBERS=Object\.freeze\((\{.*?\})\);',text,re.S)
assert m,'duplicate member map missing'
members=json.loads(m.group(1))
assert len(members)>=20, f'unexpectedly few duplicate clusters: {len(members)}'
assert sum(len(v)-1 for v in members.values())>=20, 'unexpectedly few redundant homework entries'

for a,b in [
    ('navi3|q-p0zxgy','navi3|q-1p6jdvm'),
    ('navi2|q-1xn64cs','navi3|q-1xn64cs'),
]:
    assert cluster.get(a) and cluster.get(a)==cluster.get(b), f'known duplicate pair not clustered: {a} / {b}'

body=re.search(r'function ppBuildTodayAssignment\(plan,pools,progress,today\)\{(.*?)\n  \}(?=\n  function ppGetItemByKey)',text,re.S)
assert body,'assignment builder missing'
b=body.group(1)
assert 'let picked=0;' in b and 'if(picked>=quotas[g])break' in b
assert 'selectedClusters.has(ppHomeworkClusterId(item))' in b
assert 'ppHomeworkClusterSeen(item,progress)' in b
assert 'ppHomeworkImportanceCount(b)-ppHomeworkImportanceCount(a)' in b

blocks=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',text,re.S)
target=next((s for s in blocks if '// homework-near-duplicate-v1:start' in s),None)
assert target,'script block containing duplicate guard not found'
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(target); path=f.name
proc=subprocess.run(['node','--check',path],capture_output=True,text=True)
assert proc.returncode==0,proc.stderr
print(f'homework duplicate guard checks: PASS ({len(members)} clusters)')
