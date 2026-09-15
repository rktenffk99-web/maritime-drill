from pathlib import Path
import re,json,base64,gzip,html
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

def scripts():
 out={}
 for m in re.finditer(r'<script[^>]*id=["\']([^"\']+)["\'][^>]*>(.*?)</script>',src,re.S|re.I):
  try: out[m.group(1)]=gzip.decompress(base64.b64decode(m.group(2).strip())).decode('utf-8')
  except: pass
 return out
S=scripts()
def norm(s): return re.sub(r'\s+','',str(s or '')).replace('ㆍ','·')
def parse_q_script(sid,raw):
 ym=re.search(r'past-(\d{4})-navi([23])-(\d+)_js$',sid)
 if not ym:return []
 year=int(ym.group(1));grade='navi'+ym.group(2);session=int(ym.group(3));out=[]
 # compact Q(...) one-line format
 for line in raw.splitlines():
  m=re.search(r'^\s*Q\((\d+),\s*"((?:\\.|[^"\\])*)",\s*(\[(?:\\.|[^\n])*\]),\s*(\d+),\s*"([^"]+)"',line)
  if m:
   try: choices=json.loads(m.group(3))
   except: choices=[]
   try: question=json.loads('"'+m.group(2)+'"')
   except: question=m.group(2)
   out.append({'year':year,'grade':grade,'session':session,'number':int(m.group(1)),'subject':m.group(5),'question':question,'choices':choices,'answer':int(m.group(4))})
 if out:return out
 # pretty object format
 starts=[m.start() for m in re.finditer(r'\{\s*"번호"\s*:\s*\d+',raw)]
 for i,st in enumerate(starts):
  ch=raw[st:starts[i+1] if i+1<len(starts) else min(len(raw),st+7000)]
  nm=re.search(r'"번호"\s*:\s*(\d+)',ch); sub=re.search(r'"과목"\s*:\s*"([^"]+)"',ch); qm=re.search(r'"문제"\s*:\s*"((?:\\.|[^"\\])*)"',ch); am=re.search(r'"정답"\s*:\s*(\d+)',ch); cm=re.search(r'"선택지"\s*:\s*(\[[\s\S]*?\])\s*,\s*"회차"',ch)
  if not(nm and sub and qm and am):continue
  try:q=json.loads('"'+qm.group(1)+'"')
  except:q=qm.group(1)
  try:c=json.loads(cm.group(1)) if cm else []
  except:c=[]
  out.append({'year':year,'grade':grade,'session':session,'number':int(nm.group(1)),'subject':sub.group(1),'question':q,'choices':c,'answer':int(am.group(1))})
 return out
questions=[]
for sid,raw in S.items():
 if 'md-bundle-past-' in sid and ('-navi2-' in sid or '-navi3-' in sid):questions += parse_q_script(sid,raw)
# explanation keys only; reuse source if a prior exam has an existing explanation
exp_keys=set()
for sid,raw in S.items():
 if 'past-explain-' not in sid:continue
 exp_keys.update(re.findall(r'"((?:202[0-6])\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:',raw))
for q in questions:q['key']=f"{q['year']}|{q['grade']}|{q['session']}|{q['subject']}|{q['number']}"
target=[q for q in questions if q['year']==2026 and q['grade']=='navi3' and q['session']==3]
prior=[q for q in questions if q['year']<2026]
exact=[];qonly=[];none=[]
for t in target:
 sig=(norm(t['question']), tuple(norm(x) for x in t['choices']), t['answer'])
 cand=[p for p in prior if p['key'] in exp_keys and (norm(p['question']),tuple(norm(x) for x in p['choices']),p['answer'])==sig]
 if cand:
  cand=sorted(cand,key=lambda x:(x['year'],x['session']),reverse=True);exact.append({'target':t,'source':cand[0]}) ;continue
 cand=[p for p in prior if p['key'] in exp_keys and norm(p['question'])==norm(t['question']) and p['answer']==t['answer']]
 if cand:
  cand=sorted(cand,key=lambda x:(x['year'],x['session']),reverse=True);qonly.append({'target':t,'source':cand[0]})
 else:none.append(t)
out={'summary':{'target':len(target),'exact_question_choices_answer':len(exact),'question_answer_only':len(qonly),'no_match':len(none)},'exact':exact,'qonly':qonly,'none':none}
Path('debug/2026-session3-explanation-matches.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out['summary'],ensure_ascii=False))
