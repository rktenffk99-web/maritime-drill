from pathlib import Path
src=Path('convenience-controls.js').read_text(encoding='utf-8')
required=[
    'function questionChoiceButtons(root)',
    'function inQuestionSession()',
    "실전예측|모의|문제",
    'function findQuestionCounter(root)',
    'function addReportButton()',
    'inQuestionSession()',
    'questionChoiceButtons(root)',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing problem-report all-modes marker: {needle}')
if "chooseNavigatorPassPlanAnswer" not in src:
    raise SystemExit('pass-plan answer handler support disappeared')
print('problem report all-mode checks: PASS')
