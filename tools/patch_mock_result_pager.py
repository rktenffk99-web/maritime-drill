"""Show mock-exam wrong-answer analysis one question at a time."""
from pathlib import Path

p=Path("index.html")
text=p.read_text(encoding="utf-8-sig")
original=text
MARKER="md-past-result-pager-v1"

if MARKER not in text:
    result_start=text.index("function renderPastResult(){")
    result_end=text.index("\nfunction escapeHtml(",result_start)

    helper=r'''// md-past-result-pager-v1
function mdPastResultReviewClamp(index,total){
  const n=Math.max(0,Number(total)||0);
  if(!n)return 0;
  return Math.max(0,Math.min(n-1,Number(index)||0));
}
window.showPastResultReview=function(index){
  if(currentMode!=='past-result')return;
  const state=window.__mdPastResultReview;
  if(!state||!Array.isArray(state.indices)||!state.indices.length)return;
  const pos=mdPastResultReviewClamp(index,state.indices.length);
  state.index=pos;
  const sourceIndex=state.indices[pos],q=pastQueue[sourceIndex],ans=pastAnswers[sourceIndex];
  if(!q)return;
  const slot=document.getElementById('md-past-review-slot');
  const progress=document.getElementById('md-past-review-progress');
  const prev=document.getElementById('md-past-review-prev');
  const next=document.getElementById('md-past-review-next');
  if(!slot)return;
  const markers=['㉮','㉯','㉰','㉱'],choices=Array.isArray(q['선택지'])?q['선택지']:[];
  const answered=Number.isInteger(ans)&&ans>=0&&ans<choices.length;
  const correct=Number(q['정답']);
  const year=q._year||pastYear||'',session=q['회차']||q._session||pastSession||'';
  const meta=[
    year?year+'년':'',
    session?session+'회':'',
    q['과목']||'',
    q['번호']!==undefined&&q['번호']!==null?'Q'+q['번호']:''
  ].filter(Boolean).join(' · ');
  slot.innerHTML=`
    <div class="md-past-review-question" data-review-index="${pos}" data-source-index="${sourceIndex}">
      <div style="font-size:12px;color:var(--textDim);margin-bottom:7px">${escapeHtml(meta)}</div>
      <div style="font-size:15px;line-height:1.65;font-weight:700;color:var(--text);margin-bottom:10px">${escapeHtml(q['문제']||'')}</div>
      <div style="font-size:13px;line-height:1.55;color:#DC2626;margin-bottom:5px">내 답: ${answered?(markers[ans]||'')+' '+escapeHtml(pastChoiceText(choices[ans])):'(미응답)'}</div>
      <div style="font-size:13px;line-height:1.55;color:#059669">정답: ${(markers[correct]||'')} ${choices[correct]!==undefined?escapeHtml(pastChoiceText(choices[correct])):''}</div>
      <div style="margin-top:10px">${renderExplainBlock(q,{compact:true})}</div>
    </div>`;
  if(progress)progress.textContent=(pos+1)+' / '+state.indices.length;
  if(prev)prev.disabled=pos<=0;
  if(next)next.disabled=pos>=state.indices.length-1;
};
window.stepPastResultReview=function(delta){
  const state=window.__mdPastResultReview;
  if(!state)return;
  window.showPastResultReview((Number(state.index)||0)+(Number(delta)||0));
};

'''
    text=text[:result_start]+helper+text[result_start:]
    result_start=text.index("function renderPastResult(){")
    result_end=text.index("\nfunction escapeHtml(",result_start)

    section_start=text.index("    ${wrongs.length ? `",result_start)
    section_end=text.index("    ${wrongs.length?'<button",section_start)
    new_section=r'''    ${wrongs.length ? `
      <div class="card" id="md-past-review-shell">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px">
          <div style="font-size:14px;font-weight:800;color:var(--text)">문제 분석 · 오답 ${wrongs.length}개</div>
          <div id="md-past-review-progress" style="font-size:12px;font-weight:800;color:${gColor};white-space:nowrap">1 / ${wrongs.length}</div>
        </div>
        <div id="md-past-review-slot"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
          <button class="btn btn-outline" id="md-past-review-prev" aria-keyshortcuts="ArrowLeft" onclick="stepPastResultReview(-1)">← 이전 문제</button>
          <button class="btn btn-outline" id="md-past-review-next" aria-keyshortcuts="ArrowRight" onclick="stepPastResultReview(1)">다음 문제 →</button>
        </div>
      </div>
    ` : `
      <div class="card" style="text-align:center;background:#D1FAE5">
          <div style="font-size:18px;font-weight:800;color:#065F46">모두 정답</div>
      </div>
    `}
'''
    text=text[:section_start]+new_section+text[section_end:]

    result_start=text.index("function renderPastResult(){")
    result_end=text.index("\nfunction escapeHtml(",result_start)
    chunk=text[result_start:result_end]
    tail="  `;\n}"
    pos=chunk.rfind(tail)
    if pos<0:
        raise SystemExit("mock result pager: result template tail not found")
    replacement="""  `;
  if(wrongs.length){
    window.__mdPastResultReview={indices:wrongs.map(row=>row.i),index:0};
    if(typeof window.showPastResultReview==='function')window.showPastResultReview(0);
  }else{
    window.__mdPastResultReview=null;
  }
}"""
    chunk=chunk[:pos]+replacement+chunk[pos+len(tail):]
    text=text[:result_start]+chunk+text[result_end:]

if MARKER not in text:
    raise SystemExit("mock result pager marker missing")

if text!=original:
    p.write_text(text,encoding="utf-8")
    print("mock result one-question pager applied")
else:
    print("mock result pager already applied")
