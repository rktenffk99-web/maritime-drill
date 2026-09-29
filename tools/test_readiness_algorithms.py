from pathlib import Path
import re

html=Path('index.html').read_text(encoding='utf-8-sig')
analytics=Path('predictive-analytics.js').read_text(encoding='utf-8')

# 1) Unanswered mock items must not become adaptive wrong answers.
m=re.search(r"window\.commitNavigatorPredictiveMockResult=function\(queue,answers\)\{(.*?)\n  \};",html,re.S)
assert m,'predictive result commit function missing'
body=m.group(1)
for needle in [
    'mock-unanswered-neutral-v1',
    "q._evaluationMock||!q._planKey",
    "const answer=answers&&answers[i];",
    "if(answer===null||answer===undefined)return;",
    "if(answer===q['정답'])",
]:
    assert needle in body,f'missing unanswered/evaluation guard: {needle}'
assert body.index("if(answer===null||answer===undefined)return;") < body.index("const r=ppProgressFor"), 'unanswered is touching progress before being skipped'
assert "if(!q._evaluationMock&&pastAnswers[i] === q['정답']) removePastWrong" in html

# 2) Subject equalization cannot erase deadline-required unseen work.
b=re.search(r"function ppBalanceSingleGradeSubjects\(plan,pools,progress,today,assignment\)\{(.*?)\n  \}(?=\n  const ppBuildTodayAssignmentBeforeSubjectBalance)",html,re.S)
assert b,'coverage-balanced subject function missing'
bb=b.group(1)
for needle in [
    'coverage-balanced-v2',
    'const requiredNew=',
    'if(selectedKeys.size>=requiredNew)break;',
    'if(item&&!ppHomeworkClusterSeen(item,progress))add(item);',
    'if(selectedKeys.size<requiredNew)',
    'coverageProtected:balancedNewCount>=requiredNew',
    'requiredNewReserved:',
    'subjectBalanceRelaxedForCoverage',
]:
    assert needle in bb,f'missing coverage-balance marker: {needle}'
assert bb.index('for(const key of originalKeys)') < bb.index('while(selectedKeys.size<target)'), 'balancing starts before required-new reservation'
assert "const PP_SUBJECT_BALANCE_POLICY='coverage-even-v2'" in html
assert "assignmentPolicy:'knowledge-gap-priority-v6-coverage-balanced'" in html
assert "cp.subjectBalancePolicy!=='coverage-even-v2'" in html

# 3) Same-day recheck gets a real spacing floor; tail questions move to next-day recall.
r=re.search(r"function ppScheduleSameDayRecheck\(q\)\{(.*?)\n  \}",html,re.S)
assert r,'same-day recheck function missing'
rb=r.group(1)
for needle in [
    'spaced-recheck-tail-v2',
    'const minimumGap=15;',
    'const remainingBase=',
    'if(remainingBase<minimumGap)',
    'rec.sameDayConfirmedDate=today;',
    'rec.dueDate=ppAddDays(today,1);rec.lateSessionNextDayRecheck=true;',
    'const delay=30+Math.floor(Math.random()*21);',
    'const desiredGap=Math.max(minimumGap,Math.min(delay,remainingBase));',
]:
    assert needle in rb,f'missing recheck spacing marker: {needle}'
assert rb.index('if(remainingBase<minimumGap)') < rb.index('const delay=30+Math.floor(Math.random()*21);')

# 4) Evaluation mock is non-personalized and survives resume.
for needle in [
    "evaluation-mock-v1",
    "const PP_EVALUATION_EXPOSURE_KEY='md_evaluation_mock_exposure_v1'",
    'function ppEvaluationSelect(items,options)',
    'window.startNavigatorEvaluationMock=async function(gradeId)',
    "평가용 모의고사 · 실력 측정",
    '개인 취약도·학습진도 미반영',
    'evaluation:pastQueue.every(q=>q._evaluationMock===true)',
    'if(meta.evaluation)restored.forEach(q=>{q._evaluationMock=true;q._predictiveMock=true});',
    'const isEvaluationMock = pastQueue.some(q=>q&&q._evaluationMock);',
    '평가용 모의고사 결과',
    "'새 평가 모의'",
]:
    assert needle in html,f'missing evaluation mock marker: {needle}'

# Evaluation selection must not inspect adaptive progress/weak-topic weights.
e=re.search(r"function ppEvaluationSelect\(items,options\)\{(.*?)\n  \}\n\n  window\.startNavigatorEvaluationMock",html,re.S)
assert e,'evaluation selector missing'
eb=e.group(1)
for forbidden in ['ppLoadProgress','ppWeakTopicBoost','ppPredictiveWeight','lastOutcome','mastered']:
    assert forbidden not in eb,f'evaluation selector is personalized by {forbidden}'

# Evaluation results may display analysis, but must not train the persistent weak profile.
assert "q&&(q._predictiveReview||q._evaluationMock)" in analytics

# Version bump makes clients refresh the changed runtime.
assert "const APP_VERSION = '5.18';" in html
assert '<title>Maritime Drill v5.18 · Android</title>' in html

print('exam-readiness algorithm checks: PASS')
