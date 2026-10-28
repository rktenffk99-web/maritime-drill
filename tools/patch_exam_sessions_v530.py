"""Idempotent integration after legacy generators; never rewrite embedded data."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
s=p.read_text(encoding='utf-8-sig')
version=re.search(r"const APP_VERSION = '([^']+)'",s).group(1)
delete_styles='''.md-exam-resume-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.md-exam-resume-heading b{flex:1;min-width:0}
.md-exam-delete{display:flex;align-items:center;justify-content:center;flex:0 0 40px;width:40px;height:40px;border:1px solid #FECACA;border-radius:10px;background:#FEF2F2;color:#B91C1C;font-size:25px;line-height:1;cursor:pointer}
.md-exam-delete:hover,.md-exam-delete:focus-visible{background:#FEE2E2;border-color:#F87171;outline:2px solid #FCA5A5;outline-offset:2px}
'''
if '.md-exam-resume-heading{' not in s:
    anchor='.btn-outline,.btn-outline-dim{border-width:1.5px}\n'
    assert s.count(anchor)==1, 'missing saved-exam delete style anchor'
    s=s.replace(anchor,anchor+delete_styles,1)
for name in ('exam-sessions.js','drive-exam-journal.js'):
    s=re.sub(r'<script src="'+re.escape(name)+r'\?v=[^"]+"></script>\n?', '', s)
    s=s.replace('</body>',f'<script src="{name}?v={version}"></script>\n</body>',1)
old='''    if(pastProgressMeta){
      const state=capturePastProgressState();'''
new='''    if(window.__mdExamSessions){
      Object.assign(items,window.__mdExamSessions.liveItems());
    }else if(pastProgressMeta){
      const state=capturePastProgressState();'''
if new not in s:
    assert old in s
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print(f'exam session v{version} integration ready')
