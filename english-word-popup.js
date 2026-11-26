// english-word-popup-v547: tap (touch) or hover (mouse) an English word in a
// question or choice to see its meaning in this sentence and its basic sense.
// Read-only: never changes questions, answers, identity or learning state.
(function(global){
  'use strict';
  const H=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const WORD=/[A-Za-z]+(?:['’][A-Za-z]+)?/g;
  function data(){return global.MDEnglishWordStudyData||null;}
  function eligible(q){
    return !!(q && q['과목']==='영어' && /^(navi2|navi3)$/.test(q._short||q._gradeShort||'') && data());
  }
  function key(q){return `${q._year}|${q._short||q._gradeShort}|${q._session||q['회차']}|영어|${q['번호']}`;}
  function normal(word){return String(word).replace(/’/g,"'").toLowerCase();}
  function lookup(q,word){
    const d=data();if(!d)return null;
    let w=normal(word);
    const k=q?key(q):'';
    const find=x=>({context:d.context?.[k]?.[x]||'',basic:d.local?.[k]?.[x]||d.lexicon?.[x]?.[0]||'',entry:d.lexicon?.[x]});
    let hit=find(w);
    if(!hit.context&&!hit.basic&&w.includes("'")){w=w.split("'")[0];hit=find(w);}
    if(!hit.context&&!hit.basic)return null;
    const lex=hit.entry?.[1]||'';
    const hangul=d.hangulReadings?.[w]||'';
    const reading=hangul&&lex.startsWith('/')?hangul+' '+lex:(lex||hangul);
    return {word:w,context:hit.context,basic:hit.basic,reading};
  }
  // Same escaping as escapeHtml in index.html; only adds word spans.
  function html(q,raw){
    const value=String(raw==null?'':raw);
    if(!eligible(q))return H(value);
    // A render replaces the old word spans, so an open popup would point at nothing.
    if(anchor&&!anchor.isConnected)hide();
    currentQ=q;
    let out='',last=0;
    value.replace(WORD,(m,offset)=>{
      out+=H(value.slice(last,offset));
      out+=lookup(q,m)?`<span class="mdw" data-mdw="${H(normal(m))}">${H(m)}</span>`:H(m);
      last=offset+m.length;
      return m;
    });
    return out+H(value.slice(last));
  }
  const hoverDevice=()=>!!(global.matchMedia&&global.matchMedia('(hover:hover) and (pointer:fine)').matches);
  function hint(q){
    if(!eligible(q))return '';
    const how=hoverDevice()?'단어에 마우스를 올리면':'단어를 누르면';
    const pick=hoverDevice()?'':' 보기를 고를 때는 ㉮㉯㉰㉱ 기호나 빈 곳을 누르세요.';
    return `<div data-mdw-hint style="font-size:12px;color:#0369A1;margin:-6px 0 12px">${how} 뜻이 나옵니다.${pick}</div>`;
  }
  // Popup state. Spans carry only the word; the question is the one most
  // recently rendered through html().
  let currentQ=null,box=null,anchor=null,hoverTimer=null;
  function ensureStyle(){
    if(!global.document||document.getElementById('mdw-style'))return;
    const st=document.createElement('style');st.id='mdw-style';
    st.textContent='.mdw{cursor:help;border-bottom:1px dotted rgba(3,105,161,.45);border-radius:2px}.mdw.mdw-on{background:#E0F2FE}'+
      '#mdw-pop{position:fixed;z-index:10000;max-width:min(320px,92vw);background:#fff;border:1px solid #7DD3FC;border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.18);padding:10px 12px;font-size:14px;line-height:1.55;color:#0F172A;text-align:left;font-weight:400}'+
      '#mdw-pop .mdw-w{font-weight:800;font-size:15px}#mdw-pop .mdw-r{color:#64748B;font-size:12px;margin-left:6px}'+
      '#mdw-pop .mdw-c{margin-top:6px}#mdw-pop .mdw-b{margin-top:4px;color:#475569;font-size:13px}';
    document.head.appendChild(st);
  }
  function hide(){
    if(box){box.remove();box=null;}
    if(anchor){anchor.classList.remove('mdw-on');anchor=null;}
  }
  function show(el){
    const info=lookup(currentQ,el.getAttribute('data-mdw'));
    if(!info)return;
    hide();ensureStyle();
    anchor=el;el.classList.add('mdw-on');
    box=document.createElement('div');box.id='mdw-pop';box.setAttribute('role','tooltip');
    let inner=`<div><span class="mdw-w">${H(el.textContent)}</span>${info.reading?`<span class="mdw-r">${H(info.reading)}</span>`:''}</div>`;
    if(info.context)inner+=`<div class="mdw-c"><b style="color:#0369A1">이 문장에서:</b> ${H(info.context)}</div>`;
    if(info.basic)inner+=`<div class="${info.context?'mdw-b':'mdw-c'}">${info.context?'기본: ':''}${H(info.basic)}</div>`;
    box.innerHTML=inner;
    document.body.appendChild(box);
    const r=el.getBoundingClientRect(),b=box.getBoundingClientRect();
    const vw=global.innerWidth,vh=global.innerHeight;
    let left=Math.min(Math.max(8,r.left+r.width/2-b.width/2),vw-b.width-8);
    let top=r.bottom+8;
    if(top+b.height>vh-8)top=Math.max(8,r.top-b.height-8);
    box.style.left=left+'px';box.style.top=top+'px';
  }
  function bind(){
    if(!global.document||global.__mdwBound)return;global.__mdwBound=true;
    // Touch: a tap on a word shows its meaning and does not select the choice.
    document.addEventListener('click',e=>{
      const el=e.target&&e.target.closest&&e.target.closest('.mdw');
      if(el&&!hoverDevice()){
        e.preventDefault();e.stopPropagation();
        if(anchor===el)hide();else show(el);
        return;
      }
      // A tap on the popup only closes it, so nothing underneath is selected by accident.
      if(box&&e.target.closest&&e.target.closest('#mdw-pop')){e.preventDefault();e.stopPropagation();hide();return;}
      if(box)hide();
    },true);
    // Mouse: hovering shows the meaning; clicking still selects as before.
    document.addEventListener('mouseover',e=>{
      if(!hoverDevice())return;
      const el=e.target&&e.target.closest&&e.target.closest('.mdw');
      clearTimeout(hoverTimer);
      if(el){if(el!==anchor)hoverTimer=setTimeout(()=>show(el),120);}
      else if(box)hoverTimer=setTimeout(hide,80);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
    global.addEventListener('scroll',hide,true);
    global.addEventListener('resize',hide);
  }
  if(global.document){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  }
  global.MDEnglishWordPopup={html,hint,lookup,eligible,show,hide};
})(window);
