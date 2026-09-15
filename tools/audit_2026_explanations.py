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

def payload_from_js(raw):
    marker='const PAYLOAD = '
    pos=raw.find(marker)
    if pos<0:return None
    frag=raw[pos+len(marker):].lstrip()
    obj,_=json.JSONDecoder().raw_decode(frag)
    return obj

scripts=decode_scripts()
exam_rows=[]
questions=[]
for sid,raw in scripts.items():
    if not sid.startswith('md-bundle-past-2026-navi'):continue
    p=payload_from_js(raw)
    if not p:continue
    meta=p.get('meta',{})
    if meta.get('gradeShort') not in ('navi2','navi3'):continue
    qs=p.get('questions',[])
    exam_rows.append({'id':meta.get('id'),'grade':meta.get('gradeShort'),'session':meta.get('session'),'total':len(qs)})
    for q in qs:
        questions.append({'key':f"2026|{meta.get('gradeShort')}|{meta.get('session')}|{q.get('과목')}|{q.get('번호')}",'grade':meta.get('gradeShort'),'session':meta.get('session'),'subject':q.get('과목'),'number':q.get('번호'),'question':q.get('문제'),'answer':q.get('정답'),'choices':q.get('선택지')})

exp_raw=scripts.get('md-bundle-past-explain-2026_js','')
# keys are quoted object keys inside Object.assign(window.MD_EXPLAIN,...)
exp_keys=set(re.findall(r'"(2026\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:',exp_raw))
# approximate substantive explanation: key entry contains html with at least 80 chars before loading flag
exp_len={}
for m in re.finditer(r'"(2026\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:\s*\{\s*html:\s*"((?:\\.|[^"\\])*)"\s*,\s*loading:',exp_raw,re.S):
    try: html=bytes(m.group(2),'utf-8').decode('unicode_escape')
    except Exception: html=m.group(2)
    exp_len[m.group(1)]=len(html)

missing=[q for q in questions if q['key'] not in exp_keys]
short=[{**q,'html_len':exp_len.get(q['key'],0)} for q in questions if q['key'] in exp_keys and exp_len.get(q['key'],0)<120]
summary={'exams':exam_rows,'questions_total':len(questions),'explanations_total_keys':len(exp_keys),'covered':len(questions)-len(missing),'missing':len(missing),'short':len(short)}
for grade in ('navi2','navi3'):
    g=[q for q in questions if q['grade']==grade]; gm=[q for q in missing if q['grade']==grade]
    summary[grade]={'questions':len(g),'covered':len(g)-len(gm),'missing':len(gm)}
Path('debug/2026-explanation-coverage.json').write_text(json.dumps({'summary':summary,'missing':missing,'short':short},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
