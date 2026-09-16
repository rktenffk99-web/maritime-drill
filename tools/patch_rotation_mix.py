from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='balanced-rotation-v3'

phase_fn="""  function ppPhaseForGrade(plan,gradeId,pool,progress,today){
    const exam=ppExamDay(plan,gradeId),dday=ppDiffDays(today,exam);
    const finalDays=Number(plan.finalDays)||4;
    const current2026Remaining=pool.filter(item=>pp2026NeedsPriority(item,progress));
    const current2026Unseen=current2026Remaining.filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
    const freqRemaining=pool.filter(item=>item.count>=2&&!ppProgressFor(progress,item.key).firstPassDate);
    const stage1Unseen=[...current2026Unseen,...freqRemaining.filter(item=>!ppHas2026(item))];
    const allRemaining=pool.filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
    const final=dday!==null&&dday>=0&&dday<=finalDays;
    if(final){
      const candidates=stage1Unseen.length?stage1Unseen:allRemaining;
      return {phase:'final',label:stage1Unseen.length?'시험 직전 · 2026/빈출 신규 + 취약 복습':'시험 직전 · 미학습 전체 + 취약 복습',dday,freqRemaining,current2026Remaining,allRemaining,candidates,learningDays:Math.max(1,dday)};
    }
    if(stage1Unseen.length){
      const learningDays=Math.max(1,(dday===null?14:dday)-finalDays);
      const stageDays=Math.max(1,Math.ceil(learningDays*0.45));
      return {phase:'stage1',label:'1단계 · 2026 미숙달 복습 + 최근 5개년 빈출 신규',dday,freqRemaining,current2026Remaining,allRemaining,candidates:stage1Unseen,learningDays:stageDays};
    }
    const learningDays=Math.max(1,(dday===null?10:dday)-finalDays);
    return {phase:'stage2',label:'2단계 · 최근 5개년 전체 신규 + 취약 복습',dday,freqRemaining,current2026Remaining,allRemaining,candidates:allRemaining,learningDays};
  }"""

pattern=r"  function ppPhaseForGrade\(plan,gradeId,pool,progress,today\)\{.*?\n  \}(?=\n  function ppIsDue)"
text,n=re.subn(pattern,phase_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppPhaseForGrade not found')

build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // balanced-rotation-v3
    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const allItems=PLAN_GRADES.flatMap(g=>(plan.grades[g].enabled&&plan.grades[g].examDate)?(pools[g]||[]):[]);
    const phases={},requests={navi2:0,navi3:0};
    PLAN_GRADES.forEach(g=>{
      if(!plan.grades[g].enabled||!plan.grades[g].examDate){phases[g]=null;return}
      const phase=ppPhaseForGrade(plan,g,pools[g]||[],progress,today);phases[g]=phase;
      const remaining=phase.candidates.filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
      requests[g]=remaining.length?Math.ceil(remaining.length/Math.max(1,phase.learningDays)):0;
      if(phase.phase==='final'&&remaining.length)requests[g]=Math.ceil(remaining.length/Math.max(1,phase.dday||1));
    });

    const due=allItems.filter(item=>ppIsDue(ppProgressFor(progress,item.key),today)).sort((a,b)=>ppUrgentSort(a,b,progress));
    const requestedNew=PLAN_GRADES.reduce((sum,g)=>sum+(requests[g]||0),0);
    const finalMode=PLAN_GRADES.some(g=>phases[g]&&phases[g].phase==='final');
    // 복습이 많이 밀려도 신규 진도를 완전히 막지 않는다. 평상시 40%, 시험 직전 30%까지 신규 슬롯을 보호한다.
    const protectedNew=requestedNew>0
      ? Math.min(requestedNew,due.length?Math.max(1,Math.floor(cap*(finalMode?0.30:0.40))):cap)
      : 0;
    const dueSelected=due.slice(0,Math.max(0,cap-protectedNew));
    let slots=Math.max(0,cap-dueSelected.length);

    const quotas=ppAllocateNewSlots(requests,slots);
    const newItems=[];
    PLAN_GRADES.forEach(g=>{
      const phase=phases[g];if(!phase||!quotas[g])return;
      const candidates=phase.candidates.filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!dueSelected.some(d=>d.key===item.key));
      candidates.sort((a,b)=>(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
      newItems.push(...candidates.slice(0,quotas[g]));
    });

    // 남는 슬롯은 아직 안 본 문제로 조금 더 채우되, 당일 계획을 과도하게 앞당기지는 않는다.
    slots=Math.max(0,cap-dueSelected.length-newItems.length);
    if(slots>0){
      const extra=[];
      PLAN_GRADES.forEach(g=>{
        const phase=phases[g];if(!phase)return;
        phase.candidates.forEach(item=>{
          if(ppProgressFor(progress,item.key).firstPassDate)return;
          if(dueSelected.some(d=>d.key===item.key)||newItems.some(n=>n.key===item.key))return;
          extra.push(item);
        });
      });
      extra.sort((a,b)=>{
        const pa=phases[a.gradeId],pb=phases[b.gradeId];
        const da=pa&&pa.dday!=null?pa.dday:999,db=pb&&pb.dday!=null?pb.dday:999;
        return da-db||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest;
      });
      const bonus=Math.min(slots,Math.ceil(cap*0.15));
      newItems.push(...extra.slice(0,bonus));
    }

    // 신규가 예상보다 적게 뽑힌 경우 남는 자리는 다시 복습 문제로 채운다.
    const selectedKeys=new Set([...dueSelected,...newItems].map(item=>item.key));
    let fill=Math.max(0,cap-dueSelected.length-newItems.length);
    if(fill>0){
      for(const item of due){
        if(fill<=0)break;
        if(selectedKeys.has(item.key))continue;
        dueSelected.push(item);selectedKeys.add(item.key);fill--;
      }
    }

    // 복습 문제를 앞에 몰아넣지 않고 신규 문제와 비율대로 섞는다.
    // 각 목록 내부 우선순위는 유지되므로 약한/기한도래 복습은 여전히 먼저 소진된다.
    const ordered=[];let ri=0,ni=0;
    while(ri<dueSelected.length||ni<newItems.length){
      if(ri>=dueSelected.length){ordered.push(newItems[ni++]);continue}
      if(ni>=newItems.length){ordered.push(dueSelected[ri++]);continue}
      const reviewProgress=ri/Math.max(1,dueSelected.length),newProgress=ni/Math.max(1,newItems.length);
      if(reviewProgress<=newProgress)ordered.push(dueSelected[ri++]);
      else ordered.push(newItems[ni++]);
    }

    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,dueOverflow:Math.max(0,due.length-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requestedNew-newItems.length),rotationPolicy:'balanced-rotation-v3'};
  }"""
pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppBuildTodayAssignment not found')

# Force today's cached assignment to be rebuilt under the new policy.
text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'balanced-rotation-v3'",text,count=1)
if n!=1:
    raise SystemExit('assignmentPolicy not found')

if MARKER not in text:
    raise SystemExit('rotation marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched balanced review/new rotation')
else:
    print('balanced rotation already patched')
