"""Behavior regression entrypoint for the unified v5.22 homework scheduler."""
from pathlib import Path
import subprocess

html=Path('index.html').read_text(encoding='utf-8-sig')
assert '// scheduler-v522-adapter:start' in html, 'run the final v5.22 scheduler patch first'
assert 'function ppBalanceSingleGradeSubjects' not in html, 'legacy balancing must not override the unified policy'
subprocess.run(['node','tools/test_scheduler_v522.js'],check=True)
