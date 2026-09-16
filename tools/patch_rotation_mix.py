from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='deadline-coverage-v4'

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
if n!=1:
    raise SystemExit('ppPhaseForGrade not found')

build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // deadline-coverage-v4
    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const allItems=PLAN_GRADES.flatMap(g=>(plan.grades[g].enabled&&plan.grades[g].examDate)?(pools[g]||[]):[]);
    const phases={},requests={navi2:0,navi3:0};

    // 시험일까지 모든 문제 그룹을 최소 1회 보도록 오늘의 '필수 신규' 수를 역산한다.
    // dday=0인 시험일도 학습 가능일로 포함하므로 남은 학습일은 dday+1이다.
    PLAN_GRADES.forEach(g=>{
      if(!plan.grades[g].enabled||!plan.grades[g].examDate){phases[g]=null;return}
      const phase=ppPhaseForGrade(plan,g,pools[g]||[],progress,today);phases[g]=phase;
      const remaining=phase.allRemaining||[];
      const daysLeft=phase.dday===null?Math.max(1,phase.learningDays||1):Math.max(1,phase.dday+1);
      requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;
    });

    const due=allItems.filter(item=>ppIsDue(ppProgressFor(progress,item.key),today)).sort((a,b)=>ppUrgentSort(a,b,progress));
    const requestedNew=PLAN_GRADES.reduce((sum,g)=>sum+(requests[g]||0),0);
    const requiredNew=Math.min(cap,requestedNew);

    // 필수 신규 슬롯은 복습이 아무리 밀려도 침범하지 않는다.
    const dueSelected=due.slice(0,Math.max(0,cap-requiredNew));
    const quotas=ppAllocateNewSlots(requests,requiredNew);
    const newItems=[];

    PLAN_GRADES.forEach(g=>{
      const phase=phases[g];if(!phase||!quotas[g])return;
      const preferred=new Set((phase.candidates||[]).map(item=>item.key));
      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!dueSelected.some(d=>d.key===item.key));
      // 전범위에서 뽑되 2026/빈출 등 현재 단계의 우선 문제를 먼저 소진한다.
      candidates.sort((a,b)=>(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
      newItems.push(...candidates.slice(0,quotas[g]));
    });

    const selectedKeys=new Set([...dueSelected,...newItems].map(item=>item.key));
    let fill=Math.max(0,cap-dueSelected.length-newItems.length);

    // 필수 신규를 확보한 뒤 남는 자리는 취약/기한도래 복습으로 채운다.
    if(fill>0){
      for(const item of due){
        if(fill<=0)break;
        if(selectedKeys.has(item.key))continue;
        dueSelected.push(item);selectedKeys.add(item.key);fill--;
      }
    }

    // 복습할 문제가 부족한 날에는 미학습 문제를 앞당겨 1회독을 더 빨리 진행한다.
    if(fill>0){
      const extra=[];
      PLAN_GRADES.forEach(g=>{
        const phase=phases[g];if(!phase)return;
        const preferred=new Set((phase.candidates||[]).map(item=>item.key));
        (phase.allRemaining||[]).forEach(item=>{
          if(ppProgressFor(progress,item.key).firstPassDate||selectedKeys.has(item.key))return;
          extra.push({item,preferred:preferred.has(item.key)});
        });
      });
      extra.sort((a,b)=>(b.preferred?1:0)-(a.preferred?1:0)||(pp2026NeedsPriority(b.item,progress)?1:0)-(pp2026NeedsPriority(a.item,progress)?1:0)||b.item.count-a.item.count||b.item.latest-a.item.latest);
      for(const row of extra){
        if(fill<=0)break;
        if(selectedKeys.has(row.item.key))continue;
        newItems.push(row.item);selectedKeys.add(row.item.key);fill--;
      }
    }

    // 복습과 신규를 세션 전체에 골고루 섞는다.
    const ordered=[];let ri=0,ni=0;
    while(ri<dueSelected.length||ni<newItems.length){
      if(ri>=dueSelected.length){ordered.push(newItems[ni++]);continue}
      if(ni>=newItems.length){ordered.push(dueSelected[ri++]);continue}
      const reviewProgress=ri/Math.max(1,dueSelected.length),newProgress=ni/Math.max(1,newItems.length);
      if(reviewProgress<=newProgress)ordered.push(dueSelected[ri++]);
      else ordered.push(newItems[ni++]);
    }

    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,requiredNew,dueOverflow:Math.max(0,due.length-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requiredNew-newItems.length),coverageAtRisk:requestedNew>cap,rotationPolicy:'deadline-coverage-v4'};
  }"""
pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppBuildTodayAssignment not found')

# Force today's cached assignment to be rebuilt under the deadline-coverage policy.
text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'deadline-coverage-v4'",text,count=1)
if n!=1:
    raise SystemExit('assignmentPolicy not found')

if MARKER not in text:
    raise SystemExit('deadline coverage marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched deadline first-pass coverage + weak review mix')
else:
    print('deadline coverage already patched')
