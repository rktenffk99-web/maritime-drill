"""Apply v5.22 mastery/session fixes after legacy generators; stdin/stdout supported."""
from pathlib import Path
import argparse,re,sys

MARKER='mastery-session-policy-v522'

def upgrade_home_detour(text):
    text=text.replace('숙달 문제도 정답률과 시험일에 따라 유지 복습', '숙달 문제도 최근 재확인 결과와 시험일에 따라 유지 복습').replace('숙달 문제도 정답률과 시험일에 따라 유지복습', '숙달 문제도 최근 재확인 결과와 시험일에 따라 유지복습')
    if '// mastery-home-detour-r3' in text:return text
    replacement=r"""  function ppFlushTodayAnswer(){
    // mastery-home-detour-r3: navigation may already have changed currentMode; the saved pending occurrence still owns its answer.
    if(planSessionKind!=='today')return true;
    const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx];
    if(!q||!Array.isArray(q['선택지'])||!Number.isInteger(answer)||answer<0||answer>=q['선택지'].length||planSessionCommitted.has(planSessionIdx))return true;
    if(currentMode!=='pass-plan-session'){
      const checkpoint=ppLoadPassSessionCheckpoint();
      if(!checkpoint||Number(checkpoint.startedAt)!==Number(planSessionStartedAt)||Number(checkpoint.nextIndex)!==planSessionIdx||checkpoint.queueKeys[planSessionIdx]!==q._planKey||!Array.isArray(checkpoint.answers)||checkpoint.answers[planSessionIdx]!==answer)return true;
    }
    const confidence=answer===q['정답']?'sure':'wrong';planSessionConfidence[planSessionIdx]=confidence;
    if(!ppCommitOutcome(q,answer,confidence))return false;
    planSessionCommitted.add(planSessionIdx);if(confidence==='sure')ppScheduleSameDayRecheck(q);
    ppSavePassSessionCheckpoint(planSessionIdx);return true;
  }"""
    text,n=re.subn(r'  function ppFlushTodayAnswer\([\s\S]*?\n  \}',lambda _:replacement,text,count=1)
    if n!=1:raise ValueError('missing selected-answer flush for home detour upgrade')
    return text

def upgrade_integration(text):
    """Also upgrade an already-integrated v5.22 artifact without regenerating other agents' changes."""
    if '// mastery-integration-r2' in text:return upgrade_home_detour(text)
    def replace(old,new):
        nonlocal text
        if old not in text:raise ValueError('missing mastery integration anchor: '+old[:100])
        text=text.replace(old,new,1)
    def fn(name,new):
        nonlocal text
        text,n=re.subn(r'  function '+re.escape(name)+r'\([\s\S]*?\n  \}',lambda _:new.rstrip(),text,count=1)
        if n!=1:raise ValueError('missing integration function '+name)
    fn('ppInitializeReviewSchedule',r"""  function ppInitializeReviewSchedule(r){
    if(r.reviewScheduleVersion===1){
      // v5.21 clients preserve unknown fields when recording a newer wrong answer.
      const newerLapse=!!(r.lastWrongDate&&(!r.reviewLapseDate||r.lastWrongDate>r.reviewLapseDate)&&(!r.reviewSuccessDate||r.lastWrongDate>=r.reviewSuccessDate));
      if((r.status==='weak'||r.lastOutcome==='wrong'||newerLapse)&&Number(r.reviewStage)>0){r.reviewStage=0;r.reviewSuccessDate=null;r.reviewLapseDate=r.lastWrongDate||r.lastDate||r.reviewLapseDate||null;}
      return;
    }
    const legacyStage=r.mastered?Math.max(1,Math.min(5,Number(r.masteryReviews)||1)):0;
    r.reviewScheduleVersion=1;r.reviewStage=legacyStage;r.reviewSuccessDate=r.mastered?(r.sameDayConfirmedDate||r.lastSureDate||null):null;
    r.reviewLapseDate=r.status==='weak'?(r.lastWrongDate||r.lastDate||null):null;
  }""")
    fn('ppAppendReviewEvidence',r"""  function ppAppendReviewEvidence(r,outcome,today,mode,identity){
    const old=Array.isArray(r.recentOutcomes)?r.recentOutcomes.filter(x=>x&&typeof x==='object'):[];
    const at=new Date().toISOString(),device=window.__mdLearningIntegrity.getDeviceId();
    const evidenceId=String(identity||device+'|event|'+at+'|'+(++ppEvidenceNonce)+'|'+Math.random().toString(36).slice(2));
    if(old.some(event=>event.evidenceId===evidenceId))return;
    r.recentOutcomes=old.concat({evidenceId,at,date:today,outcome,mode}).slice(-20);
  }""")
    helpers=r"""  // mastery-integration-r2: persist a chosen homework answer before another practice can change the same record.
  let ppEvidenceNonce=0;
  function ppMockEvidenceId(q){
    const session=(typeof pastResultId!=='undefined'&&pastResultId)||(typeof pastProgressId!=='undefined'&&pastProgressId)||(typeof pastStartedAt!=='undefined'&&pastStartedAt)||'direct';
    return 'mock|'+window.__mdLearningIntegrity.getDeviceId()+'|'+String(session)+'|'+String(q&&q._planKey||'');
  }
  function ppFlushTodayAnswer(){
    if(planSessionKind!=='today'||currentMode!=='pass-plan-session')return true;
    const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx];
    if(!q||!Number.isInteger(answer)||answer<0||answer>=q['선택지'].length)return true;
    if(!planSessionCommitted.has(planSessionIdx)){
      const confidence=answer===q['정답']?'sure':'wrong';planSessionConfidence[planSessionIdx]=confidence;
      if(!ppCommitOutcome(q,answer,confidence))return false;
      planSessionCommitted.add(planSessionIdx);if(confidence==='sure')ppScheduleSameDayRecheck(q);
    }
    ppSavePassSessionCheckpoint(planSessionIdx);return true;
  }
"""
    replace('  function ppInitializeReviewSchedule(r){',helpers+'  function ppInitializeReviewSchedule(r){')
    replace("ppAppendReviewEvidence(r,correct?confidence:'wrong',today,planSessionKind==='today'?'homework':planSessionKind);", "ppAppendReviewEvidence(r,correct?confidence:'wrong',today,planSessionKind==='today'?'homework':planSessionKind,'hw|'+commitId);")
    replace("ppAppendReviewEvidence(r,'correct',today,'predictive-mock');", "ppAppendReviewEvidence(r,'correct',today,'predictive-mock',ppMockEvidenceId(q));")
    replace("ppAppendReviewEvidence(r,'wrong',today,'predictive-mock');", "ppAppendReviewEvidence(r,'wrong',today,'predictive-mock',ppMockEvidenceId(q));")
    replace('  window.renderNavigatorPassPlan=async function(entrySubject){',"  window.renderNavigatorPassPlan=async function(entrySubject){\n    if(!ppFlushTodayAnswer())return;")
    replace("    if(!['today-wrong','frequent-wrong'].includes(kind))return;", "    if(!['today-wrong','frequent-wrong'].includes(kind))return;\n    if(!ppFlushTodayAnswer())return;")
    for name in ['startNavigatorPredictiveMock','startNavigatorEvaluationMock','startNavigatorPassPlanMock']:
        a=text.index('  window.'+name+'=async function(gradeId){');b=text.index('\n',text.index('return;',a))+1
        text=text[:b]+'    if(!ppFlushTodayAnswer())return;\n'+text[b:]
    return upgrade_home_detour(text)

def patch(text):
    if MARKER in text:return upgrade_integration(text)
    def replace(old,new,count=1):
        nonlocal text
        if text.count(old)<count:raise ValueError('missing mastery patch anchor: '+old[:100])
        text=text.replace(old,new,count)
    def fn(name,new):
        nonlocal text
        p=re.compile(r'  function '+re.escape(name)+r'\([^]*?') if False else re.compile(r'  function '+re.escape(name)+r'\([\s\S]*?\n  \}')
        text,n=p.subn(lambda _:new.rstrip(),text,count=1)
        if n!=1:raise ValueError('missing function '+name)
    replace("  let planSessionKind='today';", "  let planSessionKind='today';\n  let planSessionFirstAnswers={}; // "+MARKER)
    replace("if(planSessionKind!=='today'){localStorage.removeItem(PASS_SESSION_CHECKPOINT_KEY);return}","if(planSessionKind!=='today')return; // A separate drill must preserve today's saved session.")
    replace("        committed:Array.from(planSessionCommitted||[])\n", "        committed:Array.from(planSessionCommitted||[]),\n        firstAnswers:planSessionFirstAnswers\n")
    replace("cp.version!==2||cp.dedupePolicy!==PP_HOMEWORK_DEDUPE_POLICY||cp.subjectBalancePolicy!=='coverage-even-v2'||cp.date!==ppDateKey(new Date())||!Array.isArray(cp.queueKeys)", "cp.version!==2||cp.date!==ppDateKey(new Date())||!Array.isArray(cp.queueKeys)||cp.queueKeys.some(key=>typeof key!=='string')")
    replace("      ppClearPassSessionCheckpoint();planSessionKind=kind;", "      planSessionKind=kind;planSessionFirstAnswers={}; // Preserve the separate homework checkpoint.")
    replace("planSessionStartedAt=Number(checkpoint.startedAt)||Date.now();currentMode='pass-plan-session';", "planSessionFirstAnswers=checkpoint.firstAnswers&&typeof checkpoint.firstAnswers==='object'&&!Array.isArray(checkpoint.firstAnswers)?checkpoint.firstAnswers:{};\n            planSessionStartedAt=Number(checkpoint.startedAt)||Date.now();currentMode='pass-plan-session';")
    replace("      planSessionQueue=queue;planSessionIdx=startIndex;", "      planSessionFirstAnswers={};planSessionQueue=queue;planSessionIdx=startIndex;")
    replace("    planSessionAnswers[planSessionIdx]=i;", "    planSessionAnswers[planSessionIdx]=i;\n    if(!q._sameDayRecheck&&!Object.prototype.hasOwnProperty.call(planSessionFirstAnswers,q._planKey))planSessionFirstAnswers[q._planKey]={answer:i,correct:i===q['정답'],subject:String(q['과목']||q._planSubject||'기타')};")
    replace("planSessionCommitted=new Set();planSessionIdx=0;const saved=getPastProgress();", "planSessionCommitted=new Set();planSessionFirstAnswers={};planSessionIdx=0;const saved=getPastProgress();")

    helpers=r'''  // mastery-session-policy-v522: cumulative counters remain history; spacing uses recent independent recalls.
  function ppInitializeReviewSchedule(r){
    if(r.reviewScheduleVersion===1)return;
    const legacyStage=r.mastered?Math.max(1,Math.min(5,Number(r.masteryReviews)||1)):0;
    r.reviewScheduleVersion=1;r.reviewStage=legacyStage;r.reviewSuccessDate=r.mastered?(r.sameDayConfirmedDate||r.lastSureDate||null):null;
    r.reviewLapseDate=r.status==='weak'?(r.lastWrongDate||r.lastDate||null):null;
  }
  function ppResetReviewSchedule(r,today){
    ppInitializeReviewSchedule(r);r.reviewStage=0;r.reviewSuccessDate=null;r.reviewLapseDate=today;
    r.lateSessionNextDayRecheck=false;r.nextDayRecheckScheduledDate=null;
  }
  function ppAppendReviewEvidence(r,outcome,today,mode){
    const old=Array.isArray(r.recentOutcomes)?r.recentOutcomes.filter(x=>x&&typeof x.date==='string'&&['sure','unsure','wrong','correct'].includes(x.outcome)):[];
    r.recentOutcomes=old.concat({date:today,outcome,mode}).slice(-20);
  }
  function ppReviewDueDate(today,interval,exam){
    let days=Math.max(1,Number(interval)||1);
    const dday=exam?ppDiffDays(today,exam):null;
    if(dday!==null&&dday>=0){
      if(dday<=7)days=Math.min(days,3);
      else if(dday<=21)days=Math.min(days,7);
      else if(dday<=44)days=Math.min(days,21);
      // Never schedule into the past, including exam day / expired plans.
      if(dday>1)days=Math.min(days,dday-1);
      else if(dday<=1)days=1;
    }
    return ppAddDays(today,days);
  }
  function ppNextDayPending(rec,today){
    return !!(rec&&rec.lateSessionNextDayRecheck&&rec.nextDayRecheckScheduledDate===today&&rec.sameDayFirstCorrectDate===today&&rec.lastOutcome==='sure'&&rec.status==='provisional');
  }
  function ppResultStats(){
    const today=ppDateKey(new Date()),progress=ppLoadProgress(),base=new Map(),first=planSessionFirstAnswers||{};
    for(const [key,v] of Object.entries(first))if(v&&typeof v==='object')base.set(key,{key,subject:String(v.subject||'기타'),answer:v.answer,correct:v.correct===true});
    let recheckTotal=0,recheckAnswered=0,recheckCorrect=0;
    planSessionQueue.forEach((q,i)=>{
      if(!q||!q._planKey)return;const answer=planSessionAnswers[i];
      if(q._sameDayRecheck){recheckTotal++;if(Number.isInteger(answer)){recheckAnswered++;if(answer===q['정답'])recheckCorrect++;}return;}
      if(!base.has(q._planKey))base.set(q._planKey,{key:q._planKey,subject:String(q['과목']||q._planSubject||'기타'),answer,correct:Number.isInteger(answer)&&answer===q['정답']});
    });
    const subjects=new Map();let baseAnswered=0,baseCorrect=0,cleared=0,pendingNextDay=0,unresolved=0;
    for(const row of base.values()){
      if(!subjects.has(row.subject))subjects.set(row.subject,{subject:row.subject,total:0,firstCorrect:0,cleared:0,pendingNextDay:0,unresolved:0});
      const group=subjects.get(row.subject),r=progress[row.key]||{};group.total++;
      if(Number.isInteger(row.answer)){baseAnswered++;if(row.correct){baseCorrect++;group.firstCorrect++;}}
      if(r.sameDayConfirmedDate===today){cleared++;group.cleared++;}
      else if(ppNextDayPending(r,today)){pendingNextDay++;group.pendingNextDay++;}
      else{unresolved++;group.unresolved++;}
    }
    return {kind:planSessionKind,date:today,baseTotal:base.size,baseAnswered,baseCorrect,recheckTotal,recheckAnswered,recheckCorrect,pendingNextDay,unresolved,completed:baseAnswered===base.size&&unresolved===0,total:base.size,firstCorrect:baseCorrect,cleared,subjects:[...subjects.values()]};
  }
  let ppEvidenceRaw=null,ppEvidenceRevision=0;const ppEvidenceCache=new Map();
  window.__mdPassPlanLearningAPI={
    getEvidenceRevision(){const raw=localStorage.getItem(PROGRESS_KEY)||'{}';if(raw!==ppEvidenceRaw){ppEvidenceRaw=raw;ppEvidenceRevision++;ppEvidenceCache.clear();}return ppEvidenceRevision;},
    getResultStats:ppResultStats,
    getRecentTopicEvidence(gradeId){
      const revision=window.__mdPassPlanLearningAPI.getEvidenceRevision(),pool=planPools[gradeId]||[],cached=ppEvidenceCache.get(gradeId);
      if(cached&&cached.revision===revision&&cached.pool===pool)return cached.rows;
      const progress=ppLoadProgress(),rows=pool.filter(item=>progress[item.key]).map(item=>{
        const r=progress[item.key],q=ppFindQuestion(gradeId,item)||{};
        return {key:item.key,subject:String(item.subject||q['과목']||''),question:String(item.question||q['문제']||''),choices:Array.isArray(q['선택지'])?q['선택지'].slice():[],attempts:Number(r.attempts)||0,correct:Number(r.correct)||0,wrong:Number(r.wrong)||0,lastDate:r.lastDate||null,lastOutcome:r.lastOutcome||null,lastPracticeMode:r.lastPracticeMode||null,recentOutcomes:Array.isArray(r.recentOutcomes)?r.recentOutcomes.slice():[]};
      });
      ppEvidenceCache.set(gradeId,{revision,pool,rows});return rows;
    }
  };
'''
    replace("  function ppCommitOutcome(q,answer,confidence){",helpers+"  function ppCommitOutcome(q,answer,confidence){")
    fn('ppCommitOutcome',r'''  function ppCommitOutcome(q,answer,confidence){
    const progress=ppLoadProgress(),r=ppProgressFor(progress,q._planKey),today=ppDateKey(new Date()),correct=answer===q['정답'];
    const commitId=planSessionCommitIds[planSessionIdx]||(planSessionCommitIds[planSessionIdx]=window.__mdLearningIntegrity.getDeviceId()+'|'+planSessionStartedAt+'|'+planSessionIdx);
    const commitIds=Array.isArray(r.homeworkCommitIds)?r.homeworkCommitIds.filter(v=>typeof v==='string'):[];
    if(r.lastHomeworkCommitId===commitId||commitIds.includes(commitId))return true;
    let removeWrong=false;
    window.__mdLearningIntegrity.initializeCounters(r);ppInitializeReviewSchedule(r);
    const oldMasteryReviews=Number(r.masteryReviews)||0,priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;
    const priorDeferred=!!(r.lateSessionNextDayRecheck&&r.nextDayRecheckScheduledDate&&r.nextDayRecheckScheduledDate<today&&priorFirstCorrect&&priorFirstCorrect<today);
    r.lastPracticeMode='homework';r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';
    if(correct)r.correct=(r.correct||0)+1;else r.wrong=(r.wrong||0)+1;
    if(correct&&confidence==='unsure')r.unsure=(r.unsure||0)+1;
    if(correct&&confidence==='sure'){
      r.lastSureDate=today;
      const retainedAcrossDay=!!((priorConfirmed&&priorConfirmed<today)||priorDeferred),exam=ppExamDay(ppLoadPlan(),q._planGrade);
      if(retainedAcrossDay){
        r.status='mastered';r.mastered=true;r.masteryReviews=(r.masteryReviews||0)+1;
        if(r.reviewSuccessDate!==today){r.reviewStage=Math.min(5,Math.max(0,Number(r.reviewStage)||0)+1);r.reviewSuccessDate=today;}
        r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;
        r.lateSessionNextDayRecheck=false;r.nextDayRecheckScheduledDate=null;
        const interval=[1,5,7,14,21,30][Math.max(1,Math.min(5,Number(r.reviewStage)||1))];
        r.dueDate=ppReviewDueDate(today,interval,exam);removeWrong=true;
      }else if(priorConfirmed===today&&r.mastered){
        // Manual same-day revisits must not demote an already retained item or advance spacing twice.
        r.sameDayFirstCorrectDate=today;removeWrong=true;
      }else if(priorFirstCorrect===today){
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;
        r.lateSessionNextDayRecheck=false;r.nextDayRecheckScheduledDate=null;r.dueDate=ppReviewDueDate(today,2,exam);removeWrong=true;
      }else{
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
        r.lateSessionNextDayRecheck=false;r.nextDayRecheckScheduledDate=null;
      }
      if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today;
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;r.todayWrongReviewDate=null;
      ppResetReviewSchedule(r,today);
    }
    ppAppendReviewEvidence(r,correct?confidence:'wrong',today,planSessionKind==='today'?'homework':planSessionKind);
    window.__mdLearningIntegrity.appendOutcome(r,correct?confidence:'wrong',(Number(r.masteryReviews)||0)>oldMasteryReviews);
    r.lastHomeworkCommitId=commitId;r.homeworkCommitIds=commitIds.concat(commitId).slice(-64);progress[q._planKey]=r;
    if(!ppSaveProgress(progress))return false;
    if(removeWrong)removePastWrong(pqid(q));else if(!correct)addPastWrong(q,answer);
    return true;
  }''')
    replace("function ppTodayCleared(rec,today){return !!(rec&&rec.sameDayConfirmedDate===today)}", "function ppTodayCleared(rec,today){return !!(rec&&(rec.sameDayConfirmedDate===today||ppNextDayPending(rec,today)))}")
    replace("rec.status='provisional';rec.mastered=false;rec.sameDayConfirmedDate=today;\n        rec.recoveryStartDate=null;rec.dueDate=ppAddDays(today,1);rec.lateSessionNextDayRecheck=true;", "rec.status='provisional';rec.mastered=false;rec.sameDayConfirmedDate=null;\n        rec.recoveryStartDate=null;rec.dueDate=ppReviewDueDate(today,1,ppExamDay(ppLoadPlan(),q._planGrade));rec.lateSessionNextDayRecheck=true;rec.nextDayRecheckScheduledDate=today;")

    replace("if(planSessionIdx>=planSessionQueue.length)ppClearPassSessionCheckpoint();else ppSavePassSessionCheckpoint(planSessionIdx);", "if(planSessionIdx>=planSessionQueue.length){if(planSessionKind==='today')ppClearPassSessionCheckpoint();}else ppSavePassSessionCheckpoint(planSessionIdx);")
    replace("  window.retryNavigatorPassPlanUnresolved=async function(){\n    planSessionKind='today';", "  window.retryNavigatorPassPlanUnresolved=async function(){\n    if(planSessionKind!=='today')return; // Separate drills cannot replace saved homework.\n    planSessionKind='today';")
    # A completed mock may add evidence, but cannot silently replace an in-progress day's assignment.
    start=text.index('  window.commitNavigatorPredictiveMockResult=');end=text.index('  const PP_EVALUATION_EXPOSURE_KEY=',start)
    body=text[start:end]
    old="if(answer===q['정답']){window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}"
    if old not in body:raise ValueError('mock correct anchor missing')
    body=body.replace(old,"if(answer===q['정답']){ppAppendReviewEvidence(r,'correct',today,'predictive-mock');window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}",1)
    old="r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;r.todayWrongReviewDate=null;r.dueDate=today;"
    if old not in body:raise ValueError('mock lapse anchor missing')
    body=body.replace(old,old+"\n      ppResetReviewSchedule(r,today);ppAppendReviewEvidence(r,'wrong',today,'predictive-mock');",1)
    old="    const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);"
    if old not in body:raise ValueError('mock daily anchor missing')
    body=body.replace(old,"""    const daily=ppLoadDaily(),checkpoint=ppLoadPassSessionCheckpoint();
    if(checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length){
      if(daily[today]){
        const newWrong=rows.filter((q,i)=>q&&q._planKey&&answers&&Number.isInteger(answers[i])&&answers[i]!==q['정답']).map(q=>q._planKey);
        daily[today].pendingMockReviewKeys=[...new Set([...(Array.isArray(daily[today].pendingMockReviewKeys)?daily[today].pendingMockReviewKeys:[]),...newWrong])];
        daily[today].pendingMockReview=daily[today].pendingMockReviewKeys.length>0;
      }
    }else delete daily[today];
    ppSaveDaily(daily);""",1)
    text=text[:start]+body+text[end:]
    # The saved session is authoritative even across a policy upgrade on the same day.
    replace("    if(force||!daily[today]||daily[today].signature!==signature){", """    const activeCheckpoint=ppLoadPassSessionCheckpoint();
    if(activeCheckpoint&&Array.isArray(activeCheckpoint.queueKeys)&&activeCheckpoint.queueKeys.length){
      const byKey=new Map(PLAN_GRADES.flatMap(g=>(pools[g]||[])).map(item=>[item.key,item]));
      const keys=[...new Set(activeCheckpoint.queueKeys)].filter(key=>byKey.has(key));
      if(keys.length){
        const previous=daily[today]||{},gradeCounts={navi2:{review:0,new:0},navi3:{review:0,new:0}};let dueCount=0;
        keys.forEach(key=>{const item=byKey.get(key),g=item.gradeId||String(key).split('|')[0],due=ppIsDue(progress[key],today);if(due)dueCount++;if(gradeCounts[g])gradeCounts[g][due?'review':'new']++;});
        const sameKeys=Array.isArray(previous.keys)&&JSON.stringify(previous.keys)===JSON.stringify(keys);
        daily[today]={...previous,keys,signature,resumedCheckpoint:true,assignmentOrigin:'saved-session',
          ...(sameKeys?{}:{dueCount,newCount:keys.length-dueCount,gradeCounts,dueOverflow:0,newShortfall:0,coverageAtRisk:false}),
          estimatedAutomaticRechecks:Math.max(0,activeCheckpoint.queueKeys.length-keys.length),estimatedTotalAnswers:activeCheckpoint.queueKeys.length};
        ppSaveDaily(daily);return daily[today];
      }
    }
    if(force||!daily[today]||daily[today].signature!==signature){""")
    # Preserve first attempts and remove duplicated unresolved source occurrences on retry.
    replace("const keys=planSessionQueue.map(q=>q._planKey).filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today));", "const keys=[...new Set(planSessionQueue.map(q=>q._planKey).filter(k=>!ppTodayCleared(ppProgressFor(progress,k),today)))];")
    replace("planSessionStartedAt=Date.now();planSessionCommitted=new Set();currentMode='pass-plan-session';renderNavigatorPassPlanCard();\n  };\n\n  // 첫 진입", "planSessionStartedAt=Date.now();planSessionCommitted=new Set();currentMode='pass-plan-session';ppSavePassSessionCheckpoint(0);renderNavigatorPassPlanCard();\n  };\n\n  // 첫 진입")

    # Oral SM-2 keeps its recurrence model and same-day safeguards. Only the actual due date is capped.
    oral=r'''// oral-review-exam-cap-v522: keep the SM-2 interval model; bring an actual due date inside the remaining exam window.
function mdOralReviewDays(interval){
  const days=Math.max(1,Number(interval)||1);
  if(typeof schedule==='undefined'||!schedule||typeof schedule.exam!=='string')return days;
  const match=schedule.exam.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return days;
  const exam=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
  if(exam.getFullYear()!==Number(match[1])||exam.getMonth()!==Number(match[2])-1||exam.getDate()!==Number(match[3]))return days;
  const today=new Date();today.setHours(0,0,0,0);const left=Math.round((exam-today)/86400000);
  return left>0?Math.min(days,Math.max(1,left-1)):days;
}
'''
    replace("function updateSM2(item, q){",oral+"function updateSM2(item, q){")
    replace("next.setDate(next.getDate() + interval);", "next.setDate(next.getDate() + mdOralReviewDays(interval));")
    replace("if(sameDay&&effectiveQ===item.sm2DayQuality)return item.interval||1;", "if(sameDay&&effectiveQ===item.sm2DayQuality)return mdOralReviewDays(item.interval||1);")
    start=text.index('function previewNextInterval(');end=text.index('function fmtInterval(',start)
    body=text[start:end].replace('  return interval;','  return mdOralReviewDays(interval);')
    text=text[:start]+body+text[end:]
    replace("Leitner BOX2(3일)·BOX3(7일) 간격반복이 1회전밖에 안 됩니다. 14일 이상을 권장합니다.","SM-2 간격복습은 첫 성공 1일, 다음 성공 6일 뒤를 기준으로 조정합니다. 시험이 가까우면 실제 복습일을 시험 전으로 당깁니다.")
    replace("답을 선택하면 정답·오답이 기록됩니다. 첫 정답 후 같은 날 재확인까지 맞히면 오늘 확인 완료, 다른 날 다시 맞히면 숙달됩니다.","답을 고른 뒤 다음 문제로 이동하면 정답·오답이 기록됩니다. 당일 재확인 또는 다음 날 확인 예정으로 구분하며, 다른 날 다시 맞히면 숙달됩니다.")
    return upgrade_integration(text)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--stdin',action='store_true');parser.add_argument('--stdout',action='store_true');args=parser.parse_args()
    original=sys.stdin.read() if args.stdin else Path('index.html').read_text(encoding='utf-8-sig')
    result=patch(original)
    if args.stdout:sys.stdout.write(result)
    elif result!=original:Path('index.html').write_text(result,encoding='utf-8');print('patched v5.22 mastery, session preservation and oral due dates')
    else:print('v5.22 mastery/session policy already applied')
if __name__=='__main__':main()
