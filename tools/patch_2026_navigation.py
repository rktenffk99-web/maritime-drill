from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

old="""  function ppTrainingYears(data){
    const all=(data.meta&&data.meta.years||[]).map(Number).sort((a,b)=>a-b);
    const partial=new Set((data.meta&&data.meta.partialYears||[]).map(Number));
    const complete=((data.meta&&data.meta.completeYears||[]).length?(data.meta.completeYears||[]).map(Number):all.filter(y=>!partial.has(y))).sort((a,b)=>a-b);
    return complete.slice(-5);
  }"""
new="""  function ppTrainingYears(data){
    const metaYears=(data.meta&&data.meta.years||[]).map(Number);
    const hitYears=[];
    (data.groups||[]).forEach(group=>(group.hits||[]).forEach(hit=>{const y=Number(hit.year);if(Number.isFinite(y))hitYears.push(y)}));
    const all=[...new Set([...metaYears,...hitYears])].sort((a,b)=>a-b);
    // 2026 is the current exam year. Include it even when the source marks it as a partial year.
    if(all.includes(2026))return all.filter(y=>y<=2026).slice(-5);
    const partial=new Set((data.meta&&data.meta.partialYears||[]).map(Number));
    const complete=((data.meta&&data.meta.completeYears||[]).length?(data.meta.completeYears||[]).map(Number):all.filter(y=>!partial.has(y))).sort((a,b)=>a-b);
    return complete.slice(-5);
  }"""
if old in text:text=text.replace(old,new,1)

anchor="  function ppItemKey(gradeId,groupId){return `${gradeId}|${groupId}`}"
if "function ppHas2026" not in text and anchor in text:
    text=text.replace(anchor,anchor+"\n  function ppHas2026(item){return !!(item&&Array.isArray(item.hits)&&item.hits.some(h=>Number(h.year)===2026))}",1)

text=text.replace(
"""    const freqRemaining=pool.filter(item=>item.count>=2&&!ppProgressFor(progress,item.key).firstPassDate);
    const allRemaining=pool.filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
    const final=dday!==null&&dday>=0&&dday<=finalDays;
    if(final)return {phase:'final',label:'시험 직전',dday,freqRemaining,allRemaining,candidates:freqRemaining,learningDays:Math.max(1,dday)};
    if(freqRemaining.length){""",
"""    const freqRemaining=pool.filter(item=>item.count>=2&&!ppProgressFor(progress,item.key).firstPassDate);
    const current2026Remaining=pool.filter(item=>ppHas2026(item)&&!ppProgressFor(progress,item.key).firstPassDate);
    const stage1Remaining=[...current2026Remaining,...freqRemaining.filter(item=>!ppHas2026(item))];
    const allRemaining=pool.filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
    const final=dday!==null&&dday>=0&&dday<=finalDays;
    if(final)return {phase:'final',label:'시험 직전 · 2026 전체 우선',dday,freqRemaining,current2026Remaining,allRemaining,candidates:stage1Remaining,learningDays:Math.max(1,dday)};
    if(stage1Remaining.length){""",1)
text=text.replace(
"return {phase:'stage1',label:'1단계 · 최근 5개년 빈출',dday,freqRemaining,allRemaining,candidates:freqRemaining,learningDays:stageDays};",
"return {phase:'stage1',label:'1단계 · 2026 전체 + 최근 5개년 빈출',dday,freqRemaining,current2026Remaining,allRemaining,candidates:stage1Remaining,learningDays:stageDays};",1)

text=text.replace(
"const compact={dailyCap:plan.dailyCap,finalDays:plan.finalDays,revision:plan.revision,grades:{}};",
"const compact={dailyCap:plan.dailyCap,finalDays:plan.finalDays,revision:plan.revision,assignmentPolicy:'2026-all-priority-v1',grades:{}};",1)

text=text.replace(
"candidates.sort((a,b)=>b.count-a.count||b.latest-a.latest);",
"candidates.sort((a,b)=>(ppHas2026(b)?1:0)-(ppHas2026(a)?1:0)||b.count-a.count||b.latest-a.latest);",1)
text=text.replace(
"return da-db||b.count-a.count||b.latest-a.latest;",
"return da-db||(ppHas2026(b)?1:0)-(ppHas2026(a)?1:0)||b.count-a.count||b.latest-a.latest;",1)

next_anchor="  window.nextNavigatorPassPlanQuestion=function(){"
if "window.prevNavigatorPassPlanQuestion=function()" not in text and next_anchor in text:
    prev="""  window.prevNavigatorPassPlanQuestion=function(){
    if(currentMode!=='pass-plan-session'||planSessionIdx<=0)return;
    planSessionIdx--;
    ppSavePassSessionCheckpoint(planSessionIdx);
    renderNavigatorPassPlanCard();
  };
"""
    text=text.replace(next_anchor,prev+next_anchor,1)

old_btn="""      <button class=\"btn btn-accent\" style=\"width:100%;margin-top:12px;background:${color};border-color:${color}\" ${canNext?'':'disabled'} onclick=\"nextNavigatorPassPlanQuestion()\">${planSessionIdx+1===planSessionQueue.length?'결과 보기':'다음 '+icon('arrowRight',14)}</button>"""
new_btn="""      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px\"><button class=\"btn btn-outline\" ${planSessionIdx>0?'':'disabled'} onclick=\"prevNavigatorPassPlanQuestion()\">${icon('arrowLeft',14)} 이전</button><button class=\"btn btn-accent\" style=\"background:${color};border-color:${color}\" ${canNext?'':'disabled'} onclick=\"nextNavigatorPassPlanQuestion()\">${planSessionIdx+1===planSessionQueue.length?'결과 보기':'다음 '+icon('arrowRight',14)}</button></div>"""
if old_btn in text:text=text.replace(old_btn,new_btn,1)

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched 2026 priority and navigation')
else:
    print('no change needed')
