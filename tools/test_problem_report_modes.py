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
    "const RESOLVED_REPORTS_CUTOFF='2026-09-17T03:17:00.000Z'",
    'function clearReports()',
    'window.clearMaritimeProblemReports=clearReports',
    '2026-09-17 검수 완료 이전 신고는 자동 정리',
    'id="md-report-clear"',
    "function saveReport(reason,detail='')",
    "reason==='직접 입력'&&!note",
    '직접 입력(주관식)',
    'id="md-report-detail"',
    'maxlength="500"',
    "saveReport('직접 입력',detail.value)",
    '신고내용: ${detail}',
    '<b>신고 내용</b>',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing problem-report marker: {needle}')
if 'chooseNavigatorPassPlanAnswer' not in src:
    raise SystemExit('pass-plan answer handler support disappeared')
if "localStorage.removeItem(REPORTS_KEY)" not in src:
    raise SystemExit('report cleanup does not remove resolved report storage')
proc=subprocess.run(['node','--check','convenience-controls.js'],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('convenience-controls.js syntax failed:\n'+proc.stderr)
print('problem report all-mode + cleanup + free-text checks: PASS')
