"""Idempotent integration after legacy generators; never rewrite embedded data."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
s=p.read_text(encoding='utf-8-sig')
for name in ('exam-sessions.js','drive-exam-journal.js'):
    s=re.sub(r'<script src="'+re.escape(name)+r'\?v=[^"]+"></script>\n?', '', s)
    s=s.replace('</body>',f'<script src="{name}?v=5.30"></script>\n</body>',1)
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
print('exam session v5.30 integration ready')
