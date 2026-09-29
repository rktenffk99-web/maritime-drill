"""Balance today's homework evenly across subjects when exactly one navigator grade is enabled."""
from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='subject-balanced-homework-v1'
POLICY='knowledge-gap-priority-v5-subject-balanced'

if MARKER not in text:
    anchor='  function ppGetItemByKey'
    i=text.find(anchor)
    if i<0:
        raise SystemExit('subject-balance insertion anchor not found')
    helper=r"""  // subject-balanced-homework-v1
  const PP_SUBJECT_BALANCE_POLICY='even-subject-v1';
  function ppEvenSubjectQuotas(subjects,total,today){
    const list=[...new Set((subjects||[]).map(s=>String(s||'').trim()).filter(Boolean))];
    const out={};if(!list.length)return out;
    const target=Math.max(0,Math.floor(Number(total)||0)),base=Math.floor(target/list.length),rest=target%list.length;
    list.forEach(s=>{out[s]=base});
    const seed=[...String(today||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%list.length;
    for(let i=0;i<rest;i++)out[list[(seed+i)%list.length]]++;
    return out;
  }
  function ppBalanceSingleGradeSubjects(plan,pools,progress,today,assignment){
    const activeGrades=PLAN_GRADES.filter(g=>plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate);
    if(activeGrades.length!==1)return assignment;
    const grade=activeGrades[0],pool=(pools[grade]||[]).filter(Boolean);
    if(!pool.length)return assignment;
    const available=[...new Set(pool.map(item=>String(item.subject||'').trim()).filter(Boolean))];
    const configured=Array.isArray(plan.grades[grade].subjects)?plan.grades[grade].subjects.map(s=>String(s||'').trim()).filter(Boolean):[];
    const subjects=(configured.length?configured.filter(s=>available.includes(s)):available).filter((s,i,a)=>a.indexOf(s)===i);
    if(subjects.length<2)return assignment;

    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const originalKeys=Array.isArray(assignment&&assignment.keys)?assignment.keys:[];
    const target=Math.min(cap,originalKeys.length);
    if(target<=0)return assignment;
    const originalRank=new Map(originalKeys.map((key,index)=>[key,index]));
    const weakProfile=ppLoadWeakTopicProfile();
    function tier(item){
      const r=ppProgressFor(progress,item.key),attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
      const due=ppIsDue(r,today);
      const weak=r.status==='weak'||r.lastOutcome==='wrong'||r.lastOutcome==='unsure'||((Number(r.wrong)||0)>0&&accuracy<0.75);
      if(due&&weak)return 0;
      if(!ppHomeworkClusterSeen(item,progress))return 1;
      if(due&&(!r.mastered||attempts<3||accuracy<0.85))return 2;
      if(due)return 3;
      return 4;
    }
    function compare(a,b){
      const at=tier(a),bt=tier(b);if(at!==bt)return at-bt;
      const ar=originalRank.has(a.key)?originalRank.get(a.key):Number.MAX_SAFE_INTEGER;
      const br=originalRank.has(b.key)?originalRank.get(b.key):Number.MAX_SAFE_INTEGER;
      if(ar!==br)return ar-br;
      const boost=ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile);if(boost)return boost;
      const recent=(ppHomework2026NeedsPriority(b,progress)?1:0)-(ppHomework2026NeedsPriority(a,progress)?1:0);if(recent)return recent;
      const count=ppHomeworkImportanceCount(b)-ppHomeworkImportanceCount(a);if(count)return count;
      return ppHomeworkImportanceLatest(b)-ppHomeworkImportanceLatest(a);
    }

    const rowsBySubject=new Map(subjects.map(s=>[s,[]]));
    for(const item of pool){
      const subject=String(item.subject||'').trim();
      if(rowsBySubject.has(subject))rowsBySubject.get(subject).push(item);
    }
    rowsBySubject.forEach(rows=>rows.sort(compare));

    const quotas=ppEvenSubjectQuotas(subjects,target,today);
    const pickedBySubject=new Map(subjects.map(s=>[s,[]])),cursor=Object.fromEntries(subjects.map(s=>[s,0]));
    const selectedClusters=new Set(),selectedKeys=new Set();
    function pickNext(subject){
      const rows=rowsBySubject.get(subject)||[];
      while(cursor[subject]<rows.length){
        const item=rows[cursor[subject]++];
        const cid=ppHomeworkClusterId(item);
        if(selectedKeys.has(item.key)||selectedClusters.has(cid))continue;
        pickedBySubject.get(subject).push(item);selectedKeys.add(item.key);selectedClusters.add(cid);return true;
      }
      return false;
    }
    subjects.forEach(subject=>{
      for(let i=0;i<(quotas[subject]||0);i++)if(!pickNext(subject))break;
    });

    const seed=[...String(today||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%subjects.length;
    const order=subjects.map((_,i)=>subjects[(seed+i)%subjects.length]);
    while(selectedKeys.size<target){
      let added=false;
      for(const subject of order){
        if(selectedKeys.size>=target)break;
        if(pickNext(subject))added=true;
      }
      if(!added)break;
    }

    const ordered=[],positions=Object.fromEntries(subjects.map(s=>[s,0]));
    while(ordered.length<selectedKeys.size){
      let added=false;
      for(const subject of order){
        const rows=pickedBySubject.get(subject)||[],pos=positions[subject]||0;
        if(pos<rows.length){ordered.push(rows[pos]);positions[subject]=pos+1;added=true}
      }
      if(!added)break;
    }
    const subjectCounts=Object.fromEntries(subjects.map(s=>[s,(pickedBySubject.get(s)||[]).length]));
    const balancedNewCount=ordered.filter(item=>!ppHomeworkClusterSeen(item,progress)).length;
    const balancedReviewCount=Math.max(0,ordered.length-balancedNewCount);
    const balancedDueCount=ordered.filter(item=>ppHomeworkClusterSeen(item,progress)&&ppIsDue(ppProgressFor(progress,item.key),today)).length;
    const gradeCounts={...(assignment.gradeCounts||{})};
    gradeCounts[grade]={review:balancedReviewCount,new:balancedNewCount};
    return {...assignment,keys:ordered.map(item=>item.key),newCount:balancedNewCount,dueCount:balancedDueCount,newShortfall:Math.max(0,Number(assignment.requiredNew||0)-balancedNewCount),gradeCounts,subjectQuotaTarget:quotas,subjectCounts,subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY,rotationPolicy:POLICY};
  }
  const ppBuildTodayAssignmentBeforeSubjectBalance=ppBuildTodayAssignment;
  ppBuildTodayAssignment=function(plan,pools,progress,today){
    return ppBalanceSingleGradeSubjects(plan,pools,progress,today,ppBuildTodayAssignmentBeforeSubjectBalance(plan,pools,progress,today));
  };

"""
    text=text[:i]+helper+text[i:]

text,n=re.subn(r"assignmentPolicy:'[^']+'",f"assignmentPolicy:'{POLICY}'",text,count=1)
if n!=1:
    raise SystemExit('assignment policy anchor missing')

if 'subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY' not in text:
    old="version:2,dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY,date:ppDateKey(new Date()),savedAt:new Date().toISOString(),"
    new="version:2,dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY,subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY,date:ppDateKey(new Date()),savedAt:new Date().toISOString(),"
    if old not in text:
        raise SystemExit('checkpoint save policy anchor missing')
    text=text.replace(old,new,1)

if 'cp.subjectBalancePolicy!==PP_SUBJECT_BALANCE_POLICY' not in text:
    old="cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY||cp.date!==ppDateKey(new Date())"
    new="cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY||cp.subjectBalancePolicy!==PP_SUBJECT_BALANCE_POLICY||cp.date!==ppDateKey(new Date())"
    if old not in text:
        raise SystemExit('checkpoint load policy anchor missing')
    text=text.replace(old,new,1)

old_copy="배분 기준: ${escapeHtml(assignment.priorityLabel||'자동 추천 · 시험일 역산')} · ${assignment.priorityMode==='auto'?'필수 신규량 우선':'설정 비율 우선'}"
new_copy=old_copy+" · ${assignment.subjectBalancePolicy?'단일 급수 과목 균등':''}"
if old_copy in text and new_copy not in text:
    text=text.replace(old_copy,new_copy,1)

required=[
  MARKER,"const PP_SUBJECT_BALANCE_POLICY='even-subject-v1'","function ppEvenSubjectQuotas(subjects,total,today)",
  "activeGrades.length!==1","const quotas=ppEvenSubjectQuotas(subjects,target,today)",
  "subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY",f"assignmentPolicy:'{POLICY}'",
  "cp.subjectBalancePolicy!==PP_SUBJECT_BALANCE_POLICY"
]
for needle in required:
    if needle not in text:
        raise SystemExit(f'missing subject balance marker: {needle}')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched single-grade even subject homework allocation')
else:
    print('subject-balanced homework already current')
