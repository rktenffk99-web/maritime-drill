from pathlib import Path
import re,base64,gzip,subprocess
src=Path('index.html').read_text(encoding='utf-8-sig')
js=Path('explain-2026-navi3-3.js').read_text(encoding='utf-8')
eng=Path('explain-2026-navi3-3-english.js').read_text(encoding='utf-8')
keys=re.findall(r"'(항해|운용|법규|영어|상선전문)\|(\d+)'\s*:",js)
assert len(keys)==125, f'reason count {len(keys)} != 125'
assert len(set(keys))==125, 'duplicate explanation keys'
for subject in ('항해','운용','법규','영어','상선전문'):
    nums=sorted(int(n) for s,n in keys if s==subject)
    assert nums==list(range(1,26)), f'{subject} explanation numbers incomplete: {nums}'
assert '<script src="explain-2026-navi3-3.js"></script>' in src
assert '<script src="explain-2026-navi3-3-english.js"></script>' in src
assert src.index('<script src="explain-2026-navi3-3.js"></script>') < src.index('<script src="explain-2026-navi3-3-english.js"></script>')
assert 'get2026Navi3Session3Explain(q)' in src

# Detailed English override: every session-3 English question must have the same study sections used by recent years.
eng_nums=sorted(int(n) for n in re.findall(r'^\s{4}(\d+):\{',eng,re.M))
assert eng_nums==list(range(1,26)), f'detailed English explanation numbers incomplete: {eng_nums}'
for marker in ('━━ 지문 독해 ━━','━━ 핵심 어휘·표현 ━━','━━ 보기 해석 ━━','━━ 문장 구조·포인트 ━━','━━ 정답 해설 ━━','━━ 핵심 암기 ━━'):
    assert marker in eng, f'English explanation section missing: {marker}'
assert eng.count('chunks:[')==25, 'not every English question has chunk reading'
assert eng.count('vocab:[')==25, 'not every English question has vocabulary'
assert eng.count('choices:[')==25, 'not every English question has option translations'
assert eng.count("grammar:")==25, 'not every English question has grammar/structure notes'
assert eng.count("why:")==25, 'not every English question has answer rationale'
assert eng.count("memory:")==25, 'not every English question has memory point'
assert "String(q['과목']||'')==='영어'" in eng
assert len(eng)>30000, f'detailed English asset unexpectedly short: {len(eng)}'
subprocess.run(['node','--check','explain-2026-navi3-3-english.js'],check=True)

def bundle(script_id):
    m=re.search(r'<script[^>]*id=["\']'+re.escape(script_id)+r'["\'][^>]*>(.*?)</script>',src,re.S|re.I)
    assert m,script_id+' missing'
    return gzip.decompress(base64.b64decode(m.group(1).strip())).decode('utf-8')

raw=bundle('md-bundle-past-2026-navi3-3_js')
nav='Q(21, "레이더 물표상에서 상대선의 상대운동 벡터에 관한 설명으로 옳은 것은?"'
law='Q(21, "국제해상충돌방지규칙상 예인선이 그림의 등화를 표시하여야 하는 경우는?'
navline=next(x for x in raw.splitlines() if nav in x)
lawline=next(x for x in raw.splitlines() if law in x)
assert '], 2, "항해", "navi")' in navline, navline
assert '], 2, "법규", "law")' in lawline, lawline
english_lines=[x for x in raw.splitlines() if 'Q(' in x and '"영어"' in x]
assert len(english_lines)==25, f'2026 navi3 session3 English question count {len(english_lines)} != 25'
embedded=bundle('md-bundle-past-explain-2026_js')
embedded_keys=set(re.findall(r'"(2026\|navi[23]\|\d+\|[^"\n]+\|\d+)"\s*:',embedded))
assert len(embedded_keys)==200, f'embedded 2026 explanation count {len(embedded_keys)} != 200'
print('2026 explanation coverage: 325/325; session3 English 25/25 detailed reading/vocab/options/grammar/rationale/memory; verified answers present')
