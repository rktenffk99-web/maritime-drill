"""v5.18 exam-readiness algorithm fixes.
Runs after the legacy patch chain so the final artifact keeps these invariants:
- unanswered mock items do not poison adaptive progress
- single-grade subject balancing never sacrifices required unseen coverage
- same-day recall never repeats immediately at the end of a session
- a non-personalized evaluation mock is available for score tracking
"""
from pathlib import Path
import re

p = Path("index.html")
text = p.read_text(encoding="utf-8-sig")
original = text

def require(needle, label=None):
    if needle not in text:
        raise SystemExit(f"missing readiness anchor: {label or needle[:120]}")

text = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.18';", text, count=1)
text = re.sub(r"<title>Maritime Drill v[\d.]+ · Android</title>", "<title>Maritime Drill v5.18 · Android</title>", text, count=1)
text = re.sub(
    r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>',
    lambda m: f'<script src="{m[1]}.js?v=5.18"></script>',
    text,
)

if "mock-unanswered-neutral-v1" not in text:
    marker = """      if(!q||!q._predictiveMock||q._predictiveReview||!q._planKey)return;
      const r=ppProgressFor(progress,q._planKey);window.__mdLearningIntegrity.initializeCounters(r);r.lastPracticeMode='predictive-mock';
      if(answers&&answers[i]===q['정답']){window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}"""
    replacement = """      if(!q||!q._predictiveMock||q._predictiveReview||q._evaluationMock||!q._planKey)return;
      const answer=answers&&answers[i]; // mock-unanswered-neutral-v1
      if(answer===null||answer===undefined)return;
      const r=ppProgressFor(progress,q._planKey);window.__mdLearningIntegrity.initializeCounters(r);r.lastPracticeMode='predictive-mock';
      if(answer===q['정답']){window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}"""
    if marker not in text:
        raise SystemExit("predictive result learning hook anchor not found")
    text = text.replace(marker, replacement, 1)

text = text.replace(
    "if(pastAnswers[i] === q['정답']) removePastWrong(pqid(q));",
    "if(!q._evaluationMock&&pastAnswers[i] === q['정답']) removePastWrong(pqid(q));",
    1,
)

balance_fn = r"""  function ppBalanceSingleGradeSubjects(plan,pools,progress,today,assignment){ // coverage-balanced-v2
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
    const requiredNew=Math.min(target,Math.max(0,Number(assignment&&assignment.requiredNew)||0));
    const originalRank=new Map(originalKeys.map((key,index)=>[key,index]));
    const byKey=new Map(pool.map(item=>[item.key,item]));
    const weakProfile=ppLoadWeakTopicProfile(grade);

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
      if(!rowsBySubject.has(subject))continue;
      // Do not let subject balancing resurrect an already-seen question before its review date.
      // Eligible replacements are only genuinely unseen questions or reviews that are actually due today.
      if(ppHomeworkClusterSeen(item,progress)&&!ppIsDue(ppProgressFor(progress,item.key),today))continue; // no-premature-review-v1
      rowsBySubject.get(subject).push(item);
    }
    rowsBySubject.forEach(rows=>rows.sort(compare));

    const quotas=ppEvenSubjectQuotas(subjects,target,today);
    const pickedBySubject=new Map(subjects.map(s=>[s,[]]));
    const selectedClusters=new Set(),selectedKeys=new Set();
    const cursor=Object.fromEntries(subjects.map(s=>[s,0]));

    function add(item){
      if(!item||selectedKeys.has(item.key))return false;
      const subject=String(item.subject||'').trim(),rows=pickedBySubject.get(subject);
      if(!rows)return false;
      const cid=ppHomeworkClusterId(item);
      if(selectedClusters.has(cid))return false;
      rows.push(item);selectedKeys.add(item.key);selectedClusters.add(cid);return true;
    }
    function pickNext(subject){
      const rows=rowsBySubject.get(subject)||[];
      while(cursor[subject]<rows.length){
        const item=rows[cursor[subject]++];
        if(add(item))return true;
      }
      return false;
    }

    for(const key of originalKeys){
      if(selectedKeys.size>=requiredNew)break;
      const item=byKey.get(key);
      if(item&&!ppHomeworkClusterSeen(item,progress))add(item);
    }
    if(selectedKeys.size<requiredNew){
      const unseen=pool.filter(item=>!ppHomeworkClusterSeen(item,progress)).sort(compare);
      for(const item of unseen){if(selectedKeys.size>=requiredNew)break;add(item)}
    }
    const reservedNewCount=selectedKeys.size;

    const seed=[...String(today||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%subjects.length;
    const order=subjects.map((_,i)=>subjects[(seed+i)%subjects.length]);
    while(selectedKeys.size<target){
      let added=false;
      for(const subject of order){
        if(selectedKeys.size>=target)break;
        if((pickedBySubject.get(subject)||[]).length>=(quotas[subject]||0))continue;
        if(pickNext(subject))added=true;
      }
      if(!added)break;
    }
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
    const subjectBalanceRelaxedForCoverage=subjects.some(s=>(subjectCounts[s]||0)>(quotas[s]||0));
    return {...assignment,keys:ordered.map(item=>item.key),newCount:balancedNewCount,dueCount:balancedDueCount,
      newShortfall:Math.max(0,requiredNew-balancedNewCount),gradeCounts,subjectQuotaTarget:quotas,subjectCounts,
      requiredNewReserved:Math.min(requiredNew,reservedNewCount),coverageProtected:balancedNewCount>=requiredNew,
      subjectBalanceRelaxedForCoverage,subjectBalancePolicy:PP_SUBJECT_BALANCE_POLICY,
      rotationPolicy:'knowledge-gap-priority-v6-coverage-balanced'};
  }
"""
pattern = r"  function ppBalanceSingleGradeSubjects\(plan,pools,progress,today,assignment\)\{.*?\n  \}(?=\n+\s*const ppBuildTodayAssignmentBeforeSubjectBalance)"
text, n = re.subn(pattern, balance_fn, text, count=1, flags=re.S)
if n != 1:
    raise SystemExit("subject balance function not found")

text = text.replace(
    "const PP_SUBJECT_BALANCE_POLICY='even-subject-v1'",
    "const PP_SUBJECT_BALANCE_POLICY='coverage-even-v2'",
    1,
)
text = text.replace(
    "assignmentPolicy:'knowledge-gap-priority-v5-subject-balanced'",
    "assignmentPolicy:'knowledge-gap-priority-v6-coverage-balanced'",
    1,
)
text = text.replace("subjectBalancePolicy:'even-subject-v1'", "subjectBalancePolicy:'coverage-even-v2'")
text = text.replace("cp.subjectBalancePolicy!=='even-subject-v1'", "cp.subjectBalancePolicy!=='coverage-even-v2'")

recheck_fn = r"""  function ppScheduleSameDayRecheck(q){ // spaced-recheck-tail-v2
    if(planSessionKind!=='today'||!q||!q._planKey)return false;
    const today=ppDateKey(new Date()),r=ppProgressFor(ppLoadProgress(),q._planKey);
    if(r.sameDayConfirmedDate===today||r.sameDayFirstCorrectDate!==today||r.lastOutcome!=='sure')return false;
    if(planSessionQueue.slice(planSessionIdx+1).some(x=>x&&x._planKey===q._planKey))return false;

    const minimumGap=15;
    const remainingBase=planSessionQueue.slice(planSessionIdx+1).reduce((n,x)=>n+((x&&x._sameDayRecheck)?0:1),0);
    if(remainingBase<minimumGap){
      const progress=ppLoadProgress(),rec=ppProgressFor(progress,q._planKey);
      if(rec.sameDayFirstCorrectDate===today&&!rec.sameDayConfirmedDate){
        rec.status='provisional';rec.mastered=false;rec.sameDayConfirmedDate=today;
        rec.recoveryStartDate=null;rec.dueDate=ppAddDays(today,1);rec.lateSessionNextDayRecheck=true;
        progress[q._planKey]=rec;ppSaveProgress(progress);
      }
      return false;
    }

    const delay=30+Math.floor(Math.random()*21);
    const desiredGap=Math.max(minimumGap,Math.min(delay,remainingBase));
    let baseSeen=0,insertAt=planSessionQueue.length;
    for(let i=planSessionIdx+1;i<planSessionQueue.length;i++){
      if(!(planSessionQueue[i]&&planSessionQueue[i]._sameDayRecheck))baseSeen++;
      if(baseSeen>=desiredGap){insertAt=i+1;break}
    }
    const copy={...q,_sameDayRecheck:true,_sameDayRecheckDelay:desiredGap};
    planSessionQueue.splice(insertAt,0,copy);
    planSessionAnswers.splice(insertAt,0,null);
    planSessionConfidence.splice(insertAt,0,null);
    return true;
  }
"""
text, n = re.subn(r"  function ppScheduleSameDayRecheck\(q\)\{.*?\n  \}", recheck_fn, text, count=1, flags=re.S)
if n != 1:
    raise SystemExit("same-day recheck function not found")

text = text.replace(
    "오늘 숙제에서 처음 맞힌 문제는 30~50문제 뒤 자동 재확인됩니다.",
    "오늘 숙제에서 처음 맞힌 문제는 30~50문제 뒤 자동 재확인됩니다. 세션 끝부분은 최소 15문제 간격을 확보하고, 여유가 없으면 다음 날 재확인합니다.",
    1,
)

if "evaluation-mock-v1" not in text:
    anchor = "  window.startNavigatorPassPlanMock=async function(gradeId){"
    require(anchor, "balanced mock start")
    evaluation = r"""  const PP_EVALUATION_EXPOSURE_KEY='md_evaluation_mock_exposure_v1'; // evaluation-mock-v1
  function ppEvaluationShuffle(rows,random=Math.random){
    const out=(rows||[]).slice();
    for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
    return out;
  }
  function ppEvaluationSelect(items,options){
    const engine=window.__mdBalancedMock,{gradeId,data,state,identity,random=Math.random}=options;
    const seenIds=new Set(),seenText=new Set(),rows=[];
    for(const item of (items||[])){
      const id=String(identity(item)),fp=ppPredictiveQuestionFingerprint(item);
      if(!id||seenIds.has(id)||seenText.has(fp))continue;
      seenIds.add(id);seenText.add(fp);rows.push({item,id,fp,topic:engine.topic(item,data)});
    }
    const target=Math.min(Math.max(0,Math.floor(Number(options.count)||0)),rows.length);
    const history=engine.normalize(state).grades[gradeId]||{recent:[],seen:{}};
    let available=rows,windowSize=Math.min(engine.RECENT_PAPERS||3,history.recent.length);
    for(;windowSize>=0;windowSize--){
      const recent=new Set(history.recent.slice(0,windowSize).flat());
      available=rows.filter(row=>!recent.has(row.id));
      if(available.length>=target)break;
    }
    if(!target)return {items:[],identities:[],recentWindow:windowSize,topicCounts:{}};

    const groups=new Map();
    for(const row of available){if(!groups.has(row.topic))groups.set(row.topic,[]);groups.get(row.topic).push(row)}
    const allocation=[...groups].map(([topic,list])=>{
      const raw=target*list.length/Math.max(1,available.length),base=Math.min(list.length,Math.floor(raw));
      return {topic,list,quota:base,fraction:raw-base};
    });
    let rest=target-allocation.reduce((s,x)=>s+x.quota,0);
    const remainderOrder=allocation.slice().sort((a,b)=>b.fraction-a.fraction||b.list.length-a.list.length||String(a.topic).localeCompare(String(b.topic)));
    while(rest>0){
      let added=false;
      for(const row of remainderOrder){
        if(rest<=0)break;
        if(row.quota>=row.list.length)continue;
        row.quota++;rest--;added=true;
      }
      if(!added)break;
    }

    const picked=[],pickedIds=new Set(),topicCounts={};
    for(const row of allocation){
      const ordered=ppEvaluationShuffle(row.list,random).sort((a,b)=>(history.seen[a.id]?.[0]||0)-(history.seen[b.id]?.[0]||0));
      for(const chosen of ordered.slice(0,row.quota)){
        picked.push(chosen);pickedIds.add(chosen.id);topicCounts[row.topic]=(topicCounts[row.topic]||0)+1;
      }
    }
    if(picked.length<target){
      const leftovers=ppEvaluationShuffle(available.filter(row=>!pickedIds.has(row.id)),random)
        .sort((a,b)=>(history.seen[a.id]?.[0]||0)-(history.seen[b.id]?.[0]||0));
      for(const chosen of leftovers){
        if(picked.length>=target)break;
        picked.push(chosen);pickedIds.add(chosen.id);topicCounts[chosen.topic]=(topicCounts[chosen.topic]||0)+1;
      }
    }
    return {items:picked.map(row=>row.item),identities:picked.map(row=>row.id),recentWindow:windowSize,topicCounts};
  }

  window.startNavigatorEvaluationMock=async function(gradeId){
    if(!PLAN_GRADES.includes(gradeId)||window.__mdEvaluationMockCreating)return;
    window.__mdEvaluationMockCreating=true;
    const engine=window.__mdBalancedMock,plan=ppLoadPlan();
    renderPastLoading(`${GRADE_LABELS[gradeId]} 평가용 모의고사를 구성하는 중입니다`);
    try{
      await ppBuildPools(plan);
      const data=n3aData(gradeId),subjects=ppSelectedSubjects(plan,gradeId,data);
      if(!subjects.length)throw new Error('응시 과목을 1개 이상 선택하세요.');
      const identity=item=>PP_HOMEWORK_DUPLICATE_CLUSTER[item.key]||item.key;
      let raw=null;try{raw=JSON.parse(localStorage.getItem(PP_EVALUATION_EXPOSURE_KEY)||'null')}catch(e){}
      let exposure=engine.normalize(raw),selected=[],identities=[],fingerprints=new Set();
      for(const subject of subjects){
        const candidates=(planPools[gradeId]||[]).filter(item=>item.subject===subject).map(item=>{
          const q=ppFindQuestion(gradeId,item);
          return q&&mdQuestionUsable(q)?{...item,choices:q['선택지']}:null;
        }).filter(item=>item&&!fingerprints.has(ppPredictiveQuestionFingerprint(item)));
        const draw=ppEvaluationSelect(candidates,{gradeId,data,state:exposure,identity,count:PAST_MOCK_PER_SUBJECT});
        if(draw.items.length!==PAST_MOCK_PER_SUBJECT)throw new Error(`${subject}의 평가용 서로 다른 문항이 ${PAST_MOCK_PER_SUBJECT}개보다 적습니다.`);
        for(const item of draw.items){selected.push(item);fingerprints.add(ppPredictiveQuestionFingerprint(item))}
        identities.push(...draw.identities);
      }
      const questions=await ppHydrateKeys(selected.map(item=>item.key));
      if(questions.length!==selected.length||questions.some(q=>!mdQuestionUsable(q)))throw new Error('일부 평가용 기출 원문을 확인할 수 없습니다.');
      const itemMap=new Map(selected.map(item=>[item.key,item]));
      const queue=orderNavigatorMockQuestions(shuffle(questions.map(q=>({...q,_predictiveMock:true,_evaluationMock:true,
        _predictiveConcept:engine.topic(itemMap.get(q._planKey),data)}))),gradeId);
      const nextExposure=engine.record(exposure,gradeId,identities);
      safeStorageSet(PP_EVALUATION_EXPOSURE_KEY,JSON.stringify(nextExposure),'평가용 모의 출제 이력');
      clearPastProgress();
      pastSubjectId=gradeId;pastBaseShort=gradeId;pastYear=null;pastSession=null;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock';
      pastQueue=queue;pastIdx=0;pastAnswers=new Array(queue.length).fill(null);pastMode='mock';pastStartedAt=Date.now();currentMode='past';
      renderPastCard();
    }catch(e){
      app.innerHTML=`<div class="card" style="margin-top:30px"><b>평가용 모의고사를 시작하지 못했습니다.</b><div style="font-size:12px;margin-top:7px">${escapeHtml(e.message||String(e))}</div><button class="btn btn-outline" style="margin-top:12px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">합격 플랜으로 돌아가기</button></div>`;
    }finally{window.__mdEvaluationMockCreating=false}
  };

"""
    text = text.replace(anchor, evaluation + anchor, 1)

if "평가용 모의고사 · 실력 측정" not in text:
    needle = 'onclick="startNavigatorPredictiveMock(\'${g}\')">실전예측 모의 · 가중 랜덤</button>'
    pos = text.find(needle)
    if pos < 0:
        raise SystemExit("predictive mock button anchor not found")
    line_start = text.rfind("        ${cfg.enabled&&cfg.examDate?`<button", 0, pos)
    if line_start < 0:
        raise SystemExit("predictive mock template start not found")
    eval_ui = """        ${cfg.enabled&&cfg.examDate?`<button class="btn btn-outline" style="width:100%;margin-top:9px;border-color:#475569;color:#334155" onclick="startNavigatorEvaluationMock('${g}')">평가용 모의고사 · 실력 측정</button><div style="font-size:10px;color:var(--textDim);line-height:1.5;margin-top:5px">개인 취약도·학습진도 미반영 · 과목당 25문항 · 최근 3회 문항 중복 억제 · 점수 측정용</div>`:''}
"""
    text = text[:line_start] + eval_ui + text[line_start:]

if "evaluation:pastQueue.every(q=>q._evaluationMock===true)" not in text:
    old = "const meta={version:1,id:pastProgressId,balanced:pastQueue.every(q=>q._balancedMock===true),refs,"
    new = "const meta={version:1,id:pastProgressId,balanced:pastQueue.every(q=>q._balancedMock===true),evaluation:pastQueue.every(q=>q._evaluationMock===true),refs,"
    if old not in text:
        raise SystemExit("mock resume metadata anchor not found")
    text = text.replace(old, new, 1)

if "if(meta.evaluation)restored.forEach(q=>{q._evaluationMock=true;q._predictiveMock=true});" not in text:
    old = "    if(meta.balanced)restored.forEach(q=>{q._balancedMock=true});"
    new = old + "\n    if(meta.evaluation)restored.forEach(q=>{q._evaluationMock=true;q._predictiveMock=true});"
    if old not in text:
        raise SystemExit("mock restore metadata anchor not found")
    text = text.replace(old, new, 1)

text = text.replace(
    "${q._balancedMock?'실전 ':q._predictiveMock?'실전예측 ':pastMode==='mock'?'모의 ':''}",
    "${q._evaluationMock?'평가 ':q._balancedMock?'실전 ':q._predictiveMock?'실전예측 ':pastMode==='mock'?'모의 ':''}",
    1,
)
if "const isEvaluationMock = pastQueue.some(q=>q&&q._evaluationMock);" not in text:
    old = "  const isBalancedMock = pastQueue.some(q=>q&&q._balancedMock);"
    new = old + "\n  const isEvaluationMock = pastQueue.some(q=>q&&q._evaluationMock);"
    if old not in text:
        raise SystemExit("balanced result-state anchor not found")
    text = text.replace(old, new, 1)

text = text.replace(
    "${isBalancedMock?'실전 모의고사 결과':isPredictiveMock?'실전예측 모의 결과':",
    "${isEvaluationMock?'평가용 모의고사 결과':isBalancedMock?'실전 모의고사 결과':isPredictiveMock?'실전예측 모의 결과':",
    1,
)
text = text.replace(
    """onclick="${isBalancedMock?'startNavigatorPassPlanMock':'startNavigatorPredictiveMock'}('${predictiveGrade}')">${isBalancedMock?'새 실전 모의':'새 예측 모의'}</button>""",
    """onclick="${isEvaluationMock?'startNavigatorEvaluationMock':isBalancedMock?'startNavigatorPassPlanMock':'startNavigatorPredictiveMock'}('${predictiveGrade}')">${isEvaluationMock?'새 평가 모의':isBalancedMock?'새 실전 모의':'새 예측 모의'}</button>""",
    1,
)

required = [
    "mock-unanswered-neutral-v1",
    "q._evaluationMock||!q._planKey",
    "coverage-balanced-v2",
    "const PP_SUBJECT_BALANCE_POLICY='coverage-even-v2'",
    "assignmentPolicy:'knowledge-gap-priority-v6-coverage-balanced'",
    "coverageProtected:balancedNewCount>=requiredNew",
    "spaced-recheck-tail-v2",
    "const minimumGap=15;",
    "rec.dueDate=ppAddDays(today,1);rec.lateSessionNextDayRecheck=true",
    "evaluation-mock-v1",
    "window.startNavigatorEvaluationMock=async function(gradeId)",
    "평가용 모의고사 · 실력 측정",
    "evaluation:pastQueue.every(q=>q._evaluationMock===true)",
    "const isEvaluationMock = pastQueue.some(q=>q&&q._evaluationMock);",
    "평가용 모의고사 결과",
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"missing readiness final marker: {needle}")

if text != original:
    p.write_text(text, encoding="utf-8")
    print("exam readiness algorithms v5.18 applied")
else:
    print("exam readiness algorithms already current")
