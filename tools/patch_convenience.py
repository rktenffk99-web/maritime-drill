from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

tag='<script src="convenience-controls.js"></script>'
if tag not in text:
    marker='</body>'
    text=text.replace(marker,tag+'\n'+marker,1) if marker in text else text+'\n'+tag+'\n'

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('convenience script injected')
else:
    print('no convenience change needed')
