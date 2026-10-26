"""Keep global learning shortcuts inside their active interaction context."""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text(encoding='utf-8-sig')
anchor = "document.addEventListener('keydown',function(e){\n  // 입력 포커스"
replacement = """document.addEventListener('keydown',function(e){
  // keyboard-context-v527: dialogs and native controls own their keyboard input.
  if(e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if((e.key==='Enter'||e.code==='NumpadEnter'||e.code==='Space'||e.key===' ')&&e.target?.closest?.('button,a[href],summary,[role="button"]'))return;
  // 입력 포커스"""
old_modal = "const modalOpen = !!document.getElementById('md-modal-wrap') || !!document.getElementById('_confirmDialog');"
new_modal = "const modalOpen = ['md-modal-wrap','_confirmDialog','md-report-modal','md-report-list-modal'].some(id=>document.getElementById(id));"
for old, new in [(anchor, replacement), (old_modal, new_modal)]:
    if new in text:
        continue
    if text.count(old) != 1:
        raise RuntimeError('missing or ambiguous keyboard anchor: ' + old[:100])
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('keyboard interaction context integration ready')
