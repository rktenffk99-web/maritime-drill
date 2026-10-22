"""Apply reviewed v5.22 fixes after the legacy generators, then version the artifact."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    for name in (
        'patch_data_identity_v522.py',
        'patch_scheduler_v522.py',
        'patch_mock_sampling_v522.py',
        'patch_mastery_sessions_v522.py',
        'patch_metrics_v522.py',
        'patch_drive_recovery_v522.py',
    ):
        subprocess.run([sys.executable, str(ROOT / 'tools' / name)], cwd=ROOT, check=True)
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8-sig')
    text = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.22';", text, count=1)
    text = re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>', '<title>Maritime Drill v5.22 · Android</title>', text, count=1)
    text = re.sub(r'<script src="([^"?]+\.js)(?:\?v=[^"]*)?"></script>', lambda m: f'<script src="{m[1]}?v=5.22"></script>', text)
    path.write_text(text, encoding='utf-8')
    print('learning-system v5.22 final artifact ready')


if __name__ == '__main__':
    main()
