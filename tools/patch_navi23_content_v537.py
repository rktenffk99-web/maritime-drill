"""2·3급 항해사(상선) 기출 데이터·해설 보정 v5.37 (재실행해도 결과가 같다).

1) index.html 안의 past-YEAR-navi2/navi3(+어선 변종) 번들에서
   - 검증된 정답 키 보정, 문구 보정
   - 번호가 겹쳐 출제에서 빠지던 파싱 오류 문항의 번호·문구·정답 복구
   - 마지막 보기에 붙은 시험지 바닥글(저작권 안내문) 제거
2) past-explain-YEAR 번들 끝에 보정 해설 블록을 덧붙인다.
   - 생성 실패 문구가 해설로 저장된 문항, 해설이 없던 문항, 사실 오류가 있던 해설을 대체
   해설 원문은 tools/navi23_explanations_v537/*.txt (형식은 build_explanations 참고).
"""
import base64
import gzip
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
FIXES = json.loads((ROOT / 'tools' / 'navi23_content_fixes_v537.json').read_text(encoding='utf-8'))
EXPLAIN_DIR = ROOT / 'tools' / 'navi23_explanations_v537'
BLOCK_START = '// md-navi23-content-fixes-v537 START'
BLOCK_END = '// md-navi23-content-fixes-v537 END'
BUNDLE_RE = re.compile(r'(<script type="application/gzip" id="md-bundle-([^"]+)">)(.*?)(</script>)', re.S)
PAYLOAD_RE = re.compile(r'(const PAYLOAD = )(\{.*?\n\})(;\n)', re.S)
MARKS = '㉮㉯㉰㉱'


def inflate(b64):
    return gzip.decompress(base64.b64decode(b64.strip())).decode('utf-8')


def deflate(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), mtime=0)).decode('ascii')


def variants(exam_id):
    """'2022-navi2-3' -> ['2022-navi2-3', '2022-navi2e-3']"""
    year, grade, session = exam_id.split('-')
    return [exam_id, f'{year}-{grade}e-{session}']


BASE_STEMS = {}


def same_as_base(exam_id, base_id, q, stem=None):
    """어선 변종은 상선 원본과 문제·보기가 같을 때만 같은 보정을 적용한다."""
    if exam_id == base_id:
        return True
    ref = BASE_STEMS.get((base_id, q.get('과목'), stem or q.get('문제')))
    return ref is not None and ref == q.get('선택지')


def fix_payload(exam_id, payload):
    changed = []
    qs = payload['questions']
    base_id = exam_id.replace('navi2e-', 'navi2-').replace('navi3e-', 'navi3-')
    for fx in FIXES['answerFixes']:
        if fx['exam'] != base_id:
            continue
        for q in qs:
            if (q.get('과목') == fx['subject'] and q.get('번호') == fx['number'] and q.get('정답') == fx['from']
                    and same_as_base(exam_id, base_id, q)):
                q['정답'] = fx['to']
                changed.append(f"정답 {fx['subject']} {fx['number']}: {fx['from']}→{fx['to']}")
    for fx in FIXES['stemFixes']:
        if fx['exam'] != base_id:
            continue
        for q in qs:
            if (q.get('과목') == fx['subject'] and q.get('번호') == fx['number'] and q.get('문제') == fx['from']
                    and same_as_base(exam_id, base_id, q)):
                q['문제'] = fx['to']
                changed.append(f"문구 {fx['subject']} {fx['number']}")
    for fx in FIXES['renumberFixes']:
        if fx['exam'] != base_id:
            continue
        for q in qs:
            if (q.get('과목') == fx['subject'] and q.get('번호') == fx['number']
                    and str(q.get('문제', '')).startswith(fx['stemStartsWith'])
                    and same_as_base(exam_id, base_id, q)):
                q['번호'] = fx['newNumber']
                q['문제'] = fx['stem']
                q['정답'] = fx['answer']
                changed.append(f"번호 {fx['subject']} {fx['number']}→{fx['newNumber']}")
    if any(c.startswith('번호') for c in changed):
        qs.sort(key=lambda q: (q.get('과목번호', 0), q.get('번호', 0)))
    footer = re.compile(FIXES['footerPattern'])
    for q in qs:
        choices = q.get('선택지') or []
        if choices and isinstance(choices[-1], str):
            fixed = footer.sub('', choices[-1]).rstrip()
            if fixed != choices[-1]:
                choices[-1] = fixed
                changed.append(f"바닥글 {q.get('과목')} {q.get('번호')}")
    return changed


FREQ_RE = re.compile(r'(window\.MD_NAVI_FREQUENCY\["(navi[23])"\] = )(\{.*\})(;\n)', re.S)


def normalize(text):
    import unicodedata
    text = unicodedata.normalize('NFKC', str(text or '')).lower()
    return ''.join(ch for ch in text if not ch.isspace() and unicodedata.category(ch)[0] not in 'PS')


def fix_frequency(grade, data):
    changed = []
    groups = data['groups']
    by_id = {g['id']: g for g in groups}
    for fx in FIXES['frequencyFixes'].get(grade, []):
        g = by_id.get(fx['group'])
        if not g:
            continue
        old = dict(zip(('year', 'session', 'number'), fx['from']))
        new = dict(zip(('year', 'session', 'number'), fx['to']))
        hit = next((h for h in g['hits'] if all(h[k] == v for k, v in old.items())), None)
        if fx.get('mergeInto'):
            if hit is None:
                continue
            target = by_id[fx['mergeInto']]
            if not any(all(h[k] == v for k, v in new.items()) for h in target['hits']):
                target['hits'].append(new)
                target['hits'].sort(key=lambda h: (h['year'], h['session'], h['number']))
            g['hits'].remove(hit)
            if not g['hits']:
                groups.remove(g)
                for topic in data.get('topics', []):
                    for th in topic.get('hits', []):
                        if th.get('groupId') == g['id']:
                            th['groupId'] = target['id']
            changed.append(f"{fx['group']}→{target['id']}")
        else:
            if hit is not None and hit != new:
                hit.update(new)
                changed.append(f"{fx['group']} 번호")
            if fx.get('question') and g['question'] != fx['question']:
                g['question'] = fx['question']
                g['normalized'] = normalize(fx['question'])
                changed.append(f"{fx['group']} 문구")
    return changed


def build_explanations():
    """@@ 키 / 본문 / '- ' 보기별 설명 / '* ' 핵심 암기 / '> ' 지문 해석(영어)."""
    out = {}
    for path in sorted(EXPLAIN_DIR.glob('*.txt')):
        for chunk in path.read_text(encoding='utf-8').split('@@ ')[1:]:
            lines = chunk.strip('\n').split('\n')
            key = lines[0].strip()
            reading, body, keypoints = [], [], []
            for line in lines[1:]:
                line = line.rstrip()
                if not line:
                    continue
                if line.startswith('> '):
                    reading.append(html.escape(line[2:]))
                elif line.startswith('* '):
                    keypoints.append(html.escape(line[2:]))
                elif line.startswith('- '):
                    body.append('• ' + html.escape(line[2:]))
                else:
                    body.append(html.escape(line))
            parts = []
            if reading:
                parts.append('━━ 지문 독해 ━━<br>' + '<br>'.join(reading))
                parts.append('━━ 왜 정답인가? ━━<br>' + '<br>'.join(body))
            else:
                parts.append('━━ 정답 해설 ━━<br>' + '<br>'.join(body))
            if keypoints:
                parts.append('━━ 핵심 암기 ━━<br>' + '<br>'.join(keypoints))
            if key in out:
                raise SystemExit(f'중복 해설 키: {key}')
            if not re.match(r'^20\d\d\|navi[23]\|\d\|(항해|운용|법규|영어|상선전문)\|\d+$', key):
                raise SystemExit(f'해설 키 형식 오류: {key}')
            out[key] = {'html': '<br><br>'.join(parts)}
    return out


def patch_explain_bundle(year, text, entries):
    text = re.sub(re.escape(BLOCK_START) + r'.*?' + re.escape(BLOCK_END) + r'\n?', '', text, flags=re.S).rstrip('\n') + '\n'
    if not entries:
        return text
    body = json.dumps(entries, ensure_ascii=False, indent=0, sort_keys=True)
    return (text + BLOCK_START + '\n'
            + '// 생성 실패 문구·누락·사실 오류 해설을 대체하는 2·3급 항해사 보정 해설\n'
            + 'window.MD_EXPLAIN = window.MD_EXPLAIN || {};\n'
            + f'Object.assign(window.MD_EXPLAIN, {body});\n' + BLOCK_END + '\n')


def main():
    source = INDEX.read_text(encoding='utf-8-sig')
    explanations = build_explanations()
    by_year = {}
    for key, value in explanations.items():
        by_year.setdefault(key.split('|')[0], {})[key] = value
    report = {'data': {}, 'explain': {}}

    def repl(m):
        bundle_id = m.group(2)
        mm = re.match(r'past-(20\d\d)-(navi[23]e?-\d)_js$', bundle_id)
        me = re.match(r'past-explain-(20\d\d)_js$', bundle_id)
        mf = re.match(r'past-analysis-(navi[23])_js$', bundle_id)
        if not mm and not me and not mf:
            return m.group(0)
        text = inflate(m.group(3))
        if mf:
            fm = FREQ_RE.search(text)
            data = json.loads(fm.group(3))
            changed = fix_frequency(mf.group(1), data)
            if not changed:
                return m.group(0)
            report['data'][bundle_id] = changed
            text = text[:fm.start(3)] + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + text[fm.end(3):]
        elif mm:
            exam_id = f'{mm.group(1)}-{mm.group(2)}'
            pm = PAYLOAD_RE.search(text)
            if not pm:
                return m.group(0)
            payload = json.loads(pm.group(2))
            changed = fix_payload(exam_id, payload)
            if not changed:
                return m.group(0)
            report['data'][exam_id] = changed
            new_json = json.dumps(payload, ensure_ascii=False, indent=2)
            text = text[:pm.start(2)] + new_json + text[pm.end(2):]
        else:
            year = me.group(1)
            new_text = patch_explain_bundle(year, text, by_year.get(year, {}))
            if new_text == text:
                return m.group(0)
            report['explain'][year] = len(by_year.get(year, {}))
            text = new_text
        return m.group(1) + deflate(text) + m.group(4)

    for m in BUNDLE_RE.finditer(source):
        mm = re.match(r'past-(20\d\d)-(navi[23]-\d)_js$', m.group(2))
        if mm:
            pm = PAYLOAD_RE.search(inflate(m.group(3)))
            if not pm:
                continue  # 2026년 3회처럼 JSON이 아닌 수기 번들은 보정 대상이 아니다.
            for q in json.loads(pm.group(2))['questions']:
                BASE_STEMS[(f'{mm.group(1)}-{mm.group(2)}', q.get('과목'), q.get('문제'))] = q.get('선택지')

    patched = BUNDLE_RE.sub(repl, source)
    missing_years = set(by_year) - {f'{y}' for y in range(2020, 2027)}
    if missing_years:
        raise SystemExit(f'해설 연도 번들 없음: {missing_years}')
    if patched != source:
        INDEX.write_text(patched, encoding='utf-8')
    print(json.dumps({'explanations': len(explanations), **report}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
