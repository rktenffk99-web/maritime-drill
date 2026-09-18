from pathlib import Path
import base64, gzip, hashlib, json, re, unicodedata

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER_START='  // homework-near-duplicate-v1:start'
MARKER_END='  // homework-near-duplicate-v1:end'
POLICY='near-duplicate-v1'
GRADES=('navi2','navi3')


def extract_json_object(script, marker):
    start=script.index(marker)+len(marker)
    while start<len(script) and script[start].isspace(): start+=1
    depth=0; in_string=False; escape=False
    for i in range(start,len(script)):
        ch=script[i]
        if in_string:
            if escape: escape=False
            elif ch=='\\': escape=True
            elif ch=='"': in_string=False
            continue
        if ch=='"': in_string=True
        elif ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0: return json.loads(script[start:i+1])
    raise ValueError('unterminated JSON object')


def analysis_data(grade):
    m=re.search(rf'<script type="application/gzip" id="md-bundle-past-analysis-{grade}_js">(.*?)</script>',text,re.S)
    if not m: raise SystemExit(f'analysis bundle missing: {grade}')
    script=gzip.decompress(base64.b64decode(m.group(1))).decode('utf-8')
    marker=f'window.MD_NAVI_FREQUENCY["{grade}"] = '
    return extract_json_object(script,marker)


def training_years(data):
    meta=[int(y) for y in (data.get('meta',{}).get('years') or [])]
    hit=[]
    for group in data.get('groups') or []:
        for row in group.get('hits') or []:
            try: hit.append(int(row.get('year')))
            except Exception: pass
    all_years=sorted(set(meta+hit))
    if 2026 in all_years:
        return [y for y in all_years if y<=2026][-5:]
    partial=set(int(y) for y in (data.get('meta',{}).get('partialYears') or []))
    complete=data.get('meta',{}).get('completeYears') or [y for y in all_years if y not in partial]
    return sorted(int(y) for y in complete)[-5:]


def norm(value): return unicodedata.normalize('NFKC',str(value or '')).lower()
def compact(value): return ''.join(ch for ch in norm(value) if ch.isalnum())

def number_signature(value):
    s=re.sub(r'(?<=\d),(?=\d)','',norm(value))
    return tuple(re.findall(r'\d+(?:\.\d+)?',s))

def critical_signature(value):
    s=norm(value)
    groups=(
      (r'옳지\s*않|아닌|아니(?:다|며|면|한)?|틀린|부적절|적절하지|\bnot\b|\bexcept\b|\bincorrect\b|\bwrong\b|\bimproper\b|\bleast\b',),
      (r'최대|\bmaximum\b|\bmax\b',r'최소|\bminimum\b|\bmin\b'),
      (r'좌현|\bport\b',r'우현|\bstarboard\b'),
      (r'증가|상승|\bincrease\w*\b|\brise\w*\b',r'감소|하강|\bdecrease\w*\b|\bfall\w*\b'),
      (r'이전|\bbefore\b',r'이후|\bafter\b'),
    )
    return tuple(tuple(bool(re.search(pat,s,re.I)) for pat in group) for group in groups)


def within_edit_limit(a,b,limit):
    if a==b: return True
    if abs(len(a)-len(b))>limit: return False
    if len(a)>len(b): a,b=b,a
    m=len(a); inf=limit+1
    prev=list(range(m+1))
    for row,ch_b in enumerate(b,1):
        cur=[inf]*(m+1)
        if row<=limit: cur[0]=row
        lo=max(1,row-limit); hi=min(m,row+limit)
        row_min=inf
        for col in range(lo,hi+1):
            cur[col]=min(cur[col-1]+1,prev[col]+1,prev[col-1]+(a[col-1]!=ch_b))
            if cur[col]<row_min: row_min=cur[col]
        if row_min>limit: return False
        prev=cur
    return prev[m]<=limit


data={g:analysis_data(g) for g in GRADES}
nodes=[]
for grade,d in data.items():
    years=set(training_years(d))
    for group in d.get('groups') or []:
        hits=[h for h in (group.get('hits') or []) if int(h.get('year',0)) in years]
        if not hits: continue
        q=str(group.get('question') or '')
        nodes.append({
          'key':f"{grade}|{group.get('id')}",'grade':grade,'subject':str(group.get('subject') or ''),
          'question':q,'compact':compact(q),'numbers':number_signature(q),'critical':critical_signature(q),'hits':hits,
        })

parent=list(range(len(nodes)))
def find(x):
    while parent[x]!=x:
        parent[x]=parent[parent[x]]; x=parent[x]
    return x
def union(a,b):
    ra,rb=find(a),find(b)
    if ra!=rb:
        if ra>rb: ra,rb=rb,ra
        parent[rb]=ra

by_subject={}
for i,node in enumerate(nodes): by_subject.setdefault(node['subject'],[]).append(i)
for indexes in by_subject.values():
    indexes.sort(key=lambda i:len(nodes[i]['compact']))
    for pos,ia in enumerate(indexes):
        a=nodes[ia]; la=len(a['compact'])
        if la<18: continue
        for ib in indexes[pos+1:]:
            b=nodes[ib]; lb=len(b['compact']); max_len=max(la,lb)
            limit=max(1,int(max_len*0.02))
            if lb-la>limit: break
            if lb<18 or a['numbers']!=b['numbers'] or a['critical']!=b['critical']: continue
            if within_edit_limit(a['compact'],b['compact'],limit): union(ia,ib)

clusters={}
for i,node in enumerate(nodes): clusters.setdefault(find(i),[]).append(node)
dupe_groups=[sorted(v,key=lambda x:x['key']) for v in clusters.values() if len(v)>1]
dupe_groups.sort(key=lambda rows:rows[0]['key'])

cluster_for={}; members={}; stats={}
for rows in dupe_groups:
    digest=hashlib.sha1('|'.join(row['key'] for row in rows).encode()).hexdigest()[:10]
    cid='hd-'+digest
    keys=[r['key'] for r in rows]
    for key in keys: cluster_for[key]=cid
    members[cid]=keys
    occurrences=set(); latest=0; has2026=False
    for row in rows:
        for hit in row['hits']:
            year=int(hit.get('year',0)); latest=max(latest,year); has2026=has2026 or year==2026
            occurrences.add((row['grade'],year,int(hit.get('session',0)),str(row['subject']),int(hit.get('number',0))))
    stats[cid]={'count':len(occurrences),'latest':latest,'has2026':has2026}

helper=f'''{MARKER_START}
  const PP_HOMEWORK_DEDUPE_POLICY={json.dumps(POLICY)};
  const PP_HOMEWORK_DUPLICATE_CLUSTER=Object.freeze({json.dumps(cluster_for,ensure_ascii=False,separators=(',',':'))});
  const PP_HOMEWORK_DUPLICATE_MEMBERS=Object.freeze({json.dumps(members,ensure_ascii=False,separators=(',',':'))});
  const PP_HOMEWORK_DUPLICATE_STATS=Object.freeze({json.dumps(stats,ensure_ascii=False,separators=(',',':'))});
  function ppHomeworkClusterId(item){{return PP_HOMEWORK_DUPLICATE_CLUSTER[item&&item.key]||(item&&item.key)||''}}
  function ppHomeworkClusterMemberKeys(item){{const cid=ppHomeworkClusterId(item);return PP_HOMEWORK_DUPLICATE_MEMBERS[cid]||((item&&item.key)?[item.key]:[])}}
  function ppHomeworkClusterSeen(item,progress){{return ppHomeworkClusterMemberKeys(item).some(key=>!!ppProgressFor(progress,key).firstPassDate)}}
  function ppHomeworkClusterMastered(item,progress){{return ppHomeworkClusterMemberKeys(item).some(key=>!!ppProgressFor(progress,key).mastered)}}
  function ppHomeworkClusterStats(item){{return PP_HOMEWORK_DUPLICATE_STATS[ppHomeworkClusterId(item)]||null}}
  function ppHomeworkImportanceCount(item){{const row=ppHomeworkClusterStats(item);return row?Number(row.count)||0:Number(item&&item.count)||0}}
  function ppHomeworkImportanceLatest(item){{const row=ppHomeworkClusterStats(item);return row?Number(row.latest)||0:Number(item&&item.latest)||0}}
  function ppHomeworkHas2026(item){{const row=ppHomeworkClusterStats(item);return row?!!row.has2026:ppHas2026(item)}}
  function ppHomework2026NeedsPriority(item,progress){{return ppHomeworkHas2026(item)&&!ppHomeworkClusterMastered(item,progress)}}
  function ppHomeworkUniqueUnseen(pool,progress){{
    const byCluster=new Map();
    for(const item of (pool||[])){{
      if(ppHomeworkClusterSeen(item,progress))continue;
      const cid=ppHomeworkClusterId(item),current=byCluster.get(cid);
      if(!current){{byCluster.set(cid,item);continue}}
      const a2026=ppHas2026(item)?1:0,b2026=ppHas2026(current)?1:0;
      if(a2026>b2026||(a2026===b2026&&(Number(item.count)||0)>(Number(current.count)||0))||(a2026===b2026&&(Number(item.count)||0)===(Number(current.count)||0)&&(Number(item.latest)||0)>(Number(current.latest)||0)))byCluster.set(cid,item);
    }}
    return [...byCluster.values()];
  }}
{MARKER_END}'''

if MARKER_START in text:
    text=re.sub(re.escape(MARKER_START)+r'.*?'+re.escape(MARKER_END),helper,text,count=1,flags=re.S)
else:
    anchor='  function ppPhaseForGrade(plan,gradeId,pool,progress,today){'
    if anchor not in text: raise SystemExit('ppPhaseForGrade anchor missing')
    text=text.replace(anchor,helper+'\n'+anchor,1)

phase_fn="""  function ppPhaseForGrade(plan,gradeId,pool,progress,today){
    const exam=ppExamDay(plan,gradeId),dday=ppDiffDays(today,exam);
    const finalDays=Number(plan.finalDays)||4;
    const unseenPool=ppHomeworkUniqueUnseen(pool,progress);
    const current2026Remaining=unseenPool.filter(item=>ppHomework2026NeedsPriority(item,progress));
    const current2026Unseen=current2026Remaining;
    const freqRemaining=unseenPool.filter(item=>ppHomeworkImportanceCount(item)>=2);
    const stage1Unseen=[...current2026Unseen,...freqRemaining.filter(item=>!ppHomeworkHas2026(item))];
    const allRemaining=unseenPool;
    const final=dday!==null&&dday>=0&&dday<=finalDays;
    if(final){
      const candidates=stage1Unseen.length?stage1Unseen:allRemaining;
      return {phase:'final',label:stage1Unseen.length?'시험 직전 · 전범위 1회독 보장 + 2026/빈출 우선 + 취약 복습':'시험 직전 · 전범위 1회독 보장 + 취약 복습',dday,freqRemaining,current2026Remaining,allRemaining,candidates,learningDays:Math.max(1,dday+1)};
    }
    if(stage1Unseen.length){
      const learningDays=Math.max(1,(dday===null?14:dday+1)-finalDays);
      const stageDays=Math.max(1,Math.ceil(learningDays*0.45));
      return {phase:'stage1',label:'1단계 · 전범위 1회독 보장 + 2026/빈출 우선 + 취약 복습',dday,freqRemaining,current2026Remaining,allRemaining,candidates:stage1Unseen,learningDays:stageDays};
    }
    const learningDays=Math.max(1,(dday===null?10:dday+1)-finalDays);
    return {phase:'stage2',label:'2단계 · 전범위 1회독 보장 + 최근 5개년 전체 + 취약 복습',dday,freqRemaining,current2026Remaining,allRemaining,candidates:allRemaining,learningDays};
  }"""
pattern=r"  function ppPhaseForGrade\(plan,gradeId,pool,progress,today\)\{.*?\n  \}(?=\n  function ppIsDue)"
text,n=re.subn(pattern,phase_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppPhaseForGrade replacement failed')

build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // knowledge-gap-priority-v4-dedupe
    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const priority=ppPriorityProfile(plan,today);
    const allItems=PLAN_GRADES.flatMap(g=>(plan.grades[g].enabled&&plan.grades[g].examDate)?(pools[g]||[]):[]);
    const phases={},requests={navi2:0,navi3:0};

    PLAN_GRADES.forEach(g=>{
      if(!plan.grades[g].enabled||!plan.grades[g].examDate){phases[g]=null;return}
      const phase=ppPhaseForGrade(plan,g,pools[g]||[],progress,today);phases[g]=phase;
      const remaining=phase.allRemaining||[];
      const daysLeft=phase.dday===null?Math.max(1,phase.learningDays||1):Math.max(1,phase.dday+1);
      requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;
    });

    const due=allItems.filter(item=>ppIsDue(ppProgressFor(progress,item.key),today)).sort((a,b)=>ppUrgentSort(a,b,progress));
    function reviewTier(item){
      const r=ppProgressFor(progress,item.key),attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
      if(r.status==='weak'||r.lastOutcome==='wrong'||r.lastOutcome==='unsure'||(Number(r.wrong)||0)>0&&accuracy<0.75)return 2;
      if(!r.mastered||attempts<3||accuracy<0.85)return 1;
      return 0;
    }
    const weakDue=due.filter(item=>reviewTier(item)===2);
    const normalDue=due.filter(item=>reviewTier(item)===1);
    const strongDue=due.filter(item=>reviewTier(item)===0);
    const requestedNew=PLAN_GRADES.reduce((sum,g)=>sum+(requests[g]||0),0);
    const requiredNew=Math.min(cap,requestedNew);
    const dueSelected=[],newItems=[],selectedKeys=new Set(),selectedClusters=new Set();
    const reviewByGrade={navi2:0,navi3:0},newByGrade={navi2:0,navi3:0};

    function sortedNewCandidates(g){
      const phase=phases[g];if(!phase)return [];
      const preferred=new Set((phase.candidates||[]).map(item=>item.key));
      const candidates=(phase.allRemaining||[]).filter(item=>!ppHomeworkClusterSeen(item,progress)&&!selectedKeys.has(item.key)&&!selectedClusters.has(ppHomeworkClusterId(item)));
      const weakProfile=ppLoadWeakTopicProfile();
      candidates.sort((a,b)=>ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)||(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(ppHomework2026NeedsPriority(b,progress)?1:0)-(ppHomework2026NeedsPriority(a,progress)?1:0)||ppHomeworkImportanceCount(b)-ppHomeworkImportanceCount(a)||ppHomeworkImportanceLatest(b)-ppHomeworkImportanceLatest(a));
      return candidates;
    }
    function takeReview(item){
      if(!item||selectedKeys.has(item.key))return false;
      const cid=ppHomeworkClusterId(item);if(selectedClusters.has(cid))return false;
      dueSelected.push(item);selectedKeys.add(item.key);selectedClusters.add(cid);reviewByGrade[item.gradeId]=(reviewByGrade[item.gradeId]||0)+1;return true;
    }
    function takeNew(item){
      if(!item||selectedKeys.has(item.key)||ppHomeworkClusterSeen(item,progress))return false;
      const cid=ppHomeworkClusterId(item);if(selectedClusters.has(cid))return false;
      newItems.push(item);selectedKeys.add(item.key);selectedClusters.add(cid);newByGrade[item.gradeId]=(newByGrade[item.gradeId]||0)+1;return true;
    }
    function takeReviewList(list,g,target,used){
      for(const item of list){
        if(used[g]>=target)break;
        if(item.gradeId!==g||selectedKeys.has(item.key)||selectedClusters.has(ppHomeworkClusterId(item)))continue;
        if(takeReview(item))used[g]++;
      }
    }
    function globalNewRows(){
      const rows=[];
      PLAN_GRADES.forEach(g=>{
        const phase=phases[g];if(!phase)return;
        const preferred=new Set((phase.candidates||[]).map(item=>item.key));
        const weakProfile=ppLoadWeakTopicProfile();
        (phase.allRemaining||[]).forEach(item=>{
          if(ppHomeworkClusterSeen(item,progress)||selectedKeys.has(item.key)||selectedClusters.has(ppHomeworkClusterId(item)))return;
          rows.push({item,preferred:preferred.has(item.key),boost:ppWeakTopicBoost(item,weakProfile),priority:Number(priority[g])||0});
        });
      });
      rows.sort((a,b)=>b.priority-a.priority||b.boost-a.boost||(b.preferred?1:0)-(a.preferred?1:0)||(ppHomework2026NeedsPriority(b.item,progress)?1:0)-(ppHomework2026NeedsPriority(a.item,progress)?1:0)||ppHomeworkImportanceCount(b.item)-ppHomeworkImportanceCount(a.item)||ppHomeworkImportanceLatest(b.item)-ppHomeworkImportanceLatest(a.item));
      return rows;
    }

    if(priority.mode==='auto'){
      const quotas=ppAllocateNewSlots(requests,requiredNew);
      PLAN_GRADES.forEach(g=>{
        if(!phases[g]||!quotas[g])return;
        let picked=0;
        for(const item of sortedNewCandidates(g)){if(picked>=quotas[g])break;if(takeNew(item))picked++}
      });
      let fill=Math.max(0,cap-selectedKeys.size);
      for(const item of weakDue){if(fill<=0)break;if(takeReview(item))fill--}
      if(fill>0){for(const row of globalNewRows()){if(fill<=0)break;if(takeNew(row.item))fill--}}
      for(const item of normalDue){if(fill<=0)break;if(takeReview(item))fill--}
      for(const item of strongDue){if(fill<=0)break;if(takeReview(item))fill--}
    }else{
      const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);
      const used={navi2:0,navi3:0};
      PLAN_GRADES.forEach(g=>{
        const target=Math.max(0,totalQuotas[g]||0);if(!target||!phases[g])return;
        takeReviewList(weakDue,g,target,used);
        if(used[g]<target){for(const item of sortedNewCandidates(g)){if(used[g]>=target)break;if(takeNew(item))used[g]++}}
        if(used[g]<target)takeReviewList(normalDue,g,target,used);
        if(used[g]<target)takeReviewList(strongDue,g,target,used);
      });
      let fill=Math.max(0,cap-selectedKeys.size);
      for(const item of weakDue){if(fill<=0)break;if(takeReview(item))fill--}
      if(fill>0){for(const row of globalNewRows()){if(fill<=0)break;if(takeNew(row.item))fill--}}
      for(const item of normalDue){if(fill<=0)break;if(takeReview(item))fill--}
      for(const item of strongDue){if(fill<=0)break;if(takeReview(item))fill--}
    }

    const ordered=[];let ri=0,ni=0;
    while(ri<dueSelected.length||ni<newItems.length){
      if(ri>=dueSelected.length){ordered.push(newItems[ni++]);continue}
      if(ni>=newItems.length){ordered.push(dueSelected[ri++]);continue}
      const reviewProgress=ri/Math.max(1,dueSelected.length),newProgress=ni/Math.max(1,newItems.length);
      if(reviewProgress<=newProgress)ordered.push(dueSelected[ri++]);else ordered.push(newItems[ni++]);
    }

    const coverageAtRisk=priority.mode==='auto'?requestedNew>cap:PLAN_GRADES.some(g=>(requests[g]||0)>(newByGrade[g]||0));
    const totalQuotas=priority.mode==='auto'?null:ppPriorityFlexQuotas(plan,today,cap);
    const dueClusterCount=new Set(due.map(item=>ppHomeworkClusterId(item))).size;
    const deferredStrongReviewCount=new Set(strongDue.filter(item=>!selectedClusters.has(ppHomeworkClusterId(item))).map(item=>ppHomeworkClusterId(item))).size;
    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,requiredNew,dueOverflow:Math.max(0,dueClusterCount-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requiredNew-newItems.length),coverageAtRisk,priorityMode:priority.mode,priorityLabel:priority.label,priorityProfile:{navi2:priority.navi2,navi3:priority.navi3},quotaTarget:totalQuotas,gradeCounts:{navi2:{review:reviewByGrade.navi2,new:newByGrade.navi2},navi3:{review:reviewByGrade.navi3,new:newByGrade.navi3}},deferredStrongReviewCount,rotationPolicy:'knowledge-gap-priority-v4-dedupe',duplicatePolicy:PP_HOMEWORK_DEDUPE_POLICY};
  }"""
pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppBuildTodayAssignment replacement failed')

text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'knowledge-gap-priority-v4-dedupe'",text,count=1)
if n!=1:
    text,n=re.subn(r"revision:plan\.revision,grades:\{\}","revision:plan.revision,assignmentPolicy:'knowledge-gap-priority-v4-dedupe',grades:{}",text,count=1)
if n!=1: raise SystemExit('assignmentPolicy marker not found')

has_checkpoint='function ppSavePassSessionCheckpoint' in text and 'function ppLoadPassSessionCheckpoint' in text
if has_checkpoint:
    if 'dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY' not in text:
        text=text.replace("version:2,date:ppDateKey(new Date()),savedAt:new Date().toISOString(),","version:2,dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY,date:ppDateKey(new Date()),savedAt:new Date().toISOString(),",1)
    if "cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY" not in text:
        text=text.replace("if(!cp||cp.version!==2||cp.date!==ppDateKey(new Date())||!Array.isArray(cp.queueKeys)){","if(!cp||cp.version!==2||cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY||cp.date!==ppDateKey(new Date())||!Array.isArray(cp.queueKeys)){",1)

required=[
  MARKER_START,MARKER_END,"assignmentPolicy:'knowledge-gap-priority-v4-dedupe'",
  "rotationPolicy:'knowledge-gap-priority-v4-dedupe'",'selectedClusters=new Set()',
  'ppHomeworkClusterSeen(item,progress)','ppHomeworkImportanceCount(item)'
]
if has_checkpoint: required += ['dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY','cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY']
for needle in required:
    if needle not in text: raise SystemExit(f'missing homework duplicate guard marker: {needle}')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print(f'patched homework near-duplicate guard: {len(dupe_groups)} clusters, {sum(len(v) for v in dupe_groups)} members, {sum(len(v)-1 for v in dupe_groups)} redundant entries')
else:
    print('homework near-duplicate guard already current')
