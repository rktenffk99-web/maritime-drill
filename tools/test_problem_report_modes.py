from pathlib import Path
import subprocess

src=Path('convenience-controls.js').read_text(encoding='utf-8')
required=[
    'function questionChoiceButtons(root)',
    'function inQuestionSession()',
    '실전예측|모의|문제',
    'function findQuestionCounter(root)',
    'function addReportButton()',
    'inQuestionSession()',
    'questionChoiceButtons(root)',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing problem-report all-modes marker: {needle}')
if 'chooseNavigatorPassPlanAnswer' not in src:
    raise SystemExit('pass-plan answer handler support disappeared')
proc=subprocess.run(['node','--check','convenience-controls.js'],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('convenience-controls.js syntax failed:\n'+proc.stderr)
print('problem report all-mode checks: PASS')
