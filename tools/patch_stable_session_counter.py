from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='stable-session-counter-v1'

# Keep the visible "today homework" denominator fixed to the original assignment.
# Same-day confirmation copies are shown separately instead of inflating X/Y.
if 'function ppSessionBaseTotal()' not in text:
    anchor="""  function ppSessionLabel(){
    if(planSessionKind==='today-wrong')return '오늘 오답';
    if(planSessionKind==='frequent-wrong')return '자주 틀리는 문제';
    return '오늘의 숙제';
  }
"""
    if anchor not in text:
        raise SystemExit('ppSessionLabel anchor not found')
    helper="""
  function ppSessionBaseTotal(){ // stable-session-counter-v1
    if(typeof planSessionKind==='undefined'||planSessionKind!=='today')return planSessionQueue.length;
    return planSessionQueue.reduce((n,q)=>n+((q&&q._sameDayRecheck)?0:1),0);
  }
  function ppSessionBasePosition(){
    if(typeof planSessionKind==='undefined'||planSessionKind!=='today')return planSessionIdx+1;
    let n=0;
    for(let i=0;i<=planSessionIdx&&i<planSessionQueue.length;i++)if(!(planSessionQueue[i]&&planSessionQueue[i]._sameDayRecheck))n++;
    const total=ppSessionBaseTotal();
    return total?Math.max(1,Math.min(total,n)):0;
  }
  function ppSessionRecheckStatusHtml(){
    if(typeof planSessionKind==='undefined'||planSessionKind!=='today')return '';
    const current=planSessionQueue[planSessionIdx];
    const future=planSessionQueue.slice(planSessionIdx+1).reduce((n,q)=>n+((q&&q._sameDayRecheck)?1:0),0);
    if(current&&current._sameDayRecheck){
      return `<span style=\"display:block;font-size:11px;font-weight:600;color:#7c3aed;margin-top:2px\">재확인 중${future?` · 예정 ${future}문제`:''}</span>`;
    }
    return future?`<span style=\"display:block;font-size:11px;font-weight:600;color:#7c3aed;margin-top:2px\">재확인 예정 ${future}문제</span>`:'';
  }
""".rstrip()
    text=text.replace(anchor,anchor+helper+'\n',1)

old='${planSessionIdx+1}/${planSessionQueue.length}'
new='${ppSessionBasePosition()}/${ppSessionBaseTotal()}${ppSessionRecheckStatusHtml()}'
if old in text:
    text=text.replace(old,new,1)
elif new not in text:
    raise SystemExit('session progress counter not found')

if MARKER not in text:
    raise SystemExit('stable session counter marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched stable session counter')
else:
    print('stable session counter already patched')
