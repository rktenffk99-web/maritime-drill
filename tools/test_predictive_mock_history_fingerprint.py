from pathlib import Path
import re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')
required=[
    'predictive-history-fingerprint-v1',
    "const PREDICTIVE_FP_HISTORY_KEY='md_predictive_mock_fingerprint_history_v1'",
    "item.question||item['문제']",
    'function ppLoadPredictiveFingerprintHistory(gradeId)',
    'function ppSavePredictiveFingerprintHistory(gradeId,rows)',
    'function ppPredictiveRecentLevel(item,keyHistory)',
    'const recentLevel=ppPredictiveRecentLevel(item,history);',
    'if(recentLevel===0)weight*=0.45;',
    'else if(recentLevel===1)weight*=0.75;',
    'ppSavePredictiveFingerprintHistory(gradeId,rows);',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing fingerprint-history marker: {needle}')

# The old key-only history comparison must no longer be the active weighting rule.
if "if(history[0]&&history[0].includes(item.key))weight*=0.45;" in src:
    raise SystemExit('old key-only recent-history weighting is still active')

start=src.index('window.startNavigatorPredictiveMock=async function(gradeId)')
commit=src.index('window.commitNavigatorPredictiveMockResult=function(queue,answers)',start)
if 'ppSavePredictiveFingerprintHistory(' in src[start:commit]:
    raise SystemExit('fingerprint history is saved before mock completion')

end=src.index('window.startNavigatorPassPlanMock=async function(gradeId)',commit)
body=src[commit:end]
complete_pos=body.find('const complete=')
fp_save_pos=body.find('ppSavePredictiveFingerprintHistory(gradeId,rows);')
key_save_pos=body.find('ppSavePredictiveHistory(gradeId,keys);')
if complete_pos<0 or key_save_pos<complete_pos or fp_save_pos<key_save_pos:
    raise SystemExit('completed-mock fingerprint history save guard/order is invalid')

# Syntax-check the entire predictive block after all predictive patches are applied.
block_start=src.index("const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v2'")
block_end=src.index('window.startNavigatorPassPlanMock=async function(gradeId)',block_start)
block=src[block_start:block_end]
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(block)
    js_path=f.name
proc=subprocess.run(['node','--check',js_path],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('predictive fingerprint-history JS syntax failed:\n'+proc.stderr)

print('predictive mock fingerprint-history checks: PASS')
