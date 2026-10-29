"""Restrict 2nd officer past papers to merchant only, without deleting source data."""
from pathlib import Path
path=Path(__file__).resolve().parents[1] / 'index.html'
s=path.read_text(encoding='utf-8-sig')
old1="  return Object.values(window.MD_PAST).filter(p => p.meta && shorts.includes(p.meta.gradeShort));"
new1="  return Object.values(window.MD_PAST).filter(p => p.meta && shorts.includes(p.meta.gradeShort) && (subjectId !== 'navi2' || p.meta.gradeShort === 'navi2' || p.meta.gradeShort === 'navi2d')); // navi2-merchant-only-v537"
if new1 not in s:
    if s.count(old1)!=1: raise SystemExit('navi2 subject filter anchor missing')
    s=s.replace(old1,new1,1)
old2="function getPastExamsByBase(baseShort, variant){\n  if(!window.MD_PAST) return [];\n"
new2=old2+"  if(baseShort === 'navi2') variant = '상선'; // navi2-merchant-only-v537\n"
if new2 not in s:
    if s.count(old2)!=1: raise SystemExit('navi2 base filter anchor missing')
    s=s.replace(old2,new2,1)
path.write_text(s,encoding='utf-8')
print('2nd officer source retrieval now merchant-only')
