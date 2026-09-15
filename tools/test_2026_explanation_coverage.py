from pathlib import Path
import base64, gzip, json, re

src=Path('index.html').read_text(encoding='utf-8-sig')

def script(script_id):
    m=re.search(r'<script[^>]*\bid=["\']'+re.escape(script_id)+r'["\'][^>]*>(.*?)</script>',src,re.S|re.I)
    if not m:raise SystemExit(f'missing script {script_id}')
    raw=base64.b64decode(re.sub(r'\s+','',m.group(1).strip()))
    return gzip.decompress(raw).decode('utf-8')

def parse_payload(script_id):
    text=script(script_id);marker='const PAYLOAD = ';pos=text.find(marker)
    if pos<0:raise SystemExit(f'PAYLOAD not found {script_id}')
    payload,_=json.JSONDecoder().raw_decode(text[pos+len(marker):].lstrip())
    return payload

def parse_q_payload(script_id,year,grade,session):
    text=script(script_id);rows=[];pos=0
    while True:
        start=text.find('Q(',pos)
        if start<0:break
        i=start+2;depth=1;in_str=False;esc=False
        while i<len(text) and depth:
            ch=text[i]
            if in_str:
                if esc:esc=False
                elif ch=='\\':esc=True
                elif ch=='"':in_str=False
            else:
                if ch=='"':in_str=True
                elif ch=='(':depth+=1
                elif ch==')':depth-=1
            i+=1
        if depth:raise SystemExit('unterminated Q call')
        try:vals=json.loads('['+text[start+2:i-1]+']')
        except Exception:pos=i;continue
        if len(vals)>=6 and isinstance(vals[0],int):
            n,q,choices,a,subj,sid=vals[:6]
            rows.append({'번호':n,'문제':q,'선택지':choices,'정답':a,'과목':subj,'과목Id':sid})
        pos=i
    return {'meta':{'year':year,'gradeShort':grade,'session':session},'questions':rows}

# Explanation object parser.
exp=script('md-bundle-past-explain-2026_js')
entry_re=re.compile(r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*\{\s*html\s*:\s*("(?:\\.|[^"\\])*")',re.S)
explains={}
for m in entry_re.finditer(exp):
    key=json.loads('"'+m.group(1)+'"')
    html=json.loads(m.group(2))
    explains[key]=html

papers=[
    parse_payload('md-bundle-past-2026-navi2-2_js'),
    parse_payload('md-bundle-past-2026-navi3-2_js'),
    parse_q_payload('md-bundle-past-2026-navi3-3_js',2026,'navi3',3),
]
expected={('navi2',2):125,('navi3',2):75,('navi3',3):125}
missing=[];short=[];counts={}
for paper in papers:
    meta=paper['meta'];grade=meta['gradeShort'];session=int(meta['session']);qs=paper['questions']
    counts[f'{grade}-{session}']=len(qs)
    want=expected[(grade,session)]
    if len(qs)!=want:raise SystemExit(f'{grade} session {session}: {len(qs)} questions, expected {want}')
    for q in qs:
        key=f"2026|{grade}|{session}|{q['과목']}|{q['번호']}"
        html=explains.get(key)
        if not html:missing.append(key);continue
        visible=re.sub(r'<[^>]+>','',html).strip()
        if len(visible)<80:short.append((key,len(visible)))

q21=next(q for q in papers[2]['questions'] if q['과목']=='항해' and q['번호']==21)
if q21['정답']!=2:
    raise SystemExit(f'2026 navi3 session3 항해 Q21 answer is {q21["정답"]}, expected 2')
if missing or short:
    raise SystemExit(f'missing={len(missing)} short={len(short)} examples={missing[:5] or short[:5]}')

navi2=sum(v for k,v in counts.items() if k.startswith('navi2-'))
navi3=sum(v for k,v in counts.items() if k.startswith('navi3-'))
print(json.dumps({'counts':counts,'navi2_2026_covered':navi2,'navi3_2026_covered':navi3,'total_covered':navi2+navi3,'radar_q21_answer':q21['정답']},ensure_ascii=False))
