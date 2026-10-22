// Deterministic scheduling policy, not an estimate of an optimal learning ratio.
(function(global){
  'use strict';
  const DAY=86400000;
  function days(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY)}
  function unique(rows){const used=new Set();return rows.filter(r=>{const id=r.clusterId||r.key;if(used.has(id))return false;used.add(id);return true})}
  function mix(lists){
    const out=[],pos=lists.map(()=>0),total=lists.reduce((n,a)=>n+a.length,0);
    while(out.length<total){let best=-1;for(let i=0;i<lists.length;i++){if(pos[i]>=lists[i].length)continue;if(best<0||pos[i]/lists[i].length<pos[best]/lists[best].length)best=i}if(best<0)break;out.push(lists[best][pos[best]++])}return out;
  }
  function allocate(weights,available,cap){
    const ids=Object.keys(available),out=Object.fromEntries(ids.map(g=>[g,0]));
    const active=ids.filter(g=>available[g]>0),sum=active.reduce((n,g)=>n+Math.max(0,weights[g]||0),0);
    if(!active.length)return out;
    const weight=g=>sum?Math.max(0,weights[g]||0):1,den=sum||active.length;
    const ranked=active.slice().sort((a,b)=>(cap*weight(b)/den%1)-(cap*weight(a)/den%1)||a.localeCompare(b));
    for(const g of active)out[g]=Math.min(available[g],Math.floor(cap*weight(g)/den));
    let left=cap-Object.values(out).reduce((a,b)=>a+b,0);
    while(left>0){let added=false;for(const g of ranked){if(left<=0)break;if(out[g]<available[g]){out[g]++;left--;added=true}}if(!added)break}
    return out;
  }
  function build(input){
    const cap=Math.max(40,Math.min(250,Math.floor(Number(input.cap)||120))),today=input.today,finalDays=Math.max(1,Math.min(7,Number(input.finalDays)||4));
    const enabled=(input.grades||[]).filter(g=>g.enabled&&g.examDate&&Number.isFinite(days(today,g.examDate)));
    const active=enabled.filter(g=>days(today,g.examDate)>0);
    const activeIds=new Set(active.map(g=>g.id)),all=unique((input.rows||[]).filter(r=>activeIds.has(r.gradeId)&&!r.cleared&&(r.due||!r.seen)));
    const byGrade=Object.fromEntries(active.map(g=>[g.id,all.filter(r=>r.gradeId===g.id)])),info={};
    for(const g of enabled){const rows=unique((input.rows||[]).filter(r=>r.gradeId===g.id)),dday=days(today,g.examDate),remaining=rows.filter(r=>!r.seen).length,newDays=Math.max(0,dday-finalDays);info[g.id]={studyDays:Math.max(0,dday),newStudyDays:newDays,recallReserveDays:finalDays,remainingFirstPass:remaining,requiredFirstPassToday:newDays?Math.ceil(remaining/newDays):0,finalReview:dday>0&&dday<=finalDays,scheduledFirstPassToday:0,newShortfall:0,coverageAtRisk:remaining>0&&dday<=0,absoluteCapacityShortfall:dday<=0?remaining:0}}
    const weights={},available={};
    for(const g of active){const rows=byGrade[g.id],i=info[g.id];available[g.id]=rows.length;weights[g.id]=input.priorityMode==='auto'?Math.max(1,i.requiredFirstPassToday+Math.min(rows.filter(r=>r.due).length,Math.ceil(cap*.3))):Math.max(0,Number(input.weights&&input.weights[g.id])||0)}
    const quotas=allocate(weights,available,cap),selected=[],usedClusters=new Set(),gradeCounts={},requests={},scheduledFirstPassByGrade={};
    const reviewLists=[],newLists=[];
    for(const g of active){
      const rows=byGrade[g.id],quota=quotas[g.id]||0,i=info[g.id],picked=[],loads={};
      const review=rows.filter(r=>r.due),fresh=rows.filter(r=>!r.due&&!r.seen);
      const age=r=>Math.max(0,Number(r.overdueDays)||0),tier=r=>age(r)>=7?0:r.weak?1:!r.mastered?2:3;
      function choose(list,isReview){
        const candidates=list.filter(r=>!usedClusters.has(r.clusterId||r.key));if(!candidates.length)return null;
        candidates.sort((a,b)=>{
          if(isReview){const t=tier(a)-tier(b);if(t)return t;if(tier(a)===0&&age(a)!==age(b))return age(b)-age(a)}
          const balance=(loads[a.subject]||0)-(loads[b.subject]||0);if(balance)return balance;
          if(isReview){const wait=age(b)-age(a);if(wait)return wait}
          return (Number(b.boost)||1)-(Number(a.boost)||1)||(b.has2026?1:0)-(a.has2026?1:0)||(Number(b.count)||0)-(Number(a.count)||0)||(Number(b.latest)||0)-(Number(a.latest)||0)||a.key.localeCompare(b.key);
        });return candidates[0];
      }
      function take(list,isReview){if(picked.length>=quota)return false;const r=choose(list,isReview);if(!r)return false;picked.push(r);usedClusters.add(r.clusterId||r.key);loads[r.subject]=(loads[r.subject]||0)+1;return true}
      if(i.finalReview){while(take(review,true)){};while(take(fresh,false)){};}
      else{
        // Aging changes order inside the review budget; it is not a promise that
        // every review can be completed within seven days under an overloaded cap.
        // Protect at least 30% fresh work while there are fresh questions left.
        const protectedFresh=Math.min(fresh.length,Math.ceil(quota*.30));
        const reviewBudget=quota-protectedFresh;
        const reserve=Math.min(review.length,Math.ceil(quota*.30));
        while(picked.filter(r=>r.due).length<Math.min(reserve,reviewBudget)&&take(review,true)){}
        while((picked.filter(r=>!r.seen).length<i.requiredFirstPassToday||picked.filter(r=>!r.due).length<protectedFresh)&&take(fresh,false)){}
        while(picked.filter(r=>r.due).length<reviewBudget&&take(review,true)){}
        while(take(fresh,false)){}
      }
      selected.push(...picked);reviewLists.push(picked.filter(r=>r.due));newLists.push(picked.filter(r=>!r.due));
      gradeCounts[g.id]={review:picked.filter(r=>r.due).length,new:picked.filter(r=>!r.due).length};requests[g.id]=i.requiredFirstPassToday;
      scheduledFirstPassByGrade[g.id]=picked.filter(r=>!r.seen).length;
      i.scheduledFirstPassToday=scheduledFirstPassByGrade[g.id];i.newShortfall=Math.max(0,i.requiredFirstPassToday-i.scheduledFirstPassToday);i.coverageAtRisk=i.remainingFirstPass>0&&(i.newStudyDays<=0||i.newShortfall>0);
      i.absoluteCapacityShortfall=Math.max(0,i.remainingFirstPass-i.newStudyDays*quota);
    }
    // Reviews lead, then proportional mixing preserves both subject and type flow.
    const reviews=mix(reviewLists),news=mix(newLists),ordered=mix([reviews,news]),selectedIds=new Set(selected.map(r=>r.clusterId||r.key));
    const dueRows=all.filter(r=>r.due),unselected=dueRows.filter(r=>!selectedIds.has(r.clusterId||r.key));
    const subjectCounts={},perGradeSubjects={};for(const r of ordered){subjectCounts[r.subject]=(subjectCounts[r.subject]||0)+1;const o=perGradeSubjects[r.gradeId]||(perGradeSubjects[r.gradeId]={});o[r.subject]=(o[r.subject]||0)+1}
    // This is an estimate conditional on correct answers, excluding wrong-answer retries.
    const estimatedRechecks=ordered.filter((r,idx)=>r.needsSameDayConfirmation&&ordered.length-idx-1>=15).length;
    return {keys:ordered.map(r=>r.key),createdAt:Date.now(),requests,requiredNew:Object.values(requests).reduce((a,b)=>a+b,0),newCount:news.length,dueCount:reviews.length,dueOverflow:unselected.length,
      newShortfall:Object.values(info).reduce((n,g)=>n+g.newShortfall,0),coverageAtRisk:Object.values(info).some(g=>g.coverageAtRisk),coverageByGrade:info,
      priorityMode:input.priorityMode||'auto',priorityLabel:input.priorityLabel||'자동 추천 · 복습 및 시험일 기준',quotaTarget:quotas,gradeCounts:{navi2:{new:0,review:0},navi3:{new:0,review:0},...gradeCounts},subjectCounts,perGradeSubjects,
      scheduledFirstPassCount:ordered.filter(r=>!r.seen).length,scheduledFirstPassByGrade,
      deferredStrongReviewCount:unselected.filter(r=>r.mastered&&!r.weak).length,overduePromotedCount:reviews.filter(r=>Number(r.overdueDays)>=7).length,overdueRemaining:unselected.filter(r=>Number(r.overdueDays)>=7).length,
      reviewDelayPriorityDays:7,maxNormalReviewShareWhenFresh:.70,estimatedAutomaticRechecks:estimatedRechecks,estimatedTotalAnswers:ordered.length+estimatedRechecks,workloadAssumption:'correct-answers-excluding-wrong-retries',
      rotationPolicy:'scheduler-v522',assignmentPolicy:'scheduler-v522',subjectBalancePolicy:'integrated-subject-type-v522',reviewSpacingPolicy:'review-spacing-v522',duplicatePolicy:'content-identity-v2'};
  }
  global.__mdSchedulerV522={build,days,mix};
})(typeof window!=='undefined'?window:globalThis);
