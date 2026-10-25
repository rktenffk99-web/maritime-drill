"""Apply the reviewed v5.25 unified mock change to the generated app."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
if '// unified-mock-v525:' not in html:
    subprocess.run(['git', 'apply', str(ROOT / 'tools/unified_mock_v525.patch')], cwd=ROOT, check=True)
print('unified mock v5.25 integration ready')
