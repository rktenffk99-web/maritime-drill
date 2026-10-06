"""Embed reported-content-fixes.js into the single-file app.

The deployed index.html is a self-contained build, so changing the standalone JS
file alone does not affect production. This patch keeps one embedded copy near
the end of <body> so it runs after the app/data loaders are defined.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
source_path = root / "reported-content-fixes.js"

text = index_path.read_text(encoding="utf-8-sig")
original = text
source = source_path.read_text(encoding="utf-8")

# Idempotently remove any earlier embedded copy.
text = re.sub(
    r'\n?<script data-bundled-src="reported-content-fixes\.js">.*?</script>\s*',
    '\n',
    text,
    flags=re.S,
)

anchor = text.rfind("</body>")
if anchor < 0:
    raise SystemExit("reported-content-fixes insertion failed: </body> missing")

bundle = (
    '\n<script data-bundled-src="reported-content-fixes.js">\n'
    + source
    + "\n</script>\n"
)
text = text[:anchor] + bundle + text[anchor:]

if text.count('data-bundled-src="reported-content-fixes.js"') != 1:
    raise SystemExit("reported-content-fixes.js must be embedded exactly once")

if text != original:
    index_path.write_text(text, encoding="utf-8")
    print("reported-content-fixes embedded in final index")
else:
    print("reported-content-fixes already embedded")
