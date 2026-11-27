"""항해사 2·3급 해설 점검 v5.49 (다시 실행해도 결과가 같다).

2026-11-27 전수 점검에서 확인한 것만 고친다.
  1. 정답 전사 오류 1건: 2020 2급 2회 법규 5 (선박안전법 시행규칙 제16조 대조,
     2021-navi2-3·2024-navi2-4 같은 문제의 정답과도 일치) ㉰ → ㉯.
  2. 해설 전체 재작성 3건: 정답과 다른 보기를 정답처럼 설명했거나 용어 정의가
     서로 모순되던 해설.
  3. "옳지 않은 것" 문제에서 정답 보기를 "오답"이라고 적어 헷갈리던 해설 17건:
     정답 보기 줄의 "오답"만 "정답(틀린 설명)"으로 바꾼다.
결과는 past-explain-YEAR 번들 끝에 덮어쓰기 블록으로 붙인다.
"""
import base64
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
START = '// md-explain-audit-v549 START'
END = '// md-explain-audit-v549 END'
BUNDLE_RE = r'(<script type="application/gzip" id="md-bundle-{}_js">)(.*?)(</script>)'

T = '<span style="color:#0EA5E9;font-weight:bold">{}</span>'
S = '<span style="color:#94A3B8;font-size:0.9em">{}</span>'
HL = '<span style="background:#FEF3C7;padding:1px 4px;border-radius:3px">{}</span>'


def inflate(b64):
    return gzip.decompress(base64.b64decode(b64.strip())).decode('utf-8')


def deflate(text):
    return base64.b64encode(gzip.compress(text.encode('utf-8'), mtime=0)).decode('ascii')


def page(terms, body, bullets, keys):
    out = '━━ 용어 정리 ━━'
    out += '<br>'.join(f'• {T.format(name)}{S.format(sub)}: {desc}' for name, sub, desc in terms)
    out += '<br>━━ 정답 해설 ━━' + body + '<br>'
    out += '<br>'.join(f'• {line}' for line in bullets)
    out += '<br>━━ 핵심 암기 ━━' + '<br>'.join(keys)
    return out


REWRITES = {
    '2020|navi2|2|법규|5': page(
        [('항해구역', '(航海區域)', '선박검사증서에 적어 그 선박이 다닐 수 있게 정한 바다의 범위. 평수·연해·근해·원양구역 네 가지.'),
         ('선박안전법 시행규칙 제16조', '(항해구역의 지정)', '항해구역을 지정할 때 고려할 사항을 정한 조문.'),
         ('선박시설기준', '(船舶施設基準)', '선체·기관·구명·소방 설비 등 선박시설이 갖춰야 할 기준.'),
         ('선적항', '(船籍港, Port of Registry)', '선박을 등록한 항구. 국적·등록 관할을 정하는 기준이지 안전 성능과는 관계가 없다.')],
        f'선박안전법 시행규칙 제16조 ①은 "항해구역을 지정하는 경우에는 {HL.format("선박소유자의 요청, 선박의 구조 및 선박시설기준")} 등을 고려하여 지정하여야 한다"고 정한다. '
        '선적항은 이 목록에 없으므로 고려 사항이 아닌 것은 ㉯ 선적항이다. 따라서 정답은 ㉯이다.<br>'
        '(같은 문제가 나온 2021년 2급 3회·2024년 2급 4회도 정답이 "선적항"이다. 이 문항의 정답 표기 ㉰는 전사 오류라 ㉯로 바로잡았다.)',
        ['㉮ 선박의 구조: 제16조에 적힌 고려 사항이다.',
         '㉯ 선박의 선적항: 제16조에 없는 항목 → 정답.',
         '㉰ 선박의 시설기준: 제16조의 "선박시설기준"으로 고려 사항이다.',
         '㉱ 선박소유자의 요청: 제16조 맨 앞에 적힌 고려 사항이다.'],
        ['항해구역 지정 고려 사항 = 선박소유자의 요청 + 선박의 구조 + 선박시설기준 (선적항은 아님).',
         '어선에는 항해구역을 지정하지 않는다(같은 조 단서).']),
    '2026|navi2|2|운용|12': page(
        [('기압 배치', '(氣壓配置)', '우리나라를 기준으로 고기압과 저기압이 어느 쪽에 놓였는지로 나눈 날씨 유형.'),
         ('북고남저형', '(北高南低型)', '북쪽에 고기압, 남쪽에 저기압·전선이 있는 배치. 북동풍이 불고 남부지방에 구름과 비(눈)가 많다.'),
         ('서고동저형', '(西高東低型)', '서쪽 대륙에 고기압, 동쪽(일본 동쪽 해상)에 저기압. 전형적인 겨울 배치로 북서계절풍이 강하다.'),
         ('동고서저형', '(東高西低型)', '동쪽에 고기압, 서쪽에서 저기압이 다가오는 배치. 날씨가 점차 나빠진다.'),
         ('남고북저형', '(南高北低型)', '남쪽에 북태평양 고기압, 북쪽에 저기압. 여름철 무덥고 습한 배치.')],
        '대륙 고기압이 시베리아 → 만주 → 연해주 → 북해도로 동서로 길게 뻗으면 우리나라의 '
        f'{HL.format("북쪽")}이 고기압에 덮인다. 동시에 일본 남쪽 해상에 한랭전선이 북동~남서로 걸쳐 있으면 우리나라 '
        f'{HL.format("남쪽")}은 기압이 낮다. 북쪽 고기압·남쪽 저기압이므로 북고남저형이고, 전선에 가까운 남부지방이 흐린 날씨를 보인다. '
        '따라서 정답은 ㉮이다.',
        ['㉮ 북고남저형: 고기압이 북쪽(만주·연해주·북해도)에 동서로 뻗고 전선이 남쪽 해상에 있으므로 맞다 → 정답.',
         '㉯ 서고동저형: 고기압이 서쪽 대륙, 저기압이 일본 동쪽 해상에 있는 겨울 배치로, 북서계절풍과 맑고 추운 날씨가 특징이다. 문제의 고기압은 북쪽에 동서로 뻗어 있다.',
         '㉰ 동고서저형: 동쪽에 고기압이 있어야 하므로 맞지 않다.',
         '㉱ 남고북저형: 남쪽에 고기압이 있는 여름 배치라 맞지 않다.'],
        ['고기압이 만주~연해주~북해도로 "띠처럼" 뻗고 남쪽 해상에 전선 → 북고남저형, 남부지방 흐림·비.',
         '고기압 서쪽 대륙 + 저기압 일본 동쪽 → 서고동저형(겨울 북서계절풍).']),
    '2023|navi2|3|운용|10': page(
        [('정적 복원력 곡선', '(GZ curve)', '경사각에 따른 복원정(GZ)의 크기를 그린 곡선.'),
         ('복원정', '(復原挺, Righting lever, GZ)', '배가 기울었을 때 무게중심 G와 부력 작용선 사이의 수평 거리. 클수록 복원력이 크다.'),
         ('최대 복원각', '(Angle of maximum GZ)', '복원정이 가장 큰 경사각. 대략 갑판 끝이 물에 잠기기 시작하는 각과 같다.'),
         ('위험 횡요각', '(危險橫搖角)', '출제 기준상 최대 복원각을 말한다. 이 각을 넘으면 복원력이 줄어들며, 최대 횡요각의 약 1/2 정도로 본다.'),
         ('복원력 소실각', '(Angle of vanishing stability)', '복원정이 다시 0이 되는 경사각. 이 각을 넘으면 배가 스스로 일어서지 못하고 전복된다.')],
        '복원정이 0이 되는 경사각은 위험 횡요각이 아니라 복원력 소실각이다. 위험 횡요각은 복원정이 최대가 되는 최대 복원각을 가리키므로, '
        '"복원정이 0이 되는 경사각을 위험 횡요각이라 한다"는 ㉯가 옳지 않은 설명이다. 따라서 정답은 ㉯이다.<br>'
        '(같은 개념을 묻는 2021년 2급 2회 운용 9·3회 운용 8도 "위험 횡요각 = 복원력 소실각"을 틀린 설명으로 출제했다.)',
        ['㉮ 위험 경사각(위험 횡요각)이 최대 횡요각의 약 1/2이라는 것은 출제 기준과 같은 설명이다.',
         '㉯ 복원정이 0이 되는 각은 복원력 소실각이므로 틀린 설명 → 정답.',
         '㉰ 복원정이 최대가 되는 경사각을 최대 복원각이라 하므로 옳다.',
         '㉱ 최대 복원각은 갑판 끝이 잠기기 시작하는 각과 거의 같으므로 옳다.'],
        ['GZ 최대 = 최대 복원각 = 위험 횡요각 ≈ 갑판 끝 몰입각.',
         'GZ = 0 (두 번째) = 복원력 소실각 → 이 각을 넘으면 전복.']),
    '2026|navi3|3|법규|20': page(
        [('제한된 시계', '(Restricted visibility)', '안개·비·눈 등으로 시계가 제한된 상태. 서로 눈으로 보이지 않는 선박에는 유지선·피항선 구분이 없다.'),
         ('정횡', '(Abeam)', '선체 중앙에서 선수미선과 직각인 방향.'),
         ('레이더만으로 탐지', '(Detected by radar alone)', '눈으로는 보이지 않고 레이더로만 상대선을 알게 된 경우.')],
        '서로 시계 안에 있지 않은 선박이 레이더만으로 상대선을 탐지해 충돌 위험이 있다고 판단하면, 충분한 시간적 여유를 두고 피항동작을 해야 한다. '
        f'침로 변경만으로 피할 때는 {HL.format("① 정횡 앞쪽 선박에 대해 좌현 쪽으로 변침")}(앞지르기당하는 선박 제외)과 '
        f'{HL.format("② 정횡이나 그 뒤쪽 선박 방향으로 변침")}을 피해야 한다(해상교통안전법 제77조 ⑤, COLREG 제19조 (d)). '
        '따라서 정횡 앞쪽 선박에 대해 우현 쪽으로 변침하는 ㉰가 옳고, 정답은 ㉰이다.<br>'
        '(촬영 문제지에서 그림과 보기 문구가 깨져 "서로 시계 안에서", "정횡 왼쪽 선박에 대해 좌현 쪽으로 변침"처럼 법규와 맞지 않게 들어와 있었다. 원문 문제집이 공개되지 않아, 공식 정답 위치 ㉰는 그대로 두고 문항을 법 조문에 맞게 재구성했다.)',
        ['㉮ 침로·속력 유지: 제한된 시계에서는 유지선 개념이 없고, 충돌 위험이 있으면 피항동작을 해야 하므로 틀리다.',
         '㉯ 장음 1회 후 증속: 무중신호는 2분 이내 간격의 장음이고, 충돌 위험이 있으면 오히려 속력을 줄여야 하므로 틀리다.',
         '㉰ 정횡 앞쪽 선박에 대해 우현 변침: 피해야 할 동작(좌현 변침)이 아니므로 옳다 → 정답.',
         '㉱ 정횡 뒤쪽 선박 방향으로 변침: 법이 피하라고 정한 동작이므로 틀리다.'],
        ['제한 시계 + 레이더만으로 탐지 → 정횡 앞 선박에 좌현 변침 금지, 정횡·정횡 뒤 선박 쪽으로 변침 금지.',
         '정횡 앞에서 무중신호를 듣거나 근접을 피할 수 없으면 침로 유지에 필요한 최소 속력으로 감속(필요하면 정지).']),
    '2024|navi2|3|운용|11': page(
        [('정적 복원력 곡선', '(GZ curve)', '가로축 경사각, 세로축 복원정(GZ)으로 그린 곡선.'),
         ('GM', '(Metacentric height)', '무게중심 G에서 메타센터 M까지의 높이. 초기 복원력의 크기.'),
         ('57.3°', '(1 radian)', 'GM을 곡선에서 읽을 때 쓰는 기준 각도. 1라디안 = 57.3°.')],
        '원점(0°)에서 곡선에 접선을 긋고, 경사각 57.3°(1라디안)에서 세운 수직선이 그 접선과 만나는 높이가 GM이다. '
        f'작은 경사각에서 GZ ≈ GM × θ(라디안)이므로 θ = 1라디안일 때 접선의 높이가 곧 GM이 되기 때문이다. 그림에서 {HL.format("57.3° 위치의 ③")}이 이 높이를 가리키므로 정답은 ㉰이다.',
        ['㉮ ①: 약 35° 위치의 곡선 높이로, 그 경사각에서의 복원정일 뿐 GM이 아니다.',
         '㉯ ②: 곡선의 꼭대기(약 48°), 즉 최대 복원정과 최대 복원각을 가리킨다.',
         '㉰ ③: 57.3°에서 원점 접선까지의 높이 = GM → 정답.',
         '㉱ ④: 63° 부근에서 접선과 곡선이 만나는 점으로, GM과 관계없다.'],
        ['GM = 원점 접선이 57.3°(1라디안) 수직선과 만나는 높이.',
         '곡선 꼭대기 = 최대 복원정·최대 복원각, 곡선이 다시 0이 되는 각 = 복원력 소실각.']),
}

# "옳지 않은 것"류 문제에서 정답 보기 줄에 적힌 "오답"을 바꾼다.
WORDING = [
    '2021|navi3|4|상선전문|25', '2022|navi3|1|항해|19', '2022|navi3|1|항해|24', '2023|navi2|1|상선전문|22',
    '2023|navi2|3|법규|24', '2023|navi3|4|법규|2', '2024|navi2|1|운용|13', '2024|navi2|2|법규|9',
    '2024|navi3|1|항해|25', '2024|navi3|2|운용|21', '2024|navi3|3|상선전문|24', '2024|navi3|4|상선전문|22',
    '2024|navi3|4|운용|8', '2025|navi2|3|항해|1', '2025|navi2|4|법규|23', '2025|navi3|1|법규|5',
    '2025|navi3|1|상선전문|3',
]
RAW_MARKS = [('㉮',), ('㉯',), ('㉰', '㉴'), ('㉱', '㉵')]

# 2026 3급 3회 법규 20: 촬영 문제지에서 그림과 보기 문구가 깨져(서로 시계 안 + 레이더 피항,
# "정횡 왼쪽 선박 쪽으로 좌현 변침"을 정답으로 표기) 원문 그림·문제집 미공개 상태라 확인할 수 없다.
# 정답 위치(㉰)는 공식 정답가(안)대로 두고, 해상교통안전법 제77조 ⑤에 맞게 문항을 재구성한다.
QUESTION_FIX = {
    'past-2026-navi3-3': ('Q(20, "국제해상충돌방지규칙상 서로 시계 안에서 항행 중 레이더 화면에서 다른 선박의 존재를 탐지하여 충돌의 위험성을 확인한 경우 적절한 피항동작으로 옳은 것은? [그림 문제]", ["자기 선박은 침로와 속력을 유지한다.", "장음 1회의 기적신호를 울리고, 속력을 올린다.", "정횡 왼쪽에 있는 선박에 대하여 좌현 쪽으로 침로를 변경한다.", "정횡 앞쪽에 있는 다른 선박으로 향하여 침로를 변경하도록 요구한다."], 2, "법규", "law")', 'Q(20, "국제해상충돌방지규칙상 제한된 시계에서 서로 시계 안에 있지 아니한 선박이 레이더만으로 다른 선박을 탐지하여 충돌의 위험이 있다고 판단한 경우, 침로 변경에 의한 피항동작으로 옳은 것은? [재구성: 원문 그림 미확보]", ["자기 선박은 침로와 속력을 유지한다.", "장음 1회의 기적신호를 울리고, 속력을 올린다.", "정횡 앞쪽에 있는 선박(앞지르기당하는 선박 제외)에 대하여 우현 쪽으로 침로를 변경한다.", "정횡 뒤쪽에 있는 선박의 방향으로 침로를 변경한다."], 2, "법규", "law")'),
}

ANSWER_FIX = {
    'past-2020-navi2-2': ('선박안전법상 해양수산부장관이 선박의 항해구역을 지정하는데 고려해야 하는 사항이 아닌 것은?', 2, 1),
    # v5.53: SMCP B3/1.3.1.6 is "Fit bonding wire and report." The same paper's fishing
    # version (2021-navi2e-1) already has ㉮; the merchant copy was mistyped as ㉯.
    'past-2021-navi2-1': ('Make bonding wire and report.', 1, 0),
}


def entries(js):
    """Last html for each key in a bundle (later blocks override earlier ones)."""
    out = {}
    for m in re.finditer(r'"(\d{4}\|[^"]+)":\s*\{\s*"?html"?:\s*("(?:[^"\\]|\\.)*")', js):
        out[m.group(1)] = json.loads(m.group(2))
    return out


def answer_index(text, key):
    """정답 index from the matching past bundle."""
    year, grade, session, subject, number = key.split('|')
    m = re.search(BUNDLE_RE.format(re.escape(f'past-{year}-{grade}-{session}')), text, re.S)
    payload = inflate(m.group(2))
    data = json.loads(re.search(r'const PAYLOAD = (\{.*?\n\});', payload, re.S).group(1))
    q = next(q for q in data['questions'] if q['과목'] == subject and str(q['번호']) == number)
    return q['정답']


def reword(html, mark_options):
    for mark in mark_options:
        m = re.search('•\\s*(?:<span[^>]*>)?\\s*' + mark + '(.*?)(?=•|━━|$)', html, re.S)
        if not m:
            continue
        seg = m.group(0)
        new = seg.replace('오답 연결', '틀린 연결이므로 정답').replace('(오답 보기로 출제된 함정)', '(틀린 내용이므로 정답)')
        new = re.sub(r'오답(?!\s*(?:이\s*)?아님|이 아)', '정답(틀린 설명)', new)
        if new == seg:
            raise SystemExit('wording target has no 오답: ' + mark)
        return html[:m.start()] + new + html[m.end():]
    raise SystemExit('answer bullet not found')


def main():
    text = INDEX.read_text(encoding='utf-8-sig')
    # 1. answer key
    for bundle, (stem, old, new) in ANSWER_FIX.items():
        m = re.search(BUNDLE_RE.format(re.escape(bundle)), text, re.S)
        js = inflate(m.group(2))
        i = js.index(json.dumps(stem, ensure_ascii=False))
        j = js.index('"정답":', i)
        k = js.index('\n', j)
        current = js[j:k].strip().rstrip(',')
        if current == f'"정답": {old}':
            js = js[:j] + js[j:k].replace(f'"정답": {old}', f'"정답": {new}') + js[k:]
            text = text[:m.start(2)] + deflate(js) + text[m.end(2):]
        elif current != f'"정답": {new}':
            raise SystemExit('answer fix anchor changed: ' + current)
    for bundle, (old, new) in QUESTION_FIX.items():
        m = re.search(BUNDLE_RE.format(re.escape(bundle)), text, re.S)
        js = inflate(m.group(2))
        if old in js:
            js = js.replace(old, new, 1)
            text = text[:m.start(2)] + deflate(js) + text[m.end(2):]
        elif new not in js:
            raise SystemExit('question fix anchor changed: ' + bundle)
    # 2/3. explanation overrides
    targets = dict(REWRITES)
    years = sorted({k.split('|')[0] for k in list(REWRITES) + WORDING})
    for year in years:
        m = re.search(BUNDLE_RE.format(re.escape(f'past-explain-{year}')), text, re.S)
        js = inflate(m.group(2))
        js = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', js, flags=re.S)
        base = entries(js)
        block = {}
        for key in [k for k in WORDING if k.startswith(year + '|')]:
            block[key] = reword(base[key], RAW_MARKS[answer_index(text, key)])
        for key, html in targets.items():
            if key.startswith(year + '|'):
                if key not in base:
                    raise SystemExit('rewrite target missing: ' + key)
                block[key] = html
        body = ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {{ html: {json.dumps(v, ensure_ascii=False)}, loading: false }}'
                          for k, v in sorted(block.items()))
        js = js.rstrip('\n') + f'\n{START}\nObject.assign(window.MD_EXPLAIN, {{\n{body}\n}});\n{END}\n'
        text = text[:m.start(2)] + deflate(js) + text[m.end(2):]
    INDEX.write_text(text, encoding='utf-8')
    print(f'explain audit v549: {len(ANSWER_FIX)} answer fixes, {len(REWRITES)} rewrites, {len(WORDING)} wording fixes')


if __name__ == '__main__':
    main()
