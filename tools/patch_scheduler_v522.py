"""Install the v5.22 scheduling policy; safe to run repeatedly on generated HTML."""
from pathlib import Path
import argparse
import re

p=argparse.ArgumentParser();p.add_argument('--index',default='index.html');args=p.parse_args()
path=Path(args.index);text=path.read_text(encoding='utf-8-sig')
marker='// scheduler-v522-adapter:start'
if marker not in text:
    anchor="  function ppGetItemByKey(key){"
    adapter=r'''  // scheduler-v522-adapter:start
  // Existing progress keys remain unchanged. Only future assignment policy changes.
  function ppBuildTodayAssignment(plan,pools,progress,today){
    const profile=ppPriorityProfile(plan,today),rows=[];
    for(const gradeId of PLAN_GRADES){
      const weakProfile=ppLoadWeakTopicProfile(gradeId);
      for(const item of pools[gradeId]||[]){
        const r=ppProgressFor(progress,item.key),attempts=Math.max(1,Number(r.attempts)||1),accuracy=(Number(r.correct)||0)/attempts;
        const due=ppIsDue(r,today),pendingDate=r.nextDayRecheckScheduledDate||r.sameDayFirstCorrectDate;
        const priorRecall=!!(r.sameDayConfirmedDate&&r.sameDayConfirmedDate<today)||!!(r.lateSessionNextDayRecheck&&pendingDate&&pendingDate<today);
        rows.push({...item,clusterId:ppHomeworkClusterId(item),seen:ppHomeworkClusterSeen(item,progress),mastered:!!r.mastered,
          due,cleared:ppTodayCleared(r,today),overdueDays:due?Math.max(0,ppDiffDays(r.dueDate,today)||0):0,
          weak:r.status==='weak'||r.lastOutcome==='wrong'||r.lastOutcome==='unsure'||(Number(r.wrong)||0)>0&&accuracy<.75,
          count:ppHomeworkImportanceCount(item),latest:ppHomeworkImportanceLatest(item),has2026:ppHomeworkHas2026(item),boost:ppWeakTopicBoost(item,weakProfile),
          needsSameDayConfirmation:!priorRecall&&r.sameDayFirstCorrectDate!==today});
      }
    }
    return window.__mdSchedulerV522.build({today,cap:plan.dailyCap,finalDays:plan.finalDays,priorityMode:profile.mode,priorityLabel:profile.label,
      weights:{navi2:profile.navi2,navi3:profile.navi3},grades:PLAN_GRADES.map(id=>({id,...plan.grades[id]})),rows});
  }
  // scheduler-v522-adapter:end

'''
    assert anchor in text,'scheduler adapter anchor missing'
    start=text.index('  function ppBuildTodayAssignment(plan,pools,progress,today){')
    end=text.index(anchor,start)
    text=text[:start]+adapter+text[end:]
    for name in ['ppUrgentSort','ppAllocateNewSlots','ppPriorityFlexQuotas']:
        text,n=re.subn(r'\n  function '+name+r'\(.*?\n  \}\n','\n',text,count=1,flags=re.S)
        assert n==1,'obsolete scheduler helper missing: '+name
    title='// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제'
    at=text.rfind('<script>',0,text.index(title));assert at>=0
    text=text[:at]+'<script src="scheduler-v522.js?v=5.22"></script>\n'+text[at:]
    text=text.replace("assignmentPolicy:'knowledge-gap-priority-v6-coverage-balanced',grades:{}","assignmentPolicy:'scheduler-v522',grades:{}",1)
    # The previous final-stage promise is not mathematically possible under a cap.
    text=text.replace('전범위 1회독 보장 + ','전범위 미통과량 확인 + ')
    old="      if(r.firstPassDate)bucket.review++;else bucket.new++;"
    assert old in text;text=text.replace(old,"      const scheduled=assignment.gradeCounts&&assignment.gradeCounts[item.gradeId];if(!scheduled){if(r.firstPassDate)bucket.review++;else bucket.new++;}",1)
    old="    const gradeCards=PLAN_GRADES.map(g=>{"
    new="    PLAN_GRADES.forEach(g=>{const a=assignment.gradeCounts&&assignment.gradeCounts[g];if(a){gradeCounts[g].new=a.new;gradeCounts[g].review=a.review;}});\n"+old
    assert old in text;text=text.replace(old,new,1)
    text=text.replace('하루 최대 <input id="pp-daily-cap"','하루 기본문항 상한 <input id="pp-daily-cap"',1)
    old='자동 추천은 시험일까지 필요한 신규 문제를 우선 확보합니다. 3급/2급 우선·직접 설정은 하루 전체 숙제를 선택 비율로 배분합니다. 각 급수 안에서는 틀렸거나 불확실한 문제 → 아직 안 본 신규 문제 → 일반 복습 → 정답률 높은 숙달 문제 순으로 배정합니다.'
    new='시험 당일은 학습일에서 제외하고 시험 직전 모드 기간은 회상·복습 여유로 둡니다. 급수 비율은 기본문항에 적용하며 비활성 급수의 몫은 활성 급수에 배정합니다. 복습 예산 안에서 7일 이상 연체를 우선하고, 평소에는 복습 자리를 먼저 확보한 뒤 미통과량을 배분합니다. 신규가 남으면 기본문항의 최소 30%를 신규에 남깁니다. 이는 배분 정책이며 최대 지연 7일이나 전범위 완료를 보장하지 않습니다. 상한이 부족하면 부족량을 표시합니다.'
    assert old in text;text=text.replace(old,new,1)
    anchor='        ${assignment.dueOverflow?`<div style="margin-top:10px;'
    insert=r'''        <div style="font-size:11px;color:var(--textDim);line-height:1.65;margin-top:9px">기본문항 ${assignment.keys.length}개 · 정답 진행 기준 자동 재확인 약 ${assignment.estimatedAutomaticRechecks||0}회 · 총 약 ${assignment.estimatedTotalAnswers||assignment.keys.length}회 풀이. 오답 재풀이는 별도입니다.</div>
        ${Object.entries(assignment.coverageByGrade||{}).filter(([,x])=>x.remainingFirstPass>0).map(([g,x])=>`<div style="font-size:11px;line-height:1.65;margin-top:7px;color:${x.coverageAtRisk?'#B45309':'var(--textDim)'}">${GRADE_LABELS[g]} 미통과 ${x.remainingFirstPass}개 · 신규 학습일 ${x.newStudyDays}일(시험 당일 제외·복습 여유 ${x.recallReserveDays}일). ${x.finalReview?'시험 직전 복습 우선 기간입니다.':`하루 필요 첫 통과 ${x.requiredFirstPassToday}개 / 오늘 배정 ${x.scheduledFirstPassToday}개.`}${x.coverageAtRisk?` 현재 상한·복습 배분으로 첫 통과 일정이 부족합니다${x.newShortfall?`(오늘 ${x.newShortfall}개 부족)`:''}. 전범위 완료를 보장하지 않습니다.`:''}</div>`).join('')}
        ${assignment.pendingMockReview?'<div style="font-size:11px;margin-top:7px;color:#B45309">추가된 모의고사 오답은 별도 오답 복습에서 확인하세요. 진행 중 숙제는 유지됩니다.</div>':''}
'''
    assert anchor in text;text=text.replace(anchor,insert+anchor,1)
    text=text.replace("assignment.priorityMode==='auto'?'필수 신규량 우선':'설정 비율 우선'","assignment.priorityMode==='auto'?'복습 보호·미통과량 배분':'설정 비율 우선'",1)
    text=text.replace("assignment.subjectBalancePolicy?'단일 급수 과목 균등':''","assignment.subjectBalancePolicy?'과목·신규·복습 통합 배분':''",1)
    text=text.replace('복습 예정 문제가 하루 상한을 넘어 ${assignment.dueOverflow}문제가 다음 배정으로 이월됩니다.','오늘 배정하지 못한 기한 복습 ${assignment.dueOverflow}문제가 남았습니다.',1)
    # Final-mode order is now enforced, not merely described in a rule panel.
    text=text.replace('⑤ 시험 직전 ${plan.finalDays}일은 저빈출 신규보다 빈출 미해결·복습을 우선','⑤ 시험 직전 ${plan.finalDays}일은 기한 복습을 우선하고 남는 자리에 미통과 문제 배정 · 상한 부족 시 일정 경고',1)
# Copy migrations also apply when this patch is re-run on an already patched artifact.
text=text.replace("assignment.priorityMode==='auto'?'필수 신규량 우선':'설정 비율 우선'","assignment.priorityMode==='auto'?'복습 보호·미통과량 배분':'설정 비율 우선'",1)
text=text.replace("assignment.subjectBalancePolicy?'단일 급수 과목 균등':''","assignment.subjectBalancePolicy?'과목·신규·복습 통합 배분':''",1)
text=text.replace('복습 예정 문제가 하루 상한을 넘어 ${assignment.dueOverflow}문제가 다음 배정으로 이월됩니다.','오늘 배정하지 못한 기한 복습 ${assignment.dueOverflow}문제가 남았습니다.',1)
text=text.replace('각 급수에서 7일 이상 연체를 우선하고, 평소에는 복습 자리를 먼저 확보한 뒤 미통과량을 배분합니다. 상한이 부족하면 부족량을 표시합니다.','복습 예산 안에서 7일 이상 연체를 우선하고, 평소에는 복습 자리를 먼저 확보한 뒤 미통과량을 배분합니다. 신규가 남으면 기본문항의 최소 30%를 신규에 남깁니다. 이는 배분 정책이며 최대 지연 7일이나 전범위 완료를 보장하지 않습니다. 상한이 부족하면 부족량을 표시합니다.',1)
path.write_text(text,encoding='utf-8')
print('scheduler v5.22 installed:',path)
