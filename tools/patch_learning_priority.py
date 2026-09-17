from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='knowledge-gap-priority-v3'

# Make the settings copy match the actual selection order.
text=text.replace(
    '자동 추천은 시험일까지 필요한 신규 문제를 우선 확보합니다. 3급/2급 우선·직접 설정은 하루 전체 숙제를 선택 비율로 배분하고, 각 급수 안에서는 복습 후 신규 문제를 채웁니다.',
    '자동 추천은 시험일까지 필요한 신규 문제를 우선 확보합니다. 3급/2급 우선·직접 설정은 하루 전체 숙제를 선택 비율로 배분합니다. 각 급수 안에서는 틀렸거나 불확실한 문제 → 아직 안 본 신규 문제 → 일반 복습 → 정답률 높은 숙달 문제 순으로 배정합니다.'
)

# Correct, retained questions should spread out instead of returning every few days.
commit_fn="""  function ppCommitOutcome(q,answer,confidence){
    const progress=ppLoadProgress(),r=ppProgressFor(progress,q._planKey),today=ppDateKey(new Date()),correct=answer===q['정답'];
    const priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;
    r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';
    if(correct)r.correct=(r.correct||0)+1;else r.wrong=(r.wrong||0)+1;
    if(correct&&confidence==='unsure')r.unsure=(r.unsure||0)+1;
    if(correct&&confidence==='sure'){
      r.lastSureDate=today;
      const retainedAcrossDay=!!(priorConfirmed&&priorConfirmed<today);
      if(retainedAcrossDay){
        r.status='mastered';r.mastered=true;r.masteryReviews=(r.masteryReviews||0)+1;
        r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;
        const attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
        let interval=4;
        if(attempts>=4&&accuracy>=0.90&&(Number(r.wrong)||0)<=1&&(Number(r.unsure)||0)<=1)interval=14;
        else if(attempts>=3&&accuracy>=0.80)interval=7;
        else if(accuracy>=0.70)interval=5;
        const exam=ppExamDay(ppLoadPlan(),q._planGrade);let due=ppAddDays(today,interval);if(exam){const dayBefore=ppAddDays(exam,-1);due=ppMinDate(due,dayBefore)}r.dueDate=due;
        removePastWrong(pqid(q));
      }else if(priorFirstCorrect===today){
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,1);
        removePastWrong(pqid(q));
      }else{
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
      }
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;
      if(!correct)addPastWrong(q,answer);
    }
    progress[q._planKey]=r;ppSaveProgress(progress);
  }"""
text,n=re.subn(r"  function ppCommitOutcome\(q,answer,confidence\)\{.*?\n  \}",commit_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppCommitOutcome not found')

build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // knowledge-gap-priority-v3
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
    const dueSelected=[],newItems=[],selectedKeys=new Set();
    const reviewByGrade={navi2:0,navi3:0},newByGrade={navi2:0,navi3:0};

    function sortedNewCandidates(g){
      const phase=phases[g];if(!phase)return [];
      const preferred=new Set((phase.candidates||[]).map(item=>item.key));
      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!selectedKeys.has(item.key));
      const weakProfile=ppLoadWeakTopicProfile();
      candidates.sort((a,b)=>ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)||(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
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
    function takeReviewList(list,g,target,used){
      for(const item of list){
        if(used[g]>=target)break;
        if(item.gradeId!==g||selectedKeys.has(item.key))continue;
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
          if(ppProgressFor(progress,item.key).firstPassDate||selectedKeys.has(item.key))return;
          rows.push({item,preferred:preferred.has(item.key),boost:ppWeakTopicBoost(item,weakProfile),priority:Number(priority[g])||0});
        });
      });
      rows.sort((a,b)=>b.priority-a.priority||b.boost-a.boost||(b.preferred?1:0)-(a.preferred?1:0)||(pp2026NeedsPriority(b.item,progress)?1:0)-(pp2026NeedsPriority(a.item,progress)?1:0)||b.item.count-a.item.count||b.item.latest-a.item.latest);
      return rows;
    }

    if(priority.mode==='auto'){
      const quotas=ppAllocateNewSlots(requests,requiredNew);
      PLAN_GRADES.forEach(g=>{
        if(!phases[g]||!quotas[g])return;
        for(const item of sortedNewCandidates(g).slice(0,quotas[g]))takeNew(item);
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
        // Within each grade: weak/uncertain review -> unseen -> ordinary review -> high-accuracy mastered review.
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
    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,requiredNew,dueOverflow:Math.max(0,due.length-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requiredNew-newItems.length),coverageAtRisk,priorityMode:priority.mode,priorityLabel:priority.label,priorityProfile:{navi2:priority.navi2,navi3:priority.navi3},quotaTarget:totalQuotas,gradeCounts:{navi2:{review:reviewByGrade.navi2,new:newByGrade.navi2},navi3:{review:reviewByGrade.navi3,new:newByGrade.navi3}},deferredStrongReviewCount:Math.max(0,strongDue.filter(item=>!selectedKeys.has(item.key)).length),rotationPolicy:'knowledge-gap-priority-v3'};
  }"""
pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1: raise SystemExit('ppBuildTodayAssignment not found')

text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'knowledge-gap-priority-v3'",text,count=1)
if n!=1: raise SystemExit('assignmentPolicy not found')

if MARKER not in text: raise SystemExit('knowledge-gap priority marker missing')
if "rotationPolicy:'knowledge-gap-priority-v3'" not in text: raise SystemExit('knowledge-gap rotation policy missing')
if "assignmentPolicy:'knowledge-gap-priority-v3'" not in text: raise SystemExit('knowledge-gap assignment policy missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched unseen/weak-first homework priority + adaptive spacing')
else:
    print('knowledge-gap priority already patched')
