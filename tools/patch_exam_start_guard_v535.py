"""Install the shared paper-start guard after every entry point is defined."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
text = path.read_text(encoding='utf-8-sig')
version = re.search(r"const APP_VERSION = '([^']+)'", text).group(1)
text = re.sub(r'<script src="exam-start-guard\.js\?v=[^"]+"></script>\n?', '', text)
text = text.replace('</body>', f'<script src="exam-start-guard.js?v={version}"></script>\n</body>', 1)
path.write_text(text, encoding='utf-8')
print('paper loading, navigation and sync guard integrated')
