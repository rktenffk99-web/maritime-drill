"""Keep the approved navi2 review after legacy data/audit generators."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
text = path.read_text(encoding='utf-8-sig')
original = text
source = (root / 'navi2-reviewed-content.js').read_text(encoding='utf-8')
name = 'navi2-reviewed-content.js'

text = re.sub(
    r'\n?<script data-bundled-src="navi2-reviewed-content\.js">.*?</script>',
    '', text, flags=re.S,
)
anchor = re.search(r'<script data-bundled-src="audit-navi\.js">.*?</script>', text, re.S)
if not anchor:
    raise SystemExit('navi2 review insertion failed: audit-navi.js is missing')
bundle = '\n<script data-bundled-src="' + name + '">\n' + source + '</script>'
text = text[:anchor.end()] + bundle + text[anchor.end():]
if text.count('data-bundled-src="' + name + '"') != 1:
    raise SystemExit('navi2 review must be bundled exactly once')
if text != original:
    path.write_text(text, encoding='utf-8')
print('navi2 approved review applied: 96 reviewed, 15 fishing excluded, 9 pending')
