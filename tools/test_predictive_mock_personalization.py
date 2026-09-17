from pathlib import Path
import re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')
required=[
    "const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v2'",
    "const PREDICTIVE_HISTORY_LEGACY_KEY='md_predictive_mock_history_v1'",
    'predictive-personalization-v2',
    'function ppLoadPredictiveHistory(gradeId)',
    'function ppSavePredictiveHistory(gradeId,keys)',
    'function ppPredictivePersonalMultiplier(item,progress)',
    'function ppPredictiveWeight(item,history,progress)',
    'function ppPredictiveSample(items,data,count,history,progress)',
    'history=ppLoadPredictiveHistory(gradeId),progress=ppLoadProgress()',
    'ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress)',
    "if(rec.status==='weak'||rec.lastOutcome==='wrong')mult*=1.20;",
    'Math.min(0.15,wrong*0.03)',
    'if(rec.mastered)mult*=0.90;',
    'Math.max(0.85,Math.min(1.45,mult))',
    'const complete=rows.length>0&&Array.isArray(answers)&&answers.length>=rows.length&&rows.every',
    'ppSavePredictiveHistory(gradeId,keys);',
    '최근 5개년 출제경향 + 파트별 취약도 자동가중 · 급수별 최근 완료 모의 중복 억제',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing predictive personalization marker: {needle}')

# Starting a mock must not mark the generated paper as recently seen.
start=src.index('window.startNavigatorPredictiveMock=async function(gradeId)')
end=src.index('window.commitNavigatorPredictiveMockResult=function(queue,answers)',start)
start_body=src[start:end]
if 'ppSavePredictiveHistory(' in start_body:
    raise SystemExit('predictive history is still saved before mock completion')

# Result commit must save history only after the completion guard.
commit_start=end
commit_end=src.index('window.startNavigatorPassPlanMock=async function(gradeId)',commit_start)
commit_body=src[commit_start:commit_end]
if commit_body.find('const complete=')<0 or commit_body.find('ppSavePredictiveHistory(gradeId,keys);')<commit_body.find('const complete='):
    raise SystemExit('completed-mock history save guard is missing or ordered incorrectly')

# History must be scoped by grade and legacy data should be partitioned by grade prefix.
for needle in ["key.startsWith(`${g}|`)", 'store[gradeId]', "key.startsWith(`${gradeId}|`)"]:
    if needle not in src:
        raise SystemExit(f'grade-scoped predictive history missing: {needle}')

# Ensure the personalized predictive block remains valid JavaScript.
block_start=src.index("const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v2'")
block_end=src.index('window.startNavigatorPassPlanMock=async function(gradeId)',block_start)
block=src[block_start:block_end]
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(block)
    js_path=f.name
proc=subprocess.run(['node','--check',js_path],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('personalized predictive mock JS syntax failed:\n'+proc.stderr)

print('predictive mock personalization checks: PASS')
