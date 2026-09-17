from pathlib import Path
import re,base64,gzip
p=Path('index.html')
text=p.read_text(encoding='utf-8-sig'); original=text

# Fix two verified answer-key transcription issues in the embedded 2026 navi3 session 3 bundle.
sid='md-bundle-past-2026-navi3-3_js'
m=re.search(r'(<script[^>]*id=["\']'+re.escape(sid)+r'["\'][^>]*>)(.*?)(</script>)',text,re.S|re.I)
if not m: raise SystemExit('2026 navi3 session3 bundle not found')
raw=gzip.decompress(base64.b64decode(m.group(2).strip())).decode('utf-8')
repls=[
('Q(21, "레이더 물표상에서 상대선의 상대운동 벡터에 관한 설명으로 옳은 것은?", ["진운동 레이더 상에서 나타나는 상대선의 진운동 벡터와 같다.", "본선으로 향한 상대운동 벡터는 충돌 위험이 있는 상태임을 뜻한다.", "상대운동 레이더 상에 나타나는 상대선의 움직임을 표시하는 벡터이다.", "벡터의 길이가 긴 쪽이 짧은 쪽보다 통상 본선을 지나는 데 걸리는 시간이 짧다."], 0, "항해", "navi")',
 'Q(21, "레이더 물표상에서 상대선의 상대운동 벡터에 관한 설명으로 옳은 것은?", ["진운동 레이더 상에서 나타나는 상대선의 진운동 벡터와 같다.", "본선으로 향한 상대운동 벡터는 충돌 위험이 있는 상태임을 뜻한다.", "상대운동 레이더 상에 나타나는 상대선의 움직임을 표시하는 벡터이다.", "벡터의 길이가 긴 쪽이 짧은 쪽보다 통상 본선을 지나는 데 걸리는 시간이 짧다."], 2, "항해", "navi")'),
('Q(21, "국제해상충돌방지규칙상 예인선이 그림의 등화를 표시하여야 하는 경우는? [그림: 백색 마스트등 3개, 현등, 선미등 및 황색 예인등]", ["길이 50미터 미만의 예인선이 예인선열의 길이 200미터 이하인 예인을 하고 있을 경우", "길이 50미터 이상의 예인선이 예인선열의 길이 200미터 이하인 예인을 하고 있을 경우", "길이 50미터 이상의 예인선이 예인선열의 길이 200미터를 초과하는 예인을 하고 있을 경우", "길이 100미터 이상의 예인선이 예인선열의 길이 300미터를 초과하는 예인을 하고 있을 경우"], 1, "법규", "law")',
 'Q(21, "국제해상충돌방지규칙상 예인선이 그림의 등화를 표시하여야 하는 경우는? [그림: 백색 마스트등 3개, 현등, 선미등 및 황색 예인등]", ["길이 50미터 미만의 예인선이 예인선열의 길이 200미터 이하인 예인을 하고 있을 경우", "길이 50미터 이상의 예인선이 예인선열의 길이 200미터 이하인 예인을 하고 있을 경우", "길이 50미터 이상의 예인선이 예인선열의 길이 200미터를 초과하는 예인을 하고 있을 경우", "길이 100미터 이상의 예인선이 예인선열의 길이 300미터를 초과하는 예인을 하고 있을 경우"], 2, "법규", "law")')]
changed=False
for old,new in repls:
    if old in raw:
        raw=raw.replace(old,new,1); changed=True
    elif new not in raw:
        raise SystemExit('verified answer correction anchor not found')
if changed:
    enc=base64.b64encode(gzip.compress(raw.encode('utf-8'),compresslevel=9,mtime=0)).decode('ascii')
    text=text[:m.start(2)]+enc+text[m.end(2):]

# Let the normal explanation renderer use supplemental explanations only when no embedded explanation exists.
old="""  const e = baseId && window.MD_EXPLAIN[baseId];
  if(!e) return null;"""
new="""  const e = baseId && window.MD_EXPLAIN[baseId];
  if(!e){
    const fallback=(typeof window.get2026Navi3Session3Explain==='function')?window.get2026Navi3Session3Explain(q):null;
    if(fallback)return fallback;
    return null;
  }"""
if old in text:text=text.replace(old,new,1)
elif "get2026Navi3Session3Explain(q)" not in text:raise SystemExit('getExplain fallback anchor not found')

# Load the generic session-3 map, then the richer English override.
tag='<script src="explain-2026-navi3-3.js"></script>'
eng_tag='<script src="explain-2026-navi3-3-english.js"></script>'
if tag not in text:
    marker='<script src="convenience-controls.js"></script>'
    if marker in text:text=text.replace(marker,tag+'\n'+marker,1)
    elif '</body>' in text:text=text.replace('</body>',tag+'\n</body>',1)
    else:text += '\n'+tag+'\n'
if eng_tag not in text:
    if tag in text:text=text.replace(tag,tag+'\n'+eng_tag,1)
    elif '</body>' in text:text=text.replace('</body>',eng_tag+'\n</body>',1)
    else:text += '\n'+eng_tag+'\n'

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched 2026 navi3 session3 explanations, detailed English, and verified answers')
else:print('2026 session3 explanation patch already applied')
