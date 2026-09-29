from pathlib import Path
import subprocess

root=Path(__file__).resolve().parent.parent
js=(root/'study-algorithm-fixes.js').read_text(encoding='utf-8')
loader=(root/'keyboard-controls.js').read_text(encoding='utf-8')
analytics=(root/'predictive-analytics.js').read_text(encoding='utf-8')

for needle in [
    "mandatoryNew:'preserve-before-subject-balance'",
    "sameDayRecheck:'minimum-20-base-question-gap-or-final-review'",
    "mockUnanswered:'score-only-no-learning-state'",
    "evaluation:'neutral-topic-stratified-no-personal-adaptation'",
    "if(remainingBase<20)return false;",
    "if(answer===null||answer===undefined)return;",
    "rows.some(q=>q&&q._evaluationMock)",
    "window.startNavigatorEvaluationMock=async function(gradeId)",
    "평가용 모의고사 · 실력 측정",
    "최근 ${recent.length}회 평균",
]:
    assert needle in js, f'missing study algorithm marker: {needle}'

assert "mdLoadAuxScript('study-algorithm-fixes.js')" in loader, 'final study algorithm script is not loaded'

for needle in [
    "const weak=rows.filter(r=>(Number(r.wrong)||0)>0)",
    "Unanswered questions affect mock score only",
    "무응답은 점수에만 반영됩니다.",
]:
    assert needle in analytics, f'missing answered-only analytics marker: {needle}'

proc=subprocess.run(['node','--check',str(root/'study-algorithm-fixes.js')],capture_output=True,text=True)
assert proc.returncode==0,proc.stderr
proc=subprocess.run(['node','--check',str(root/'predictive-analytics.js')],capture_output=True,text=True)
assert proc.returncode==0,proc.stderr

print('study algorithm corrections: PASS')
