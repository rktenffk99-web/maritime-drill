from pathlib import Path
import subprocess

js=Path('predictive-analytics.js').read_text(encoding='utf-8')
html=Path('index.html').read_text(encoding='utf-8-sig')

for needle in [
    "md_weak_topic_profile_v1",
    "취약 파트 분석",
    "다음 학습 보강 비율",
    "function topicOf(q)",
    "function reinforcement(rows)",
    "실전예측 모의 결과",
]:
    assert needle in js, f'missing analytics marker: {needle}'

for needle in [
    "weak-topic-adaptive-v1",
    "function ppWeakTopicId(item)",
    "function ppLoadWeakTopicProfile(gradeId)",
    "function ppWeakTopicBoost(item,profile)",
    "ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)",
    "mult*=ppWeakTopicBoost(item)",
]:
    assert needle in html, f'missing adaptive weak-topic marker: {needle}'

loader=Path('keyboard-controls.js').read_text(encoding='utf-8')
assert "mdLoadAuxScript('predictive-analytics.js')" in loader

proc=subprocess.run(['node','--check','predictive-analytics.js'],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('predictive-analytics.js syntax failed:\n'+proc.stderr)

print('weak topic analytics + adaptive weighting checks: PASS')
