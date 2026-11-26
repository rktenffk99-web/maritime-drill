"""2·3급 항해사 보정 해설 확장 v5.43 (다시 실행해도 결과가 같다).

v5.37에서 짧게 대체했던 해설 350개(정답 근거 + 핵심 암기만 있던 것)를
본 해설과 같은 구성으로 다시 쓴다.
  - 일반 과목: 용어 정리 → 정답 해설(보기 4개 모두 설명) → 핵심 암기
  - 영어: 지문 독해(구절·독음·뜻) → 보기 해석 → 왜 정답인가? → 핵심 암기

원문: tools/navi23_explanations_v543/*.txt
  @@ 2020|navi2|3|운용|3
  ~ 용어 | 한자·영문 | 설명                  (용어 정리, 일반 과목 2개 이상)
  본문 줄                                    (정답 해설 / 왜 정답인가?)
  - ㉮ 보기 설명                              (일반 과목: ㉮㉯㉰㉱ 네 개 모두)
  > 영어 구절 | 독음 | 뜻                     (영어 지문 독해)
  = ㉮ 보기 영어 | 독음 | 뜻·판단             (영어 보기 해석, 네 개 모두)
  * 핵심 암기
본문에는 반드시 "정답은 ㉯" 형태로 문항 데이터의 정답과 같은 기호를 쓴다.
결과는 index.html의 past-explain-YEAR 번들 끝(v5.37 블록 뒤)에 덧붙여 덮어쓴다.
"""
import base64
import gzip
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
SRC = ROOT / 'tools' / 'navi23_explanations_v543'
BLOCK_START = '// md-navi23-explanations-v543 START'
BLOCK_END = '// md-navi23-explanations-v543 END'
BUNDLE_RE = re.compile(r'(<script type="application/gzip" id="md-bundle-([^"]+)">)(.*?)(</script>)', re.S)
PAYLOAD_RE = re.compile(r'(const PAYLOAD = )(\{.*?\n\})(;\n)', re.S)
MARKS = '㉮㉯㉰㉱'
KEY_RE = re.compile(r'^20\d\d\|navi[23]\|\d\|(항해|운용|법규|영어|상선전문)\|\d+$')

TERM = '<span style="color:#0EA5E9;font-weight:bold">{}</span>'
SUB = '<span style="color:#94A3B8;font-size:0.9em">{}</span>'
HL = '<span style="background:#FEF3C7;padding:1px 4px;border-radius:3px">{}</span>'
CHOICE = '<span style="color:#7C3AED">{}</span>'


def inflate(b64):
    return gzip.decompress(base64.b64decode(b64.strip())).decode('utf-8')


def deflate(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), mtime=0)).decode('ascii')


def inline(text):
    """Escape, then allow **강조** (노란 바탕) only."""
    out = html.escape(text, quote=False)
    return re.sub(r'\*\*(.+?)\*\*', lambda m: HL.format(m.group(1)), out)


def split3(line, key, kind):
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 3 or not all(parts):
        raise SystemExit(f'{key}: {kind} 줄은 "가 | 나 | 다" 3칸이어야 합니다: {line}')
    return parts


def parse():
    entries = {}
    for path in sorted(SRC.glob('*.txt')):
        for chunk in path.read_text(encoding='utf-8').split('\n@@ ')[0:]:
            chunk = chunk.strip()
            if not chunk:
                continue
            if chunk.startswith('@@ '):
                chunk = chunk[3:]
            lines = [l.rstrip() for l in chunk.split('\n')]
            key = lines[0].strip()
            if not KEY_RE.match(key):
                raise SystemExit(f'{path.name}: 해설 키 형식 오류: {key}')
            if key in entries:
                raise SystemExit(f'중복 해설 키: {key}')
            e = {'terms': [], 'body': [], 'choices': {}, 'reading': [], 'options': {}, 'keys': [], 'file': path.name}
            for line in lines[1:]:
                if not line.strip():
                    continue
                if line.startswith('~ '):
                    e['terms'].append(split3(line[2:], key, '용어'))
                elif line.startswith('- '):
                    mark = line[2:3]
                    if mark not in MARKS or mark in e['choices']:
                        raise SystemExit(f'{key}: 보기 설명 기호 오류: {line}')
                    e['choices'][mark] = line[3:].strip()
                elif line.startswith('> '):
                    e['reading'].append(line[2:].strip())
                elif line.startswith('= '):
                    mark = line[2:3]
                    if mark not in MARKS or mark in e['options']:
                        raise SystemExit(f'{key}: 보기 해석 기호 오류: {line}')
                    e['options'][mark] = split3(line[3:].strip(), key, '보기 해석')
                elif line.startswith('* '):
                    e['keys'].append(line[2:].strip())
                else:
                    e['body'].append(line.strip())
            entries[key] = e
    return entries


def validate(entries, answers):
    errors = []
    for key, e in entries.items():
        ans = answers.get(key)
        if ans is None:
            errors.append(f'{key}: 문항 데이터 없음')
            continue
        english = key.split('|')[3] == '영어'
        body = ' '.join(e['body'])
        if f'정답은 {ans}' not in body:
            errors.append(f'{key}: 본문에 "정답은 {ans}"가 없음')
        for other in MARKS:
            if other != ans and f'정답은 {other}' in body:
                errors.append(f'{key}: 다른 정답 기호({other})를 정답으로 씀')
        if not e['keys']:
            errors.append(f'{key}: 핵심 암기 없음')
        if english:
            if len(e['options']) != 4:
                errors.append(f'{key}: 영어 보기 해석은 4개여야 함 ({len(e["options"])})')
            if not e['reading']:
                errors.append(f'{key}: 영어 지문 독해 없음')
        else:
            if len(e['choices']) != 4:
                errors.append(f'{key}: 보기 설명은 4개여야 함 ({len(e["choices"])})')
            if len(e['terms']) < 2:
                errors.append(f'{key}: 용어 정리는 2개 이상')
    if errors:
        raise SystemExit('\n'.join(errors))


def render(key, e):
    english = key.split('|')[3] == '영어'
    parts = []
    if english:
        rows = []
        for line in e['reading']:
            if line.startswith('전체:'):
                rows.append('전체 의미: ' + inline(line[3:].strip()))
                continue
            en, reading, meaning = split3(line, key, '지문 독해')
            rows.append(f'{TERM.format(html.escape(en, quote=False))} {SUB.format("[" + html.escape(reading, quote=False) + "]")} → {inline(meaning)}')
        parts.append('━━ 지문 독해 ━━<br>' + '<br>'.join(rows))
        opts = []
        for mark in MARKS:
            en, reading, meaning = e['options'][mark]
            opts.append(f'• {mark} {TERM.format(html.escape(en, quote=False))} {SUB.format("[" + html.escape(reading, quote=False) + "]")} → {inline(meaning)}')
        parts.append('━━ 보기 해석 ━━<br>' + '<br>'.join(opts))
        why = '<br>'.join(inline(b) for b in e['body'])
        if e['choices']:
            why += '<br><br>' + '<br>'.join(f'• {m} {CHOICE.format(inline(t))}' for m, t in sorted(e['choices'].items(), key=lambda x: MARKS.index(x[0])))
        parts.append('━━ 왜 정답인가? ━━<br>' + why)
    else:
        terms = [f'• {TERM.format(html.escape(n, quote=False))}{SUB.format("(" + html.escape(s, quote=False) + ")")}: {inline(d)}' for n, s, d in e['terms']]
        parts.append('━━ 용어 정리 ━━<br>' + '<br>'.join(terms))
        body = '<br>'.join(inline(b) for b in e['body'])
        bullets = '<br>'.join(f'• {m} {CHOICE.format(inline(e["choices"][m]))}' for m in MARKS)
        parts.append('━━ 정답 해설 ━━<br>' + body + '<br><br>' + bullets)
    parts.append('━━ 핵심 암기 ━━<br>' + '<br>'.join('• ' + inline(k) for k in e['keys']))
    return '<br>'.join(parts)


def load_answers(source):
    answers = {}
    for m in BUNDLE_RE.finditer(source):
        mm = re.match(r'past-(20\d\d)-(navi[23])-(\d)_js$', m.group(2))
        if not mm:
            continue
        pm = PAYLOAD_RE.search(inflate(m.group(3)))
        if not pm:
            continue
        for q in json.loads(pm.group(2))['questions']:
            answers[f'{mm.group(1)}|{mm.group(2)}|{mm.group(3)}|{q["과목"]}|{q["번호"]}'] = MARKS[q['정답']]
    return answers


def patch_bundle(text, entries):
    text = re.sub(re.escape(BLOCK_START) + r'.*?' + re.escape(BLOCK_END) + r'\n?', '', text, flags=re.S).rstrip('\n') + '\n'
    if not entries:
        return text
    body = json.dumps(entries, ensure_ascii=False, indent=0, sort_keys=True)
    return (text + BLOCK_START + '\n'
            + '// v5.37 짧은 보정 해설을 용어·보기별 설명을 갖춘 형식으로 확장한 2·3급 항해사 해설\n'
            + 'window.MD_EXPLAIN = window.MD_EXPLAIN || {};\n'
            + f'Object.assign(window.MD_EXPLAIN, {body});\n' + BLOCK_END + '\n')


def main():
    source = INDEX.read_text(encoding='utf-8-sig')
    entries = parse()
    validate(entries, load_answers(source))
    by_year = {}
    for key, e in entries.items():
        by_year.setdefault(key.split('|')[0], {})[key] = {'html': render(key, e)}
    if '--check' in sys.argv:
        print(json.dumps({'entries': len(entries)}, ensure_ascii=False))
        return

    def repl(m):
        me = re.match(r'past-explain-(20\d\d)_js$', m.group(2))
        if not me:
            return m.group(0)
        text = inflate(m.group(3))
        new = patch_bundle(text, by_year.get(me.group(1), {}))
        if new == text:
            return m.group(0)
        return m.group(1) + deflate(new) + m.group(4)

    patched = BUNDLE_RE.sub(repl, source)
    if patched != source:
        INDEX.write_text(patched, encoding='utf-8')
    print(json.dumps({'entries': len(entries), 'years': {y: len(v) for y, v in sorted(by_year.items())}}, ensure_ascii=False))


if __name__ == '__main__':
    main()
