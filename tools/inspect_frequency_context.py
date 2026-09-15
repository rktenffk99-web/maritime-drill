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
    s=re.sub(r'[^0-9a-z가-힣]','',s)
    return s

def grams(s,n=3):
    s=norm(s)
    if len(s)<n: return {s} if s else set()
    return {s[i:i+n] for i in range(len(s)-n+1)}

def sim(a,b):
    na,nb=norm(a),norm(b)
    if not na or not nb: return (0.0,0.0)
    seq=SequenceMatcher(None,na,nb,autojunk=False).ratio()
    ga,gb=grams(na),grams(nb)
    jac=len(ga&gb)/len(ga|gb) if ga|gb else 0.0
    return seq,jac

def classify(seq,jac):
    # Conservative wording-based buckets; not semantic embeddings.
    if seq>=0.88 and jac>=0.55: return 'near_identical'
    if seq>=0.72 and jac>=0.30: return 'wording_variant'
    return 'new_wording'

def pct(n,d): return round(100*n/d,1) if d else 0.0

def analyze_grade(data,subjects):
    groups=[]
    for g in data.get('groups',[]):
        if g.get('subject') not in subjects: continue
        years=sorted({int(h.get('year')) for h in g.get('hits',[]) if str(h.get('year','')).isdigit()})
        if not years: continue
        groups.append({'id':g.get('id'),'subject':g.get('subject'),'question':g.get('question',''),'years':years,'hits':g.get('hits',[])})
    years=sorted({y for g in groups for y in g['years'] if 2020<=y<=2026})
    by_year={}
    examples_2026=[]
    for year in years:
        cur=[g for g in groups if year in g['years']]
        prior=[g for g in groups if any(y<year for y in g['years'])]
        prior_ids={g['id'] for g in prior}
        counts={'exact':0,'near_identical':0,'wording_variant':0,'new_wording':0}
        score_sum=0.0
        nonexact_n=0
        for g in cur:
            if g['id'] in prior_ids:
                counts['exact']+=1
                if year==2026:
                    pg=max((p for p in prior if p['id']==g['id']),key=lambda x:max(y for y in x['years'] if y<year))
                    examples_2026.append({'category':'exact','subject':g['subject'],'current':g['question'],'prior':pg['question'],'bestSeqPct':100.0,'bestTrigramPct':100.0})
                continue
            candidates=[p for p in prior if p['subject']==g['subject']]
            best=None
            for p in candidates:
                s,j=sim(g['question'],p['question'])
                score=0.65*s+0.35*j
                if best is None or score>best[0]: best=(score,s,j,p)
            if best is None:
                cat='new_wording'; s=j=0.0; p=None
            else:
                _,s,j,p=best
                cat=classify(s,j)
                score_sum += 0.65*s+0.35*j
                nonexact_n += 1
            counts[cat]+=1
            if year==2026 and cat!='new_wording' and p is not None:
                examples_2026.append({'category':cat,'subject':g['subject'],'current':g['question'],'prior':p['question'],'bestSeqPct':round(s*100,1),'bestTrigramPct':round(j*100,1),'priorYears':[y for y in p['years'] if y<year]})
        total=len(cur)
        # Same-year exact stem recurrence across sessions: count later occurrences whose stem appeared in an earlier session that year.
        within_total=0; within_repeat=0
        for g in cur:
            sessions=sorted(int(h.get('session',0)) for h in g['hits'] if int(h.get('year',0))==year)
            if sessions:
                within_total += len(sessions)
                if len(sessions)>1: within_repeat += len(sessions)-1
        by_year[str(year)]={
            'uniqueQuestionStems':total,
            'exactPrior':counts['exact'],'exactPriorPct':pct(counts['exact'],total),
            'nearIdenticalNonExact':counts['near_identical'],'nearIdenticalNonExactPct':pct(counts['near_identical'],total),
            'wordingVariantNonExact':counts['wording_variant'],'wordingVariantNonExactPct':pct(counts['wording_variant'],total),
            'newWording':counts['new_wording'],'newWordingPct':pct(counts['new_wording'],total),
            'exactPlusNearPct':pct(counts['exact']+counts['near_identical'],total),
            'exactPlusNearPlusVariantPct':pct(counts['exact']+counts['near_identical']+counts['wording_variant'],total),
            'sameYearOccurrences':within_total,
            'sameYearExactRepeatLaterOccurrences':within_repeat,
            'sameYearExactRepeatPctOfOccurrences':pct(within_repeat,within_total),
            'avgBestLexicalScoreAmongNonExactPct':round(score_sum/nonexact_n*100,1) if nonexact_n else 0.0,
        }
    # keep most convincing 2026 non-exact examples + a few exact
    rank={'near_identical':0,'wording_variant':1,'exact':2}
    examples_2026=sorted(examples_2026,key=lambda x:(rank.get(x['category'],9),-x.get('bestSeqPct',0),-x.get('bestTrigramPct',0)))[:30]
    return {'years':years,'byYear':by_year,'examples2026':examples_2026}

out={}
for grade in ('navi2','navi3'):
    data=load_grade(grade)
    out[grade]={
      'note':data.get('meta',{}).get('note'),
      'method':{
        'exact':'same normalized question stem group appeared in any earlier year',
        'near_identical':'non-exact, same subject, SequenceMatcher >= 0.88 AND trigram Jaccard >= 0.55',
        'wording_variant':'non-exact, same subject, SequenceMatcher >= 0.72 AND trigram Jaccard >= 0.30',
        'new_wording':'below wording-variant threshold',
        'warning':'wording similarity only; choices/answers and semantic equivalence are not included in this derived frequency dataset'
      },
      'studySubjects':sorted(selected[grade]),
      'analysis':analyze_grade(data,selected[grade])
    }
Path('debug/lexical-similarity-analysis.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
compact={g:out[g]['analysis']['byYear'] for g in out}
Path('debug/lexical-similarity-compact.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(compact,ensure_ascii=False))
