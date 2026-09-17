from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

# v2 semantics: manual grade priority applies to the entire daily assignment,
# not only to the flexible slots left after deadline-required new questions.
text=text.replace("3급 우선 · 여유 슬롯 20:80","3급 우선 · 전체 숙제 20:80")
text=text.replace("2급 우선 · 여유 슬롯 80:20","2급 우선 · 전체 숙제 80:20")
text=text.replace(
    "시험일까지 필요한 신규 문제는 먼저 확보합니다. 선택한 우선순위는 그 뒤 남는 복습·추가 학습 슬롯에 적용됩니다.",
    "자동 추천은 시험일까지 필요한 신규 문제를 우선 확보합니다. 3급/2급 우선·직접 설정은 하루 전체 숙제를 선택 비율로 배분하고, 각 급수 안에서는 복습 후 신규 문제를 채웁니다."
)
text=text.replace(
    "배분 기준: ${escapeHtml(assignment.priorityLabel||'자동 추천 · 시험일 역산')} · 필수 신규량 우선",
    "배분 기준: ${escapeHtml(assignment.priorityLabel||'자동 추천 · 시험일 역산')} · ${assignment.priorityMode==='auto'?'필수 신규량 우선':'설정 비율 우선'}"
)

build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // grade-ratio-priority-v2
    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const priority=ppPriorityProfile(plan,today);
    const allItems=PLAN_GRADES.flatMap(g=>(plan.grades[g].enabled&&plan.grades[g].examDate)?(pools[g]||[]):[]);
    const phases={},requests={navi2:0,navi3:0};

    // 시험일까지 전범위를 1회 보려면 오늘 필요한 신규 문제 수를 계속 계산한다.
    // 자동 추천에서는 이 수를 우선 확보하고, 수동 비율에서는 경고용 기준으로만 사용한다.
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
    const dueSelected=[],newItems=[],selectedKeys=new Set();
    const reviewByGrade={navi2:0,navi3:0},newByGrade={navi2:0,navi3:0};

    function sortedNewCandidates(g){
      const phase=phases[g];if(!phase)return [];
      const preferred=new Set((phase.candidates||[]).map(item=>item.key));
      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!selectedKeys.has(item.key));
      candidates.sort((a,b)=>(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
      return candidates;
    }
    function takeReview(item){
      if(!item||selectedKeys.has(item.key))return false;
      dueSelected.push(item);selectedKeys.add(item.key);reviewByGrade[item.gradeId]=(reviewByGrade[item.gradeId]||0)+1;return true;
    }
    function takeNew(item){
      if(!item||selectedKeys.has(item.key))return false;
      newItems.push(item);selectedKeys.add(item.key);newByGrade[item.gradeId]=(newByGrade[item.gradeId]||0)+1;return true;
    }

    if(priority.mode==='auto'){
      // 자동 추천은 기존 정책을 유지한다: 시험일까지 필요한 신규 슬롯을 먼저 확보한다.
      const quotas=ppAllocateNewSlots(requests,requiredNew);
      PLAN_GRADES.forEach(g=>{
        if(!phases[g]||!quotas[g])return;
        for(const item of sortedNewCandidates(g).slice(0,quotas[g]))takeNew(item);
      });

      let fill=Math.max(0,cap-selectedKeys.size);
      for(const item of due){
        if(fill<=0)break;
        if(takeReview(item))fill--;
      }

      // 복습이 부족한 날에는 남은 미학습 문제를 앞당긴다.
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
          if(takeNew(row.item))fill--;
        }
      }
    }else{
      // 수동 우선순위는 하루 전체 상한을 선택 비율대로 먼저 나눈다.
      // 예: 190문제에서 2급 10% / 3급 90%라면 목표는 19 / 171문제다.
      const totalQuotas=ppPriorityFlexQuotas(plan,today,cap);
      const used={navi2:0,navi3:0};

      PLAN_GRADES.forEach(g=>{
        const target=Math.max(0,totalQuotas[g]||0);if(!target||!phases[g])return;

        // 각 급수 쿼터 안에서는 기한도래 복습을 먼저 넣고, 남는 자리를 신규로 채운다.
        for(const item of due){
          if(used[g]>=target)break;
          if(item.gradeId!==g||selectedKeys.has(item.key))continue;
          if(takeReview(item))used[g]++;
        }
        if(used[g]<target){
          for(const item of sortedNewCandidates(g)){
            if(used[g]>=target)break;
            if(takeNew(item))used[g]++;
          }
        }
      });

      // 한 급수에서 배정 가능한 문제가 부족해 비율을 채우지 못할 때만 다른 급수로 남는 슬롯을 넘긴다.
      let fill=Math.max(0,cap-selectedKeys.size);
      if(fill>0){
        for(const item of due){
          if(fill<=0)break;
          if(takeReview(item))fill--;
        }
      }
      if(fill>0){
        const extra=[];
        PLAN_GRADES.forEach(g=>{
          const phase=phases[g];if(!phase)return;
          const preferred=new Set((phase.candidates||[]).map(item=>item.key));
          (phase.allRemaining||[]).forEach(item=>{
            if(ppProgressFor(progress,item.key).firstPassDate||selectedKeys.has(item.key))return;
            extra.push({item,preferred:preferred.has(item.key),priority:Number(priority[g])||0});
          });
        });
        extra.sort((a,b)=>b.priority-a.priority||(b.preferred?1:0)-(a.preferred?1:0)||(pp2026NeedsPriority(b.item,progress)?1:0)-(pp2026NeedsPriority(a.item,progress)?1:0)||b.item.count-a.item.count||b.item.latest-a.item.latest);
        for(const row of extra){
          if(fill<=0)break;
          if(takeNew(row.item))fill--;
        }
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

    const coverageAtRisk=priority.mode==='auto'
      ? requestedNew>cap
      : PLAN_GRADES.some(g=>(requests[g]||0)>(newByGrade[g]||0));
    const totalQuotas=priority.mode==='auto'?null:ppPriorityFlexQuotas(plan,today,cap);
    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,requiredNew,dueOverflow:Math.max(0,due.length-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requiredNew-newItems.length),coverageAtRisk,priorityMode:priority.mode,priorityLabel:priority.label,priorityProfile:{navi2:priority.navi2,navi3:priority.navi3},quotaTarget:totalQuotas,gradeCounts:{navi2:{review:reviewByGrade.navi2,new:newByGrade.navi2},navi3:{review:reviewByGrade.navi3,new:newByGrade.navi3}},rotationPolicy:'grade-ratio-priority-v2'};
  }"""

pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppBuildTodayAssignment not found')

text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'grade-ratio-priority-v2'",text,count=1)
if n!=1:
    raise SystemExit('assignmentPolicy not found')

if 'grade-ratio-priority-v2' not in text:
    raise SystemExit('grade ratio priority v2 marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched full-day grade ratio allocation')
else:
    print('full-day grade ratio allocation already patched')
