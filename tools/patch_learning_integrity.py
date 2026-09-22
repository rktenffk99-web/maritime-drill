"""Apply v5.11 invariants after the legacy generators. Safe to rerun."""
from pathlib import Path
import re

p=Path('index.html');text=p.read_text(encoding='utf-8-sig');original=text

def replace(old,new):
    global text
    if new in text:return
    if old in text:text=text.replace(old,new)
    else:raise RuntimeError('missing integrity anchor: '+old[:100])

def section(start,end,new):
    global text
    a=text.index(start);b=text.index(end,a);text=text[:a]+new+text[b:]

text=re.sub(r"const APP_VERSION = '[^']+';","const APP_VERSION = '5.11';",text,count=1)
text=re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>','<title>Maritime Drill v5.11 · Android</title>',text,count=1)
replace('*{margin:0;padding:0;box-sizing:border-box}', '*{margin:0;padding:0;box-sizing:border-box}\nbutton,input,select,textarea{font-family:inherit}')

# Every session uses the same guard; original source data remains available for repair.
if 'function mdQuestionContentIssue(q)' not in text:
    anchor='function pastChoiceText(value){'
    helpers='''function mdQuestionContentIssue(q){return window.__mdLearningIntegrity.contentIssue(q)}
function mdQuestionUsable(q){return !mdQuestionContentIssue(q)}
function mdGuardPastQueue(){
  const kept=[],answers=[];let removed=0,before=0;
  pastQueue.forEach((q,i)=>{if(mdQuestionUsable(q)){kept.push(q);answers.push(pastAnswers[i]===undefined?null:pastAnswers[i])}else{removed++;if(i<pastIdx)before++}});
  if(!removed)return true;
  pastQueue=kept;pastAnswers=answers;pastIdx=Math.max(0,Math.min(pastIdx-before,kept.length-1));
  showToast(`그림·밑줄 원문 확인이 필요한 ${removed}문항은 출제와 채점에서 제외했습니다.`,5000);
  if(kept.length)return true;
  clearPastProgress();currentMode='past-unavailable';
  app.innerHTML=`<div class="card" style="margin-top:24px"><b>원문 확인이 필요한 문제입니다.</b><p>그림 또는 밑줄 정보가 없어 풀이와 채점에서 제외했습니다. 학습 진도에는 반영하지 않습니다.</p><button class="btn btn-outline" onclick="goBackFromPastSession()">돌아가기</button></div>`;
  return false;
}
'''
    replace(anchor,helpers+anchor)
replace("  if(pastReturnView!=='pass-plan-predictive-mock')savePastProgress();","  if(!mdGuardPastQueue())return;\n  savePastProgress();")
# Existing past-paper sampling must filter before drawing its per-subject quota.
replace("    if(!filterSet.has(q['과목'])) return;","    if(!filterSet.has(q['과목'])||!mdQuestionUsable(q)) return;")
replace("        if(!selected.has(group.subject))return;","        if(!selected.has(group.subject)||!mdQuestionUsable({question:group.question}))return;")
replace("      if(q)return {...q,_year:hit.year", "      if(q&&mdQuestionUsable(q))return {...q,_year:hit.year")
replace("n3aNormalizeQuestion(q['문제'])===item.normalized", "n3aNormalizeQuestion(q['문제'])===n3aNormalizeQuestion(item.normalized||item.question)")
replace("    planPools=pools;\n    return pools;", """    for(const gradeId of PLAN_GRADES){
      if(!pools[gradeId].length)continue;
      if(!pastDataSubjectsLoaded.has(gradeId))await ensurePastDataForSubject(gradeId);
      pools[gradeId]=pools[gradeId].filter(item=>!!ppFindQuestion(gradeId,item));
    }
    planPools=pools;
    return pools;""")

# Persist predictive identity as well as canonical question references.
replace("let pastQueue=[], pastIdx=0, pastAnswers=[], pastMode='study', pastStartedAt=0;", "let pastQueue=[], pastIdx=0, pastAnswers=[], pastMode='study', pastStartedAt=0;\nlet pastResultId=null;")
replace("  currentMode='past-result';\n  clearPastProgress();", "  currentMode='past-result';\n  pastResultId=pastProgressId;\n  clearPastProgress();")
replace("source:q._source,group:q._n3aGroupId}","source:q._source,group:q._n3aGroupId,predictive:q._predictiveMock===true,predictiveReview:q._predictiveReview===true,planKey:q._planKey,planGrade:q._planGrade,predictiveConcept:q._predictiveConcept}")
replace("return {...q,_source:r.source,_n3aGroupId:r.group};","return {...q,_source:r.source,_n3aGroupId:r.group,_predictiveMock:r.predictive===true,_predictiveReview:r.predictiveReview===true,_planKey:r.planKey,_planGrade:r.planGrade,_predictiveConcept:r.predictiveConcept};")
replace("  pastQueue=shuffle(weak);pastAnswers=", "  pastQueue=shuffle(weak.map(q=>q._predictiveMock?{...q,_predictiveReview:true}:q));pastAnswers=")

# Reset must invalidate both the persistent and live session state.
replace("safeStorageSet(PROGRESS_KEY,'{}','합격 플랜 진도');safeStorageSet(DAILY_KEY,'{}','합격 플랜 오늘 숙제');renderNavigatorPassPlan(planEntrySubject);",
"safeStorageSet(PROGRESS_KEY,'{}','합격 플랜 진도');safeStorageSet(DAILY_KEY,'{}','합격 플랜 오늘 숙제');ppClearPassSessionCheckpoint();planSessionQueue=[];planSessionAnswers=[];planSessionConfidence=[];planSessionCommitted=new Set();planSessionIdx=0;const saved=getPastProgress();if(saved&&saved.meta.returnView==='pass-plan-predictive-mock')clearPastProgress();renderNavigatorPassPlan(planEntrySubject);")

# Grade-scoped rolling profiles preserve other grades and subjects.
replace('const weakProfile=ppLoadWeakTopicProfile();','const weakProfile=ppLoadWeakTopicProfile(g);')
section('  function ppLoadWeakTopicProfile(', '  function ppPredictivePersonalMultiplier(', '''  function ppLoadWeakTopicProfile(gradeId){
    try{
      const v=JSON.parse(localStorage.getItem(WEAK_TOPIC_PROFILE_KEY)||'null');if(!v)return {};
      if(v.grades&&v.grades[gradeId])return window.__mdWeakTopicAnalytics.aggregateProfile(v.grades[gradeId]);
      if(v.version>=2)return {};
      return v.topics&&typeof v.topics==='object'?v.topics:{};
    }catch(e){return {}}
  }
  function ppWeakTopicBoost(item,profile){
    const grade=item&&(item.gradeId||item._planGrade||String(item.key||item._planKey||'').split('|')[0]);
    const p=profile||ppLoadWeakTopicProfile(grade),key=`${item&&item.subject||'기타'}|${ppWeakTopicId(item)}`,row=p[key];
    if(!row||!(Number(row.wrong)+(Number(row.unanswered)||0)>0))return 1;
    const share=Math.max(0,Math.min(100,Number(row.targetShare)||0));
    const err=Math.max(0,Math.min(100,Number(row.reviewRate===undefined?row.errorRate:row.reviewRate)||0));
    return Math.min(1.75,1+share/180+err/500);
  }
''')

# Checkpoint saves the current question until the user actually advances.
replace("queueKeys:planSessionQueue.map(q=>q._planKey),nextIndex:idx,", "queueKeys:planSessionQueue.map(q=>q._planKey),nextIndex:idx,startedAt:planSessionStartedAt,")
replace("            planSessionStartedAt=Date.now();currentMode='pass-plan-session';", "            planSessionStartedAt=Number(checkpoint.startedAt)||Date.now();currentMode='pass-plan-session';")
replace("for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);", "for(let i=0;i<nextIndex;i++)if(planSessionAnswers[i]!==null)planSessionCommitted.add(i);")

section('  window.chooseNavigatorPassPlanAnswer=function(i){','  function ppCommitOutcome(q,answer,confidence){','''  window.chooseNavigatorPassPlanAnswer=function(i){
    if(currentMode!=='pass-plan-session')return;
    const q=planSessionQueue[planSessionIdx];
    if(planSessionAnswers[planSessionIdx]!==null||!q||!Number.isInteger(i)||i<0||i>=q['선택지'].length)return;
    planSessionAnswers[planSessionIdx]=i;
    planSessionConfidence[planSessionIdx]=i===q['정답']?null:'wrong';
    ppSavePassSessionCheckpoint(planSessionIdx);renderNavigatorPassPlanCard();
  };
  window.setNavigatorPassPlanConfidence=function(value){
    if(currentMode!=='pass-plan-session'||!['sure','unsure'].includes(value)||planSessionCommitted.has(planSessionIdx))return;
    const q=planSessionQueue[planSessionIdx];if(!q||planSessionAnswers[planSessionIdx]!==q['정답'])return;
    planSessionConfidence[planSessionIdx]=value;ppSavePassSessionCheckpoint(planSessionIdx);renderNavigatorPassPlanCard();
  };
''')
section('  window.nextNavigatorPassPlanQuestion=function(){','  window.renderNavigatorPassPlanResult=function(){','''  window.nextNavigatorPassPlanQuestion=function(){
    if(currentMode!=='pass-plan-session')return;
    const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx],confidence=planSessionConfidence[planSessionIdx];
    if(answer===null||!confidence)return;
    if(!planSessionCommitted.has(planSessionIdx)){
      ppCommitOutcome(q,answer,confidence);planSessionCommitted.add(planSessionIdx);
      if(confidence==='sure')ppScheduleSameDayRecheck(q);
    }
    planSessionIdx++;
    if(planSessionIdx>=planSessionQueue.length)ppClearPassSessionCheckpoint();else ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();
  };
''')
replace('    const canNext=showFeedback;',"    const canNext=showFeedback&&!!confidence;")
replace('    const priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;',
"    window.__mdLearningIntegrity.initializeCounters(r);const oldMasteryReviews=Number(r.masteryReviews)||0;\n    const priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;")
replace('    progress[q._planKey]=r;ppSaveProgress(progress);',"    window.__mdLearningIntegrity.appendOutcome(r,correct?confidence:'wrong',(Number(r.masteryReviews)||0)>oldMasteryReviews);\n    progress[q._planKey]=r;ppSaveProgress(progress);")
replace("r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';", "r.lastPracticeMode='homework';r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';")
replace("if(!(rec&&rec.lastDate===today&&Number(rec.attempts||0)>0))break;", "if(!(rec&&rec.lastPracticeMode!=='predictive-mock'&&rec.lastDate===today&&Number(rec.attempts||0)>0))break;")

# Correct mock responses count as practice but do not imply mastery.
replace("      if(!q||!q._predictiveMock||!q._planKey)return;\n      if(answers&&answers[i]===q['정답'])return;\n      const r=ppProgressFor(progress,q._planKey);",
"      if(!q||!q._predictiveMock||q._predictiveReview||!q._planKey)return;\n      const r=ppProgressFor(progress,q._planKey);window.__mdLearningIntegrity.initializeCounters(r);r.lastPracticeMode='predictive-mock';\n      if(answers&&answers[i]===q['정답']){window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}")
replace("r.todayWrongReviewDate=null;r.dueDate=today;\n    });", "r.todayWrongReviewDate=null;r.dueDate=today;\n      window.__mdLearningIntegrity.appendOutcome(r,'wrong',false);\n    });")
replace("const complete=rows.length>0&&Array.isArray(answers)","const complete=rows.length>0&&!rows.some(q=>q&&q._predictiveReview)&&Array.isArray(answers)")

# Shuffle only the presentation order, preserving canonical IDs and explanation lookup.
if 'function ppChoiceOrder(q)' not in text:
    replace('  window.startNavigatorPassPlanToday=async function(){', '''  function ppChoiceOrder(q){
    const helper=window.__mdLearningIntegrity,base=helper.optionOrder(q._planKey,planSessionStartedAt,0);
    if(!q._sameDayRecheck)return base;
    const repeat=helper.optionOrder(q._planKey,planSessionStartedAt,1);
    return JSON.stringify(base)===JSON.stringify(repeat)?repeat.slice(1).concat(repeat[0]):repeat;
  }
  window.startNavigatorPassPlanToday=async function(){''')
replace("const grade=q._planGrade,color=ppGradeColor(grade),markers=['㉮','㉯','㉰','㉱'];", "const grade=q._planGrade,color=ppGradeColor(grade),markers=['㉮','㉯','㉰','㉱'],order=ppChoiceOrder(q);")
replace("${q['선택지'].map((opt,i)=>{let bg=", "${order.map((i,displayIdx)=>{const opt=q['선택지'][i];let bg=")
replace('${markers[i]}</b>${escapeHtml(pastChoiceText(opt))}', '${markers[displayIdx]}</b>${escapeHtml(pastChoiceText(opt))}')
replace("'오답 · 정답 '+markers[correct]", "'오답 · 정답 '+markers[order.indexOf(correct)]")
if '${window.__mdLearningIntegrity.remapExplanation(renderExplainBlock(q),order)}' not in text:
    replace('${renderExplainBlock(q)}${isCorrect?', '${window.__mdLearningIntegrity.remapExplanation(renderExplainBlock(q),order)}${isCorrect?')
# v5.16 removes the self-rating controls in the final UI pass.
if 'onclick="setNavigatorPassPlanConfidence(' in text:
    replace("${confidence==='sure'?'btn-green':'btn-outline'}\"", "${confidence==='sure'?'btn-green':'btn-outline'}\" ${planSessionCommitted.has(planSessionIdx)?'disabled':''}")
    replace("${confidence==='unsure'?'btn-accent':'btn-outline'}\"", "${confidence==='unsure'?'btn-accent':'btn-outline'}\" ${planSessionCommitted.has(planSessionIdx)?'disabled':''}")

# v5.14 places learning guidance in the records/help panel instead of the hero.
# This is only the legacy explanatory text; question eligibility above is always patched.
if '시험일까지 필요한 문제를 배정합니다. 오늘 공부를 시작하거나 남은 문제를 이어서 풀어보세요.' not in text:
    replace('다른 날 다시 맞혀야 숙달됩니다.</div>', '다른 날 다시 맞혀야 숙달됩니다.<br>그림·밑줄 원문 확인이 필요한 문항은 자동 출제에서 제외합니다.</div>')

# Cache versions prevent an older UI script from removing the required confidence buttons.
text=re.sub(r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>',lambda m:f'<script src="{m[1]}.js?v=5.11"></script>',text)

# Save the generated artifact.
if text!=original:p.write_text(text,encoding='utf-8')
print('learning integrity v5.11 patch applied')
