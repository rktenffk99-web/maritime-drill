"""Apply the reviewed mock-recovery change to the generated single-file app."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
if "const PAST_CHECKPOINT_KEY='md_past_checkpoint_v2';" not in html:
    subprocess.run(['git', 'apply', str(ROOT / 'tools/mock_recovery_v524.patch')], cwd=ROOT, check=True)
elif '// mock-recovery-usability-v524' not in html:
    subprocess.run(['git', 'apply', str(ROOT / 'tools/mock_recovery_usability_v524.patch')], cwd=ROOT, check=True)
print('mock-recovery v5.24 integration ready')
