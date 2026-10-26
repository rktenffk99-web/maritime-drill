"""Compatibility entry point for the v5.30 multi-exam recovery regression."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('browser_exam_sessions_v530.py')), run_name='__main__')
