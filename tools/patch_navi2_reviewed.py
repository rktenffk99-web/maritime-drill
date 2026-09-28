"""Keep the approved navi2 review after legacy data/audit generators."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
text = path.read_text(encoding='utf-8-sig')
original = text
source = (root / 'navi2-reviewed-content.js').read_text(encoding='utf-8')
name = 'navi2-reviewed-content.js'

# Remove the fishing set from the stored bundles, including its supporting
# content. Keep all surviving IDs stable so existing learning history still fits.
fishing_id = r'(?:3[1-9]|4[0-5])'


def rewrite_bundle(bundle_name, transform):
    global text
    pattern = r'(<script data-bundled-src="' + re.escape(bundle_name) + r'">)(.*?)(</script>)'
    text, count = re.subn(
        pattern, lambda m: m[1] + transform(m[2]) + m[3], text, flags=re.S,
    )
    if count != 1:
        raise SystemExit('Expected exactly one bundle: ' + bundle_name)


def remove_fishing_data(body):
    body = re.sub(r'\n \{\n  "id": ' + fishing_id + r',\n.*?\n \},', '', body, flags=re.S)
    body = re.sub(r'\n  ' + fishing_id + r': \{\n.*?\n  \},', '', body, flags=re.S)
    body = re.sub(r'\n  ' + fishing_id + r': "[^\n]*",', '', body)
    body = re.sub(r'"' + fishing_id + r'": 3, ', '', body)
    body = body.replace('90문제 · 면접 기출', '75문제 · 면접 기출')
    body = body.replace('90/90 questions', '75 official questions; fishing removed')
    payload = body.split('const QUESTIONS = ', 1)[1]
    questions, _ = json.JSONDecoder().raw_decode(payload)
    expected = list(range(1, 31)) + list(range(46, 91))
    if [q['id'] for q in questions] != expected or any(q['category'] == '어선전문' for q in questions):
        raise SystemExit('navi2 base must contain exactly 75 non-fishing questions with stable IDs')
    return body


def remove_fishing_concepts(body):
    return re.sub(r'\n' + fishing_id + r': \{\n.*?\n\},', '', body, flags=re.S)


def remove_fishing_audit(body):
    start, end = body.index('    navi2: {'), body.index('    navi3: {')
    section = body[start:end].replace('total: 90,', 'total: 75,')
    section = section.replace('[31,45,"2급 항해사(어선전문).pdf"], ', '')
    section = re.sub(
        r'(reviewed: \[)([\d,]+)(\])',
        lambda m: m[1] + ','.join(n for n in m[2].split(',') if not 31 <= int(n) <= 45) + m[3],
        section,
    )
    return body[:start] + section + body[end:]


rewrite_bundle('data-navi2.js', remove_fishing_data)
rewrite_bundle('concepts-navi2.js', remove_fishing_concepts)
rewrite_bundle('audit-navi.js', remove_fishing_audit)

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
print('navi2 approved review applied: 96 questions, 15 fishing removed, 9 pending')
