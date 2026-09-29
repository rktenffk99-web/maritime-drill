from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

visual_tag='<script src="visual-explanations.js"></script>'
convenience_tag='<script src="convenience-controls.js"></script>'

# Keep the visual script before convenience-controls so the current loader becomes a no-op
# after the next normal rebuild, while already-deployed index.html files still work via
# the loader appended to convenience-controls.js.
if 'src="visual-explanations.js' not in text:
    if convenience_tag in text:
        text=text.replace(convenience_tag,visual_tag+'\n'+convenience_tag,1)
    else:
        marker='</body>'
        block=visual_tag+'\n'+convenience_tag
        text=text.replace(marker,block+'\n'+marker,1) if marker in text else text+'\n'+block+'\n'
elif 'src="convenience-controls.js' not in text:
    marker='</body>'
    text=text.replace(marker,convenience_tag+'\n'+marker,1) if marker in text else text+'\n'+convenience_tag+'\n'

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('convenience/visual scripts injected')
else:
    print('no convenience/visual change needed')
