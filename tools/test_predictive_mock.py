from pathlib import Path
import base64, gzip, json, re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')
required=[
    "const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v1'",
    'window.startNavigatorPredictiveMock=async function(gradeId)',
    'window.commitNavigatorPredictiveMockResult=function(queue,answers)',
    '실전예측 모의 · 가중 랜덤',
    "pastReturnView='pass-plan-predictive-mock'",
    "weight*=0.45",
    "best/(1+used*2.5)",
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing predictive mock marker: {needle}')
if src.count("const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v1'")!=1:
    raise SystemExit('predictive mock patch is not idempotent')

# Syntax-check the newly injected JavaScript block independently.
start=src.index("const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v1'")
end=src.index('window.startNavigatorPassPlanMock=async function(gradeId)',start)
block=src[start:end]
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(block)
    js_path=f.name
proc=subprocess.run(['node','--check',js_path],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('predictive mock JS syntax failed:\n'+proc.stderr)

# Verify that each grade/subject has enough distinct recent-five-year groups for a 25-question mock.
def load_frequency(grade):
    sid=f'md-bundle-past-analysis-{grade}_js'
    m=re.search(r'<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>(.*?)</script>',src,re.S)
    if not m: raise SystemExit(f'frequency bundle missing: {grade}')
    code=gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')
    assign=f'window.MD_NAVI_FREQUENCY["{grade}"] = '
    pos=code.find(assign)
    if pos<0: raise SystemExit(f'frequency assignment missing: {grade}')
    data,_=json.JSONDecoder().raw_decode(code[pos+len(assign):].lstrip())
    return data

summary={}
for grade in ('navi2','navi3'):
    data=load_frequency(grade)
    meta=[int(y) for y in data.get('meta',{}).get('years',[])]
    hit_years=[int(h.get('year')) for g in data.get('groups',[]) for h in g.get('hits',[]) if str(h.get('year','')).isdigit()]
    years=sorted(set(meta+hit_years))
    training=[y for y in years if y<=2026][-5:] if 2026 in years else years[-5:]
    yearset=set(training)
    counts={}
    for g in data.get('groups',[]):
        if any(int(h.get('year',0)) in yearset for h in g.get('hits',[])):
            counts[g.get('subject')]=counts.get(g.get('subject'),0)+1
    summary[grade]=counts
    for subject,count in counts.items():
        if count<25:
            raise SystemExit(f'{grade} {subject}: only {count} recent groups; need 25')
print('predictive mock checks passed',json.dumps(summary,ensure_ascii=False))
