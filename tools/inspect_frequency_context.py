from pathlib import Path
import re, base64, gzip, json
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
selected={
  'navi2': {'항해','운용','법규','영어','상선전문'},
  'navi3': {'항해','법규','상선전문'},
}
results={}
for grade in ('navi2','navi3'):
    sid=f'md-bundle-past-analysis-{grade}_js'
    m=re.search(r'<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>(.*?)</script>',src,re.S)
    if not m: raise SystemExit(f'{sid} not found')
    code=gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')
    assign=f'window.MD_NAVI_FREQUENCY["{grade}"] = '
    start=code.find(assign)
    if start<0: raise SystemExit(f'assignment not found for {grade}')
    start += len(assign)
    fragment=code[start:].lstrip()
    data,_=json.JSONDecoder().raw_decode(fragment)
    meta_years=[int(y) for y in data.get('meta',{}).get('years',[])]
    hit_years=[int(h['year']) for g in data.get('groups',[]) for h in g.get('hits',[]) if str(h.get('year','')).isdigit()]
    years=sorted(set(meta_years+hit_years))
    training=[y for y in years if y<=2026][-5:] if 2026 in years else years[-5:]
    per_subject={}
    freq=has26=overlap=union=0
    raw26=0
    total_groups=0
    for group in data.get('groups',[]):
        subject=group.get('subject')
        if subject not in selected[grade]: continue
        total_groups += 1
        hits=[h for h in group.get('hits',[]) if int(h.get('year',0)) in training]
        count=len(hits)
        f=count>=2
        h26=any(int(h.get('year',0))==2026 for h in hits)
        raw26_here=sum(1 for h in hits if int(h.get('year',0))==2026)
        raw26 += raw26_here
        if f: freq+=1
        if h26: has26+=1
        if f and h26: overlap+=1
        if f or h26: union+=1
        s=per_subject.setdefault(subject,{'freq':0,'has2026':0,'overlap':0,'union':0,'raw2026':0})
        if f: s['freq']+=1
        if h26: s['has2026']+=1
        if f and h26: s['overlap']+=1
        if f or h26: s['union']+=1
        s['raw2026'] += raw26_here
    results[grade]={
      'trainingYears':training,
      'selectedSubjects':sorted(selected[grade]),
      'totalUniqueGroupsInSelectedSubjects':total_groups,
      'frequentGroupsCount2Plus':freq,
      'groupsWith2026Hit':has26,
      'overlapFrequentAnd2026':overlap,
      'priorityUnionUniqueGroups':union,
      'raw2026Occurrences':raw26,
      'meta':{k:data.get('meta',{}).get(k) for k in ['examCount','questionCount','uniqueQuestionCount','repeatedGroupCount','note']},
      'bySubject':per_subject,
    }
results['combined']={
 'frequentGroupsCount2Plus':sum(results[g]['frequentGroupsCount2Plus'] for g in ('navi2','navi3')),
 'groupsWith2026Hit':sum(results[g]['groupsWith2026Hit'] for g in ('navi2','navi3')),
 'overlapFrequentAnd2026':sum(results[g]['overlapFrequentAnd2026'] for g in ('navi2','navi3')),
 'priorityUnionUniqueGroups':sum(results[g]['priorityUnionUniqueGroups'] for g in ('navi2','navi3')),
 'raw2026Occurrences':sum(results[g]['raw2026Occurrences'] for g in ('navi2','navi3')),
}
Path('debug/priority-counts.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results['combined'],ensure_ascii=False))
