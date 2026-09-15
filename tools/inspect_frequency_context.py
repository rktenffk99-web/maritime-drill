from pathlib import Path
import re, base64, gzip, json
from collections import defaultdict

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
    if start<0: raise SystemExit(f'assignment not found for {grade}')
    fragment=code[start+len(assign):].lstrip()
    data,_=json.JSONDecoder().raw_decode(fragment)
    return data

def yearly_stats(data, subjects=None):
    groups=[]
    for g in data.get('groups',[]):
        if subjects is not None and g.get('subject') not in subjects:
            continue
        hits=[]
        for h in g.get('hits',[]):
            try: year=int(h.get('year',0))
            except: continue
            if year: hits.append({**h,'year':year})
        if hits: groups.append((g,hits))
    years=sorted({h['year'] for _,hits in groups for h in hits})
    out={}
    sets={}
    for year in years:
        year_groups=[]
        total_occ=0
        same_year_extra=0
        prior_occ=0
        prior_unique=0
        for g,hits in groups:
            cur=[h for h in hits if h['year']==year]
            if not cur: continue
            year_groups.append(g.get('id'))
            total_occ += len(cur)
            if len(cur)>1: same_year_extra += len(cur)-1
            prior=any(h['year']<year for h in hits)
            if prior:
                prior_unique += 1
                prior_occ += len(cur)
        unique_ids=set(year_groups)
        sets[year]=unique_ids
        prev=year-1
        prev_overlap=len(unique_ids & sets.get(prev,set())) if prev in sets else 0
        out[str(year)]={
            'occurrences': total_occ,
            'uniqueQuestions': len(unique_ids),
            'seenInAnyPriorYearUnique': prior_unique,
            'seenInAnyPriorYearRatePct': round(prior_unique/len(unique_ids)*100,1) if unique_ids else 0,
            'occurrencesFromPriorQuestionPct': round(prior_occ/total_occ*100,1) if total_occ else 0,
            'sameYearDuplicateOccurrences': same_year_extra,
            'sameYearDuplicateRatePct': round(same_year_extra/total_occ*100,1) if total_occ else 0,
            'overlapWithPreviousYearUnique': prev_overlap,
            'overlapWithPreviousYearRatePct': round(prev_overlap/len(unique_ids)*100,1) if unique_ids else 0,
        }
    # pairwise: share of target-year unique questions exactly present in source year
    matrix={}
    for target in years:
        row={}
        for source in years:
            if source>=target: continue
            inter=len(sets[target] & sets[source])
            row[str(source)]={
                'count':inter,
                'targetCoveragePct':round(inter/len(sets[target])*100,1) if sets[target] else 0,
                'jaccardPct':round(inter/len(sets[target]|sets[source])*100,1) if (sets[target]|sets[source]) else 0,
            }
        matrix[str(target)]=row
    return {'years':years,'byYear':out,'pairwiseEarlierYearOverlap':matrix}

results={}
for grade in ('navi2','navi3'):
    data=load_grade(grade)
    results[grade]={
        'meta':{k:data.get('meta',{}).get(k) for k in ['years','completeYears','partialYears','examCount','questionCount','uniqueQuestionCount','repeatedGroupCount','note','originMethod','originRule']},
        'allSubjects':yearly_stats(data,None),
        'studySubjects':yearly_stats(data,selected[grade]),
        'studySubjectList':sorted(selected[grade]),
    }

# Compact 2026 comparison useful for current study plan
for grade in ('navi2','navi3'):
    ys=results[grade]['studySubjects']['byYear'].get('2026',{})
    pair=results[grade]['studySubjects']['pairwiseEarlierYearOverlap'].get('2026',{})
    results[grade]['study2026Summary']={
        **ys,
        'exactCoverageByEarlierYear':pair,
    }

Path('debug/yearly-repeat-analysis.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({g:results[g]['study2026Summary'] for g in ('navi2','navi3')},ensure_ascii=False))
