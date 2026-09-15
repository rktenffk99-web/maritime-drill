from pathlib import Path
import re, base64, gzip, json, statistics

src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

def decode_script(body):
    body=body.strip()
    if not body:return ''
    try:
        raw=base64.b64decode(re.sub(r'\s+','',body), validate=True)
        try:return gzip.decompress(raw).decode('utf-8')
        except Exception:
            try:return raw.decode('utf-8')
            except Exception:return body
    except Exception:return body

scripts=[]
for m in re.finditer(r'<script([^>]*)>(.*?)</script>',src,re.S|re.I):
    attrs=m.group(1); body=m.group(2)
    mid=re.search(r'\bid=["\']([^"\']+)["\']',attrs,re.I)
    sid=mid.group(1) if mid else '(no-id)'
    scripts.append((sid,decode_script(body)))

# Parse all past-paper payloads for navi2/navi3.
exams=[]
for sid,text in scripts:
    if 'md-bundle-past-' not in sid or '-explain-' in sid: continue
    marker='const PAYLOAD = '
    pos=text.find(marker)
    if pos<0: continue
    frag=text[pos+len(marker):].lstrip()
    try: payload,_=json.JSONDecoder().raw_decode(frag)
    except Exception: continue
    meta=payload.get('meta',{})
    if meta.get('gradeShort') in ('navi2','navi3'):
        exams.append(payload)

# Parse explanation entries.
explains={}
entry_re=re.compile(r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*\{\s*html\s*:\s*("(?:\\.|[^"\\])*")',re.S)
for sid,text in scripts:
    if 'explain' not in sid.lower() and 'MD_EXPLAIN' not in text: continue
    for m in entry_re.finditer(text):
        try:key=json.loads('"'+m.group(1)+'"')
        except Exception:key=m.group(1)
        try:html=json.loads(m.group(2))
        except Exception:html=m.group(2)[1:-1]
        explains[key]=html

def qid(meta,q): return f"{meta.get('year')}|{meta.get('gradeShort')}|{meta.get('session')}|{q.get('과목','?')}|{q.get('번호','?')}"
def norm(s): return re.sub(r'[^0-9A-Za-z가-힣]+','',str(s or '')).lower()
def choice_sig(q): return tuple(norm(x) for x in q.get('선택지',[]))

allqs=[]
for ex in exams:
    meta=ex['meta']
    for q in ex.get('questions',[]): allqs.append((meta,q,qid(meta,q)))
prev_exact={};prev_text={}
for meta,q,id_ in allqs:
    if int(meta.get('year',0))>=2026: continue
    prev_exact.setdefault((meta.get('gradeShort'),q.get('과목'),norm(q.get('문제')),choice_sig(q),q.get('정답')),[]).append((meta,q,id_))
    prev_text.setdefault((meta.get('gradeShort'),q.get('과목'),norm(q.get('문제')),q.get('정답')),[]).append((meta,q,id_))

report={'grades':{},'missing':[],'short_or_placeholder':[]}
for grade in ('navi2','navi3'):
    rows=[]
    for meta,q,id_ in allqs:
        if meta.get('gradeShort')==grade and int(meta.get('year',0))==2026:
            html=explains.get(id_)
            visible=re.sub('<[^>]+>','',html or '').strip()
            status='present' if html and len(visible)>=80 else ('short' if html else 'missing')
            exact=prev_exact.get((grade,q.get('과목'),norm(q.get('문제')),choice_sig(q),q.get('정답')),[])
            same_text=prev_text.get((grade,q.get('과목'),norm(q.get('문제')),q.get('정답')),[])
            reusable=[x for x in exact if x[2] in explains and len(explains[x[2]])>=80]
            text_reusable=[x for x in same_text if x[2] in explains and len(explains[x[2]])>=80]
            row={'id':id_,'session':meta.get('session'),'subject':q.get('과목'),'number':q.get('번호'),'question':q.get('문제'),'answer':q.get('정답'),'status':status,'explanation_chars':len(html or ''),'exact_reusable_ids':[x[2] for x in reusable[-5:]],'same_text_reusable_ids':[x[2] for x in text_reusable[-5:]]}
            rows.append(row)
            if status=='missing':report['missing'].append(row)
            elif status=='short':report['short_or_placeholder'].append(row)
    by_subject={};by_session={}
    for r in rows:
        b=by_subject.setdefault(r['subject'],{'total':0,'present':0,'short':0,'missing':0});b['total']+=1;b[r['status']]+=1
        s=by_session.setdefault(str(r['session']),{'total':0,'present':0,'short':0,'missing':0,'subjects':{}});s['total']+=1;s[r['status']]+=1;s['subjects'][r['subject']]=s['subjects'].get(r['subject'],0)+1
    lengths=[r['explanation_chars'] for r in rows if r['explanation_chars']]
    report['grades'][grade]={'total':len(rows),'present':sum(r['status']=='present' for r in rows),'short':sum(r['status']=='short' for r in rows),'missing':sum(r['status']=='missing' for r in rows),'median_explanation_chars':int(statistics.median(lengths)) if lengths else 0,'by_subject':by_subject,'by_session':by_session,'rows':rows}

# Inspect runtime explanation loader and bundle manifest usage.
loader=[]
for needle in ['async function ensurePastExplainForYears','function ensurePastExplainForYears','past-explain-${year}','md-bundle-past-explain','ensureEmbeddedBundle']:
    start=0
    while True:
        pos=src.find(needle,start)
        if pos<0:break
        loader.append({'needle':needle,'pos':pos,'snippet':src[max(0,pos-2200):pos+5000]})
        start=pos+1
report['loader']=loader

Path('debug/2026-explanation-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
summary={g:{k:v for k,v in report['grades'][g].items() if k!='rows'} for g in ('navi2','navi3')}
summary['loader_hits']=[{'needle':x['needle'],'pos':x['pos']} for x in loader]
Path('debug/2026-explanation-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
Path('debug/2026-explanation-loader.txt').write_text('\n\n=====\n\n'.join(x['snippet'] for x in loader),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
