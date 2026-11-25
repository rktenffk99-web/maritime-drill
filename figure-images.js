// figure-images-v541: restore pictures that PDF text extraction dropped.
// Images are crops of the official booklets (한국해양수산연수원 기출문제집).
// A question with a picture is usable again (see learning-integrity.js);
// choices that were pictures get a text label pointing at the picture.
(function(global){
  'use strict';
  if(global.__mdFigureImages)return;
  // Ordinals, not markers: choice buttons may be shuffled and relabelled.
  const ORDINALS=['첫 번째','두 번째','세 번째','네 번째'];
  const SOURCE='출처: 한국해양수산연수원 해기사 정기시험 기출문제집';
  const data=()=>global.__MD_FIGURE_IMAGE_DATA||{};
  function applyExam(exam){
    if(!exam||!exam.meta||!Array.isArray(exam.questions))return exam;
    const all=data(),id=exam.meta.id;
    for(const q of exam.questions){
      if(!q||q._figureImage)continue;
      const row=all[`${id}|${q['과목']}|${q['번호']}`];
      if(!row)continue;
      q._figureImage=row.src;q._figureSize=[row.w,row.h];
      if(row.choices&&Array.isArray(q['선택지'])){
        q['선택지']=q['선택지'].map((c,i)=>String(c==null?'':c).trim()?c:`그림의 ${ORDINALS[i]||i+1+'번째'} 보기`);
      }
    }
    return exam;
  }
  function applyAll(){
    const past=global.MD_PAST;if(!past)return;
    for(const exam of Object.values(past))applyExam(exam);
  }
  function escapeAttr(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
  function html(q){
    if(!q||!q._figureImage||!/^data:image\/(?:webp|png|jpeg);base64,/.test(q._figureImage))return '';
    const size=Array.isArray(q._figureSize)?q._figureSize:[0,0];
    return `<figure class="md-question-figure" style="margin:0 0 14px;text-align:center">`
      +`<img src="${escapeAttr(q._figureImage)}" alt="문제 원문 그림" loading="lazy" decoding="async"`
      +`${size[0]?` width="${Number(size[0])}" height="${Number(size[1])}"`:''}`
      +` style="max-width:100%;height:auto;border:1px solid var(--border,#CBD5E1);border-radius:8px;background:#fff">`
      +`<figcaption style="font-size:11px;color:var(--textMuted,#94A3B8);margin-top:4px">원문 그림 · ${SOURCE}</figcaption></figure>`;
  }
  function wrap(name,after){
    const original=global[name];
    if(typeof original!=='function'||original.__mdFigureImages)return;
    const wrapped=original.constructor&&original.constructor.name==='AsyncFunction'
      ?async function(){const result=await original.apply(this,arguments);after(result);return result}
      :function(){const result=original.apply(this,arguments);after(result);return result};
    wrapped.__mdFigureImages=true;global[name]=wrapped;
  }
  function install(){
    // Lazy past-paper loads and direct lookups both pass through these.
    wrap('getPastExam',exam=>applyExam(exam));
    wrap('ensurePastDataForSubject',()=>applyAll());
    applyAll();
  }
  global.__mdFigureImages={applyExam,applyAll,html,source:SOURCE};
  install();
  if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
})(window);
