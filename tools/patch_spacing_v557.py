"""Apply word-spacing fixes to 2·3급 항해사 past-exam bundles (v5.57). Safe to rerun.

tools/spacing_fixes_v557.json lists [old, new] pairs per question (stem and choices),
built from the official booklets by tools/build_spacing_fixes_v557.py. A pair is
applied only when the current text is exactly `old`, and `new` differs from `old`
only by inserted spaces, so content and answers cannot change.
"""
import base64, gzip, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
FIXES = json.loads((ROOT / 'tools' / 'spacing_fixes_v557.json').read_text(encoding='utf-8'))
BUNDLE_RE = re.compile(r'(<script type="application/gzip" id="md-bundle-past-(20\d\d-navi[23]e?-\d)_js">)(.*?)(</script>)', re.S)
PAYLOAD_RE = re.compile(r'(const PAYLOAD = )(\{.*?\n\})(;\n)', re.S)


def inflate(b64):
    return gzip.decompress(base64.b64decode(b64.strip())).decode('utf-8')


def deflate(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), mtime=0)).decode('ascii')


def only_spaces(old, new):
    return re.sub(r'\s+', '', old) == re.sub(r'\s+', '', new) and len(new) >= len(old)


by_exam = {}
for f in FIXES:
    by_exam.setdefault(f['exam'], {})[(f['subject'], f['number'])] = f
stats = {'applied': 0, 'already': 0, 'stale': 0}


def fix(pair, current):
    old, new = pair
    if not only_spaces(old, new):
        raise SystemExit(f'spacing fix changes text: {old!r} -> {new!r}')
    if current == new:
        stats['already'] += 1
        return current
    if current != old:
        stats['stale'] += 1
        return current
    stats['applied'] += 1
    return new


def repl(m):
    exam = m.group(2)
    fixes = by_exam.get(exam)
    if not fixes:
        return m.group(0)
    text = inflate(m.group(3))
    pm = PAYLOAD_RE.search(text)
    if not pm:
        return m.group(0)
    payload = json.loads(pm.group(2))
    before = stats['applied']
    for q in payload['questions']:
        f = fixes.get((q.get('과목'), q.get('번호')))
        if not f:
            continue
        if '문제' in f:
            q['문제'] = fix(f['문제'], q.get('문제'))
        for i, pair in enumerate(f.get('선택지') or []):
            if pair and i < len(q.get('선택지') or []):
                q['선택지'][i] = fix(pair, q['선택지'][i])
    if stats['applied'] == before:
        return m.group(0)
    text = text[:pm.start(2)] + json.dumps(payload, ensure_ascii=False, indent=2) + text[pm.end(2):]
    return m.group(1) + deflate(text) + m.group(4)


source = INDEX.read_text(encoding='utf-8-sig')
INDEX.write_text(BUNDLE_RE.sub(repl, source), encoding='utf-8')
print('spacing fixes v557', json.dumps(stats))
