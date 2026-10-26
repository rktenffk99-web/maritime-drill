from pathlib import Path
import subprocess

js=Path('predictive-analytics.js').read_text(encoding='utf-8')
html=Path('index.html').read_text(encoding='utf-8-sig')

for needle in [
    "md_weak_topic_profile_v1",
    "취약 파트 분석",
    "다음 학습 취약 가중치 · 최근 학습 반영",
    "취약 가중치 ${(Number(r.boostMultiplier)||1).toFixed(2)}배",
    "실제 배정 비율을 뜻하지 않습니다.",
    "function getProfileForGrade(gradeId)",
    "function recentHomeworkEvidence(gradeId)",
    "getEvidenceRevision",
    "const EVIDENCE_HALF_LIFE_DAYS=30;",
    "const MIN_FULL_EVIDENCE=3;",
    "function evaluationSignature(queue)",
    "const signature=evaluationSignature(rows),historyKey=`${grade}|${signature}`;",
    "function topicOf(q)",
    "function reinforcement(rows)",
    "실전예측 모의 결과",
    "md_evaluation_score_history_v1",
    "function evaluationSummary(queue,answers,persist=true)",
    "동일 과목 구성 최근 ${evaluation.recentCount}회 평균",
    "미완료라 이번 기록 제외",
    "const weak=rows.filter(r=>(Number(r.wrong)||0)>0)",
    "무응답은 점수에는 반영되지만 취약도에는 반영하지 않습니다.",
]:
    assert needle in js, f'missing analytics marker: {needle}'

for needle in [
    "weak-topic-adaptive-v1",
    "function ppWeakTopicId(item)",
    "function ppLoadWeakTopicProfile(gradeId)",
    "function ppWeakTopicBoost(item,profile)",
    "boost:ppWeakTopicBoost(item,weakProfile)",
    "window.__mdSchedulerV522.build",
    "return window.__mdWeakTopicAnalytics.getProfileForGrade(gradeId)",
    "Number(row.boostMultiplier)",
    "mult*=ppWeakTopicBoost(item)",
]:
    assert needle in html, f'missing adaptive weak-topic marker: {needle}'

loader=Path('keyboard-controls.js').read_text(encoding='utf-8')
assert "mdLoadAuxScript('predictive-analytics.js')" in loader

proc=subprocess.run(['node','--check','predictive-analytics.js'],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('predictive-analytics.js syntax failed:\n'+proc.stderr)

print('weak topic analytics + recent homework evidence + confidence/decay + scoped evaluation score tracking checks: PASS')
