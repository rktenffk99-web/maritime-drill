from pathlib import Path
import re, json, base64, gzip
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

def decode_scripts():
    out={}
    for m in re.finditer(r'<script[^>]*id=["\']([^"\']+)["\'][^>]*>(.*?)</script>',src,re.S|re.I):
        sid=m.group(1); body=m.group(2).strip()
        try: out[sid]=gzip.decompress(base64.b64decode(body)).decode('utf-8')
        except Exception: pass
    return out

scripts=decode_scripts(); exam_rows=[]; questions=[]
for sid,raw in scripts.items():
    if not re.match(r'md-bundle-past-2026-navi[23]-\d+_js$',sid):continue
    gm=re.search(r'(?:"gradeShort"|gradeShort)\s*:\s*"(navi[23])"',raw); sm=re.search(r'(?:"session"|session)\s*:\s*(\d+)',raw)
    if not gm or not sm:continue
    grade=gm.group(1); session=int(sm.group(1)); qrows=[]
    starts=[m.start() for m in re.finditer(r'\{\s*"번호"\s*:\s*\d+',raw)]
    for i,st in enumerate(starts):
        chunk=raw[st:starts[i+1] if i+1<len(starts) else min(len(raw),st+6000)]
        nm=re.search(r'"번호"\s*:\s*(\d+)',chunk); sub=re.search(r'"과목"\s*:\s*"([^"]+)"',chunk); qm=re.search(r'"문제"\s*:\s*"((?:\\.|[^"\\])*)"',chunk); am=re.search(r'"정답"\s*:\s*(\d+)',chunk)
        if not nm or not sub:continue
        q={'key':f"2026|{grade}|{session}|{sub.group(1)}|{int(nm.group(1))}",'grade':grade,'session':session,'subject':sub.group(1),'number':int(nm.group(1)),'question':qm.group(1) if qm else '', 'answer':int(am.group(1)) if am else None}
        questions.append(q);qrows.append(q)
    if not qrows:
        for line in raw.splitlines():
            m=re.search(r'^\s*Q\((\d+),\s*"((?:\\.|[^"\\])*)",\s*\[(.*)\],\s*(\d+),\s*"([^"]+)"',line)
            if not m:continue
            num=int(m.group(1)); subject=m.group(5)
            q={'key':f"2026|{grade}|{session}|{subject}|{num}",'grade':grade,'session':session,'subject':subject,'number':num,'question':m.group(2),'answer':int(m.group(4))}
            questions.append(q);qrows.append(q)
    exam_rows.append({'id':sid,'grade':grade,'session':session,'total':len(qrows)})

exp_raw=scripts.get('md-bundle-past-explain-2026_js','')
exp_keys=set(re.findall(r'"(2026\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:',exp_raw))
exp_len={m.group(1):len(m.group(2)) for m in re.finditer(r'"(2026\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:\s*\{\s*html:\s*"((?:\\.|[^"\\])*)"\s*,\s*loading:',exp_raw,re.S)}
missing=[q for q in questions if q['key'] not in exp_keys]
short=[{**q,'html_len':exp_len.get(q['key'],0)} for q in questions if q['key'] in exp_keys and exp_len.get(q['key'],0)<120]
summary={'exams':exam_rows,'questions_total':len(questions),'explanations_total_keys':len(exp_keys),'covered':len(questions)-len(missing),'missing':len(missing),'short':len(short)}
for grade in ('navi2','navi3'):
    g=[q for q in questions if q['grade']==grade]; gm=[q for q in missing if q['grade']==grade]
    summary[grade]={'questions':len(g),'covered':len(g)-len(gm),'missing':len(gm)}
Path('debug/2026-explanation-coverage.json').write_text(json.dumps({'summary':summary,'missing':missing,'short':short},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
