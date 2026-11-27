"""Restore word spacing lost when PDF line breaks were joined (v5.57).

Compares each 2·3급 항해사 question (stem and choices) with the official booklet
text (lems.seaman.or.kr 기출문제집 PDFs, 2020-2025) and inserts a space wherever the
booklet has one and our text has none. Only inserts spaces; never removes or
changes characters. Run locally with the booklets extracted under /tmp/booklets;
the result is committed as tools/spacing_fixes_v557.json and applied by
tools/patch_spacing_v557.py (CI does not need the booklets).
   python tools/build_spacing_fixes_v557.py [booklet_dir]
"""
import base64, gzip, json, re, sys, glob
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
BOOK = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/booklets')
BUNDLE_RE = re.compile(r'<script type="application/gzip" id="md-bundle-past-(20\d\d)-(navi[23])(e?)-(\d)_js">(.*?)</script>', re.S)
PAYLOAD_RE = re.compile(r'const PAYLOAD = (\{.*?\n\});\n', re.S)
FOOTER = re.compile(r'\s+(?:[1-9]|1[01])\s*-\s*(?:20\d{2}년)?\s*$')
MARK = re.compile(r'^\s*[㉮㉯㉰㉱㉴㉵]\s*')

CORPUS = []


def all_text():
    # Every booklet (all years, grades, 상선/어선), for line-end decisions.
    if not CORPUS_ALL:
        for f in sorted(glob.glob(str(BOOK / 'x*' / '*.pdf'))):
            CORPUS_ALL.append('\n'.join(p.get_text() for p in pymupdf.open(f)))
        CORPUS_ALL.append('')
    return '\n'.join(CORPUS_ALL)
CORPUS_ALL = []
_counts = {}


def count(s):
    if s not in _counts:
        _counts[s] = all_text().count(s)
    return _counts[s]


def wrap_is_space(left, right):
    """A bare line break inside the booklet: was it a word space?

    The PDFs wrap mostly at spaces but sometimes inside a word (\"…이\\n다.\").
    Decide from how the same join is written inside lines elsewhere in the
    booklets: \"L R\" more often than \"LR\" means a space. Back off to the last/first
    two characters, then one, when the full words never occur inline."""
    for n in (99, 2, 1):
        l, r = left[-n:], right[:n]
        spaced, joined = count(l + ' ' + r), count(l + r)
        if spaced or joined:
            return spaced > joined * 2
    return False


def joined_elsewhere(left, right):
    spaced, joined = count(left + ' ' + right), count(left + right)
    return joined > 0 and joined > spaced * 2


def booklet(year, grade, fishing):
    g = grade[-1]
    kind = '어선' if fishing else '상선'
    # One booklet per year, or one file per session (2020): join them all.
    files = sorted(glob.glob(str(BOOK / f'x{year}1{g}' / f'*{g}급*항해사({kind}).pdf')))
    if not files:
        return None
    text = '\n'.join(p.get_text() for f in files for p in pymupdf.open(f))
    CORPUS.append(text)
    # chars without whitespace + what preceded each: True space, None bare newline, False nothing
    chars, before = [], []
    # True: space inside a line; 'nl': space then line break; None: bare line break.
    pending = False
    for ch in text:
        if ch in ' \t\u00a0':
            if pending is False:
                pending = True
        elif ch == '\n':
            pending = 'nl' if pending in (True, 'nl') else None
        else:
            chars.append(ch); before.append(pending); pending = False
    return ''.join(chars), before

def respace(s, src, at, before):
    """Return s with spaces inserted where the booklet (src[at:]) has them."""
    out, i, k = [], 0, at
    ws = ''
    changed = False
    for pos, ch in enumerate(s):
        if ch.isspace():
            ws += ch; continue
        flag = before[k]
        prev = out[-1][-1] if out else ''
        # Never split a Latin/number run (e.g. "Offshore"): only Korean-side gaps.
        latin = bool(re.match(r'[A-Za-z0-9]', prev) and re.match(r'[A-Za-z0-9]', ch))
        # Booklet layout sometimes puts a gap before "?" or "." — not a word space.
        punct = ch in '?.,)!:;]\ue000' or prev in '(['
        if i > 0 and not ws and not latin and not punct:
            if flag in (None, 'nl') and re.match(r'[가-힣]', prev) and re.match(r'[가-힣]', ch):
                left = re.search(r'[가-힣]+$', ''.join(out)).group(0)
                right = re.match(r'[가-힣]+', s[pos:]).group(0)
                # A space before a line break is usually a real gap, but justified
                # lines also leave one inside words ("확인 \n하여야"): overrule it only
                # when the same words are clearly written joined elsewhere.
                flag = wrap_is_space(left, right) if flag is None else not joined_elsewhere(left, right)
            elif flag == 'nl':
                flag = True
            if flag is True:
                ws = ' '; changed = True
        out.append(ws + ch)
        ws = ''; i += 1; k += 1
    return ''.join(out) + ws, changed


ENDING = re.compile(r'(?:을|를|은|는|의|에|로|와|과|며|고|면|여)$')


def inserted_pairs(fixes):
    pairs = set()
    for e in fixes:
        for pr in [e.get('문제')] + (e.get('선택지') or []):
            if not pr:
                continue
            a, b = pr; i = j = 0
            while j < len(b):
                if i < len(a) and a[i] == b[j]:
                    i += 1; j += 1; continue
                if b[j] == ' ' and (i >= len(a) or not a[i].isspace()):
                    L = re.search(r'([가-힣]+)$', b[:j]); R = re.match(r'([가-힣]+)', b[j + 1:])
                    if L and R:
                        pairs.add((L.group(1), R.group(1)))
                    j += 1; continue
                i += 1; j += 1
    return pairs


def dictionary_pass(html, fixes, stats):
    """Where the booklet text could not be matched (layout-scrambled pages), split a
    joined word only if that exact split was attested in the booklets and the left
    part ends in a particle or verb ending (\"질량이갖는\" -> \"질량이 갖는\"), so
    compound nouns such as \"항해계획\" stay as they are."""
    pairs = {(l, r) for l, r in inserted_pairs(fixes) if ENDING.search(l)}
    joined = {l + r: (l, r) for l, r in pairs}
    index = {(e['exam'], e['subject'], e['number']): e for e in fixes}
    stats['dictionary'] = 0
    for m in BUNDLE_RE.finditer(html):
        year, grade, fishing, session = m.groups()[:4]
        if int(year) > 2025:
            continue
        pm = PAYLOAD_RE.search(gzip.decompress(base64.b64decode(m.group(5).strip())).decode())
        if not pm:
            continue
        exam = f'{year}-{grade}{fishing}-{session}'
        for q in json.loads(pm.group(1))['questions']:
            k = (exam, q['과목'], q['번호'])
            e = index.get(k) or {'exam': exam, 'subject': q['과목'], 'number': q['번호']}

            def split(s):
                def one(mt):
                    word, tail = mt.group(1), mt.group(2)
                    for n in range(len(word) - 1, 0, -1):
                        if word[:n] + word[n:] in joined and joined[word[:n] + word[n:]] == (word[:n], word[n:]):
                            stats['dictionary'] += 1
                            return word[:n] + ' ' + word[n:] + tail
                    return mt.group(0)
                return re.sub(r'([가-힣]+)([^가-힣\s]*)', lambda mt: one(mt) if mt.group(1) in joined else mt.group(0), s)
            stem = str(q.get('문제') or '')
            cur = e['문제'][1] if '문제' in e else stem
            new = split(cur)
            if new != cur:
                e['문제'] = [stem, new]
            cs = list(e.get('선택지') or [None] * len(q.get('선택지') or []))
            for i, c in enumerate(q.get('선택지') or []):
                c = str(c); cur = cs[i][1] if cs[i] else c
                new = split(cur)
                if new != cur:
                    cs[i] = [c, new]
            if any(cs):
                e['선택지'] = cs
            if len(e) > 3 and k not in index:
                index[k] = e; fixes.append(e)


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
    fixes, stats = [], {'questions': 0, 'matched': 0, 'stems': 0, 'choices': 0}
    cache = {}
    for m in BUNDLE_RE.finditer(html):
        year, grade, fishing, session = m.group(1), m.group(2), m.group(3), m.group(4)
        if int(year) > 2025:
            continue
        key = (year, grade, bool(fishing))
        if key not in cache:
            cache[key] = booklet(year, grade, bool(fishing))
        if not cache[key]:
            continue
        src, before = cache[key]
        pm = PAYLOAD_RE.search(gzip.decompress(base64.b64decode(m.group(5).strip())).decode())
        if not pm:
            continue
        exam = f'{year}-{grade}{fishing}-{session}'
        for q in json.loads(pm.group(1))['questions']:
            stats['questions'] += 1
            stem = str(q.get('문제') or '')
            flat = re.sub(r'\s+', '', stem)
            if len(flat) < 8:
                continue
            at = src.find(flat)
            entry = {'exam': exam, 'subject': q['과목'], 'number': q['번호']}
            if at >= 0:
                stats['matched'] += 1
                new, ch = respace(stem, src, at, before)
                if ch:
                    entry['문제'] = [stem, new]; stats['stems'] += 1
            # choices: search just after the stem, in order
            pos = at + len(flat) if at >= 0 else -1
            cf = []
            for c in q.get('선택지') or []:
                c = str(c)
                # Page-number residue of the last choice ("… 2 -") is hidden at runtime
                # (reported-content-fixes.js); match and respace the text before it.
                tail_m = FOOTER.search(c)
                tail = c[tail_m.start():] if tail_m else ''
                c_body = c[:len(c) - len(tail)] if tail else c
                cflat = re.sub(r'\s+', '', MARK.sub('', c_body))
                j = src.find(cflat, pos, pos + 1500) if cflat and pos >= 0 else -1
                # Stem edited since the booklet: accept a long choice found exactly once.
                if j < 0 and len(cflat) >= 12 and src.count(cflat) == 1:
                    j = src.find(cflat)
                if j < 0:
                    cf.append(None); continue
                # Choices are searched independently: our order may differ from the booklet.
                lead = c[:len(c) - len(c.lstrip())]
                body = MARK.sub('', c_body) if MARK.match(c_body) else c_body
                if body != c_body:
                    cf.append(None); continue
                nc, chg = respace(c_body, src, j, before)
                nc += tail
                cf.append([c, nc] if chg else None)
                if chg: stats['choices'] += 1
            if any(cf):
                entry['선택지'] = cf
            if len(entry) > 3:
                fixes.append(entry)
    dictionary_pass(html, fixes, stats)
    out = ROOT / 'tools' / 'spacing_fixes_v557.json'
    out.write_text(json.dumps(fixes, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(stats, ensure_ascii=False), len(fixes))

main()
