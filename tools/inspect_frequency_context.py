from pathlib import Path
import re, base64, gzip, json
from difflib import SequenceMatcher

src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
selected={
  'navi2': {'항해','운용','법규','영어','상선전문'},
  'navi3': {'항해','법규','상선전문'},
}

def load_grade(grade):
    sid=f'md-bundle-past-analysis-{grade}_js'
    m=re.search(r'<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>(.*?)</script>',src,re.S)
    if not m: raise SystemExit(f'{sid} not found')
    code=gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')
    assign=f'window.MD_NAVI_FREQUENCY["{grade}"] = '
    start=code.find(assign)
    if start<0: raise SystemExit(f'assignment not found: {grade}')
    data,_=json.JSONDecoder().raw_decode(code[start+len(assign):].lstrip())
    return data

def norm(s):
    s=(s or '').lower()
    s=re.sub(r'\s+','',s)
    return re.sub(r'[^0-9a-z가-힣]','',s)

def grams(s,n=3):
    s=norm(s)
    if len(s)<n: return {s} if s else set()
    return {s[i:i+n] for i in range(len(s)-n+1)}

def sim(a,b):
    na,nb=norm(a),norm(b)
    if not na or not nb: return (0.0,0.0)
    ga,gb=grams(na),grams(nb)
    jac=len(ga&gb)/len(ga|gb) if ga|gb else 0.0
    # Only run SequenceMatcher for remotely plausible lexical neighbors.
    if jac<0.12:
        return (0.0,jac)
    seq=SequenceMatcher(None,na,nb,autojunk=False).ratio()
    return seq,jac

def classify(seq,jac):
    if seq>=0.88 and jac>=0.55: return 'near_identical'
    if seq>=0.72 and jac>=0.30: return 'wording_variant'
    return 'new_wording'

def pct(n,d): return round(100*n/d,1) if d else 0.0

def same_year_sequential(data,subjects):
    groups=[]
    for g in data.get('groups',[]):
        if g.get('subject') not in subjects: continue
        hits=[]
        for h in g.get('hits',[]):
            try:
                y=int(h.get('year',0)); s=int(h.get('session',0))
            except: continue
            if 2020<=y<=2026 and s>0: hits.append((y,s))
        if hits:
            groups.append({'id':g.get('id'),'subject':g.get('subject'),'question':g.get('question',''),'hits':hits})
    years=sorted({y for g in groups for y,_ in g['hits']})
    out={}
    for year in years:
        sessions=sorted({s for g in groups for y,s in g['hits'] if y==year})
        if not sessions:
            continue
        first=sessions[0]
        totals={'eligible':0,'exact':0,'near_identical':0,'wording_variant':0,'new_wording':0}
        by_session={}
        for session in sessions:
            if session==first:
                continue
            current=[]
            for g in groups:
                if any(y==year and s==session for y,s in g['hits']):
                    current.append(g)
            prior=[]
            for g in groups:
                if any(y==year and s<session for y,s in g['hits']):
                    prior.append(g)
            prior_ids={g['id'] for g in prior}
            c={'eligible':len(current),'exact':0,'near_identical':0,'wording_variant':0,'new_wording':0}
            for g in current:
                if g['id'] in prior_ids:
                    c['exact']+=1; totals['exact']+=1; continue
                best=(0.0,0.0,0.0,None)
                for p in prior:
                    if p['subject']!=g['subject']: continue
                    seq,jac=sim(g['question'],p['question'])
                    score=0.65*seq+0.35*jac
                    if score>best[0]: best=(score,seq,jac,p)
                cat=classify(best[1],best[2])
                c[cat]+=1; totals[cat]+=1
            totals['eligible']+=len(current)
            for k in ('exact','near_identical','wording_variant','new_wording'):
                c[k+'Pct']=pct(c[k],c['eligible'])
            c['exactPlusNearPct']=pct(c['exact']+c['near_identical'],c['eligible'])
            c['exactPlusNearPlusVariantPct']=pct(c['exact']+c['near_identical']+c['wording_variant'],c['eligible'])
            by_session[str(session)]=c
        for k in ('exact','near_identical','wording_variant','new_wording'):
            totals[k+'Pct']=pct(totals[k],totals['eligible'])
        totals['exactPlusNearPct']=pct(totals['exact']+totals['near_identical'],totals['eligible'])
        totals['exactPlusNearPlusVariantPct']=pct(totals['exact']+totals['near_identical']+totals['wording_variant'],totals['eligible'])
        out[str(year)]={'sessions':sessions,'firstSessionExcludedFromDenominator':first,'laterSessionsCombined':totals,'byLaterSession':by_session}
    return out

result={}
for grade in ('navi2','navi3'):
    data=load_grade(grade)
    result[grade]={
      'note':data.get('meta',{}).get('note'),
      'studySubjects':sorted(selected[grade]),
      'method':{
        'denominator':'questions in later sessions of the same year; the first available session is excluded because no earlier same-year paper exists',
        'exact':'same normalized question stem appeared in an earlier session of that same year',
        'near_identical':'same subject, non-exact, SequenceMatcher >=0.88 and trigram Jaccard >=0.55',
        'wording_variant':'same subject, non-exact, SequenceMatcher >=0.72 and trigram Jaccard >=0.30',
        'warning':'lexical stem similarity only; options/answers and semantic equivalence are not included'
      },
      'byYear':same_year_sequential(data,selected[grade])
    }
Path('debug/same-year-sequential-similarity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({g:result[g]['byYear'] for g in result},ensure_ascii=False))
