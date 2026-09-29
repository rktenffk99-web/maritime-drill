// Maritime Drill visual explanations prototype
// Adds compact SVG diagrams after an answer is revealed. No question data is modified.
(function(){
  'use strict';
  if(window.__mdVisualExplanationsV1)return;
  window.__mdVisualExplanationsV1=true;

  const STYLE_ID='md-visual-explanations-style';
  const CARD_ID='md-visual-explanation';
  const LETTERS=['가','나','다','라'];
  const SYMBOLS=['㉠','㉡','㉢','㉣'];
  const CIRCLED=['①','②','③','④'];

  function escapeText(s){
    return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function appRoot(){return document.getElementById('app')}
  function choiceButtons(root){
    const card=root&&root.querySelector('.card');
    if(!card)return [];
    return [...card.querySelectorAll('button')].filter(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      const text=(btn.textContent||'').trim();
      if(onclick&&/(?:answer|choose|select)/i.test(onclick)&&!/(?:next|prev|back|home|report|bookmark|restart)/i.test(onclick))return true;
      return /^(?:[가나다라]|[㉠㉡㉢㉣]|[①②③④])(?:\s|\.|\)|:|$)/.test(text);
    });
  }
  function findFeedback(root){
    for(const el of root.querySelectorAll('div')){
      const t=(el.textContent||'').trim();
      if(el.children.length===0&&(t==='정답'||/^오답\s*·\s*정답/.test(t)))return el;
    }
    return null;
  }
  function findQuestionCounter(root){
    const re=/(?:실전예측|모의|문제)\s*(\d+)\s*\/\s*(\d+)/;
    for(const el of root.querySelectorAll('div,span')){
      const t=(el.textContent||'').trim();
      if(t.length<80&&re.test(t))return {el,match:t.match(re)};
    }
    return null;
  }
  function cleanChoiceText(s){
    return String(s||'').trim().replace(/^(?:[가나다라]|[㉠㉡㉢㉣]|[①②③④])\s*[\.)：:]?\s*/,'').trim();
  }
  function questionText(root,buttons){
    const first=buttons[0],card=root.querySelector('.card');
    if(!first||!card)return '';
    let n=first.parentElement&&first.parentElement.previousElementSibling;
    if(n){const t=(n.textContent||'').trim();if(t)return t}
    const children=[...card.children],holder=children.find(el=>el===first||el.contains(first)),idx=children.indexOf(holder);
    for(let i=idx-1;i>=0;i--){
      const el=children[i],t=(el.textContent||'').trim();
      if(t&&!el.querySelector('button')&&!el.classList.contains('tag'))return t;
    }
    return '';
  }
  function planCorrectIndex(root){
    try{
      const c=findQuestionCounter(root);if(!c||typeof planSessionQueue==='undefined'||!Array.isArray(planSessionQueue))return null;
      const i=Number(c.match[1])-1,q=planSessionQueue[i];
      const ans=q&&q['정답'];
      return Number.isInteger(ans)&&ans>=0&&ans<4?ans:null;
    }catch(e){return null}
  }
  function feedbackCorrectIndex(feedback){
    const t=(feedback&&feedback.textContent||'').trim();
    const m=t.match(/정답\s*([가나다라㉠㉡㉢㉣①②③④])/);if(!m)return null;
    const ch=m[1];
    let i=LETTERS.indexOf(ch);if(i<0)i=SYMBOLS.indexOf(ch);if(i<0)i=CIRCLED.indexOf(ch);
    return i>=0?i:null;
  }
  function greenChoiceIndex(buttons){
    function rgb(s){const m=String(s||'').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);return m?[+m[1],+m[2],+m[3]]:null}
    let best=-1,bestScore=20;
    buttons.forEach((btn,i)=>{
      const cs=getComputedStyle(btn),colors=[rgb(cs.backgroundColor),rgb(cs.borderTopColor),rgb(cs.color)].filter(Boolean);
      const score=Math.max(...colors.map(([r,g,b])=>g-Math.max(r,b)),0);
      if(score>bestScore){bestScore=score;best=i}
    });
    return best>=0?best:null;
  }
  function context(){
    const root=appRoot();if(!root)return null;
    const buttons=choiceButtons(root);if(buttons.length<2)return null;
    const feedback=findFeedback(root);if(!feedback)return null; // never reveal visuals before grading
    const explanation=feedback.nextElementSibling&&feedback.nextElementSibling.id==='md-explain-toggle'
      ?feedback.nextElementSibling.nextElementSibling:feedback.nextElementSibling;
    if(!explanation)return null;
    const q=questionText(root,buttons);
    let correctIndex=planCorrectIndex(root);if(correctIndex==null)correctIndex=feedbackCorrectIndex(feedback);if(correctIndex==null)correctIndex=greenChoiceIndex(buttons);
    const answer=correctIndex!=null&&buttons[correctIndex]?cleanChoiceText(buttons[correctIndex].textContent):'';
    return {root,buttons,feedback,explanation,question:q,answer};
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
      #${CARD_ID}{margin:12px 0 2px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#0f172a}
      #${CARD_ID} .mdv-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}
      #${CARD_ID} .mdv-title{font-size:13px;font-weight:900}
      #${CARD_ID} .mdv-badge{font-size:10px;font-weight:800;padding:4px 7px;border-radius:999px;background:#e2e8f0;color:#475569}
      #${CARD_ID} .mdv-grid{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:12px;align-items:center}
      #${CARD_ID} .mdv-svg{width:100%;max-width:180px;height:auto;display:block;margin:auto}
      #${CARD_ID} .mdv-name{font-size:14px;font-weight:900;margin-bottom:4px}
      #${CARD_ID} .mdv-note{font-size:12px;line-height:1.55;color:#475569}
      #${CARD_ID} .mdv-memory{margin-top:7px;padding:7px 9px;border-radius:8px;background:#fff;border:1px solid #e2e8f0;font-size:12px;font-weight:800}
      @media(max-width:520px){#${CARD_ID} .mdv-grid{grid-template-columns:1fr}#${CARD_ID} .mdv-svg{max-width:160px}}
      @media(prefers-color-scheme:dark){#${CARD_ID}{background:#111827;color:#f8fafc;border-color:#475569}#${CARD_ID} .mdv-note{color:#cbd5e1}#${CARD_ID} .mdv-memory{background:#0f172a;border-color:#475569}#${CARD_ID} .mdv-badge{background:#334155;color:#e2e8f0}}
    `;
    document.head.appendChild(s);
  }

  function svgFrame(inner,label){
    return `<svg class="mdv-svg" viewBox="0 0 180 150" role="img" aria-label="${escapeText(label)}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="178" height="148" rx="12" fill="white" stroke="#cbd5e1"/>
      ${inner}
    </svg>`;
  }
  function ball(x,y,r=13){return `<circle cx="${x}" cy="${y}" r="${r}" fill="#111827"/>`}
  function diamond(x,y,w=26){const h=w/2;return `<path d="M ${x} ${y-h} L ${x+h} ${y} L ${x} ${y+h} L ${x-h} ${y} Z" fill="#111827"/>`}
  function cone(x,y,apexDown=true){
    return apexDown?`<path d="M ${x-16} ${y-12} L ${x+16} ${y-12} L ${x} ${y+15} Z" fill="#111827"/>`:`<path d="M ${x} ${y-15} L ${x+16} ${y+12} L ${x-16} ${y+12} Z" fill="#111827"/>`;
  }
  function cylinder(x,y){return `<rect x="${x-13}" y="${y-21}" width="26" height="42" rx="3" fill="#111827"/>`}
  function light(x,y,color){return `<circle cx="${x}" cy="${y}" r="10" fill="${color}" stroke="#111827" stroke-width="1.5"/>`}
  function divider(){return `<line x1="90" y1="18" x2="90" y2="132" stroke="#e2e8f0" stroke-width="1.5"/><text x="45" y="140" text-anchor="middle" font-size="10" fill="#64748b">주간</text><text x="135" y="140" text-anchor="middle" font-size="10" fill="#64748b">야간</text>`}
  function dayNight(day,night,label){return svgFrame(`${divider()}${day}${night}`,label)}

  const diagrams={
    nuc(){return {key:'nuc',name:'조종불능선 (NUC)',svg:dayNight(ball(45,54)+ball(45,92),light(135,54,'#ef4444')+light(135,92,'#ef4444'),'조종불능선: 주간 검은 공 2개, 야간 적색 전주등 2개'),note:'항행 중 조종불능선은 가장 잘 보이는 곳에 둥근꼴 2개를 수직으로 표시합니다. 야간에는 적색 전주등 2개를 수직으로 표시합니다.',memory:'공 2개 ↔ 빨강 2개'}},
    ram(){return {key:'ram',name:'운전제한선 (RAM)',svg:dayNight(ball(45,42,11)+diamond(45,73,24)+ball(45,104,11),light(135,42,'#ef4444')+light(135,73,'#ffffff')+light(135,104,'#ef4444'),'운전제한선: 공-마름모-공, 적-백-적'),note:'운전제한선의 기본 식별 형상은 공-마름모-공이며, 야간 기본 식별등은 적-백-적의 수직 배열입니다.',memory:'공-마름모-공 ↔ 적-백-적'}},
    cbd(){return {key:'cbd',name:'흘수제약선 (CBD)',svg:dayNight(cylinder(45,73),light(135,42,'#ef4444')+light(135,73,'#ef4444')+light(135,104,'#ef4444'),'흘수제약선: 원통, 적색 전주등 3개'),note:'흘수제약선은 국제규칙에서 원통형 형상물 또는 적색 전주등 3개를 추가로 표시할 수 있습니다. 동력선의 기본 등화도 함께 고려합니다.',memory:'원통 ↔ 빨강 3개'}},
    anchor(){return {key:'anchor',name:'정박선',svg:svgFrame(`${ball(90,62,15)}<path d="M35 105 H145" stroke="#94a3b8" stroke-width="3"/><text x="90" y="125" text-anchor="middle" font-size="11" fill="#64748b">정박: 검은 공 1개</text>`,'정박선 주간 형상물: 검은 공 1개'),note:'정박선의 대표적인 주간 형상물은 가장 잘 보이는 곳의 검은 공 1개입니다.',memory:'정박 = 공 1개'}},
    aground(){return {key:'aground',name:'좌초선',svg:dayNight(ball(45,38,10)+ball(45,73,10)+ball(45,108,10),light(135,55,'#ef4444')+light(135,91,'#ef4444'),'좌초선: 공 3개, 적색 전주등 2개와 정박등'),note:'좌초선은 주간에 검은 공 3개를 수직으로 표시합니다. 야간에는 정박등에 더해 적색 전주등 2개를 수직으로 표시합니다.',memory:'좌초 = 공 3개'}},
    fishing(){return {key:'fishing',name:'어로 종사선',svg:dayNight(cone(45,57,true)+cone(45,89,false),light(135,55,'#ef4444')+light(135,91,'#ffffff'),'어로 종사선: 원뿔 2개 꼭짓점 맞대기, 적-백'),note:'트롤 이외의 어로 종사선은 원뿔 2개의 꼭짓점을 서로 맞댄 형상물을 표시합니다. 야간 기본 식별등은 적-백입니다.',memory:'어로 = 원뿔 꼭짓점 맞대기'}},
    trawling(){return {key:'trawling',name:'트롤어선',svg:dayNight(cone(45,57,true)+cone(45,89,false),light(135,55,'#22c55e')+light(135,91,'#ffffff'),'트롤어선: 원뿔 2개 꼭짓점 맞대기, 녹-백'),note:'트롤어선도 주간에는 원뿔 2개의 꼭짓점을 서로 맞댑니다. 야간 기본 식별등은 녹-백입니다.',memory:'트롤 = 녹-백'}},
    tow200(){return {key:'tow200',name:'예인 길이 200m 초과',svg:svgFrame(`${diamond(90,64,42)}<path d="M35 110 H145" stroke="#94a3b8" stroke-width="3"/><text x="90" y="130" text-anchor="middle" font-size="11" fill="#64748b">200m 초과 → 마름모</text>`,'예인 길이 200미터 초과: 마름모 형상물'),note:'예인의 길이가 선미부터 피예인물 끝까지 200m를 초과하면 마름모꼴 형상물을 가장 잘 보이는 곳에 표시합니다.',memory:'예인 200m 초과 = 마름모'}},
    sailMotor(){return {key:'sail-motor',name:'범선이 기관도 사용하는 경우',svg:svgFrame(`${cone(90,66,true)}<path d="M40 112 H140" stroke="#94a3b8" stroke-width="3"/><text x="90" y="132" text-anchor="middle" font-size="11" fill="#64748b">꼭짓점 아래</text>`,'범선이 기관을 사용하는 경우: 꼭짓점이 아래인 원뿔'),note:'범선이 동시에 기관으로 추진하는 경우에는 선수 가까이에서 꼭짓점이 아래를 향한 원뿔 형상물을 표시합니다.',memory:'범선 + 기관 = 아래로 향한 원뿔'}},
    mine(){return {key:'mine',name:'기뢰제거 작업선',svg:svgFrame(`${ball(90,43,11)+ball(55,88,11)+ball(125,88,11)}<path d="M90 53 V105 M55 99 H125" stroke="#94a3b8" stroke-width="3"/><text x="90" y="130" text-anchor="middle" font-size="11" fill="#64748b">상부 1 + 양쪽 2</text>`,'기뢰제거 작업선: 상부 1개와 양쪽 2개의 검은 공'),note:'기뢰제거 작업선은 전마스트 부근 1개와 전야드 양 끝에 각각 1개, 총 3개의 공을 표시합니다.',memory:'기뢰제거 = 삼각 배치 공 3개'}},
    dredging(){return {key:'dredging',name:'준설·수중작업선의 통과측',svg:svgFrame(`${ball(42,52,9)+ball(42,86,9)+diamond(138,52,22)+diamond(138,86,22)}<text x="42" y="120" text-anchor="middle" font-size="10" fill="#b91c1c">장애측</text><text x="138" y="120" text-anchor="middle" font-size="10" fill="#047857">통과측</text>`,'준설선: 장애측 공 2개, 통과측 마름모 2개'),note:'준설·수중작업으로 운전이 제한되고 장애물이 있는 경우, 장애측은 공 2개, 다른 선박이 통과할 수 있는 측은 마름모 2개를 수직으로 표시합니다.',memory:'막힌 쪽 = 공 / 지나갈 쪽 = 마름모'}},
    headOn(){return {key:'head-on',name:'정면으로 마주치는 상태',svg:svgFrame(`<path d="M45 115 V45 M135 35 V105" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><path d="M45 38 l-9 16 h18 Z" fill="#2563eb"/><path d="M135 112 l-9-16 h18 Z" fill="#2563eb"/><path d="M45 80 C60 68 70 60 78 50" stroke="#ef4444" stroke-width="3" fill="none" stroke-dasharray="5 4"/><path d="M135 70 C120 82 110 90 102 100" stroke="#ef4444" stroke-width="3" fill="none" stroke-dasharray="5 4"/><text x="90" y="135" text-anchor="middle" font-size="11" fill="#64748b">서로 우현 변침</text>`,'정면 조우: 두 선박이 서로 우현으로 변침'),note:'정면으로 마주치는 동력선은 서로 우현으로 변침하여 좌현 대 좌현으로 통과하는 것이 기본입니다.',memory:'정면 = 둘 다 우현'}},
    crossing(){return {key:'crossing',name:'횡단 상태',svg:svgFrame(`<path d="M45 120 V45" stroke="#2563eb" stroke-width="5"/><path d="M45 38 l-9 16 h18 Z" fill="#2563eb"/><path d="M145 78 H75" stroke="#0f766e" stroke-width="5"/><path d="M68 78 l16-9 v18 Z" fill="#0f766e"/><text x="45" y="138" text-anchor="middle" font-size="10" fill="#64748b">자선</text><text x="126" y="67" text-anchor="middle" font-size="10" fill="#64748b">우현측 상대선</text>`,'횡단 상태: 상대선이 우현에 있는 선박이 피항'),note:'횡단 상태에서 상대선을 자기 우현측에 두고 있는 동력선이 피항선입니다. 가능한 경우 상대선의 선수 앞을 가로지르는 행동을 피합니다.',memory:'상대선이 내 우현 = 내가 피항'}},
    overtaking(){return {key:'overtaking',name:'추월 상태',svg:svgFrame(`<path d="M68 118 V46" stroke="#94a3b8" stroke-width="6"/><path d="M68 38 l-10 18 h20 Z" fill="#94a3b8"/><path d="M112 125 V55" stroke="#2563eb" stroke-width="6"/><path d="M112 47 l-10 18 h20 Z" fill="#2563eb"/><path d="M112 110 C112 86 96 76 82 70" stroke="#ef4444" stroke-width="3" fill="none" stroke-dasharray="5 4"/><text x="90" y="140" text-anchor="middle" font-size="11" fill="#64748b">추월선이 피항</text>`,'추월 상태: 뒤에서 추월하는 선박이 피항'),note:'추월선은 완전히 지나서 충분히 떨어질 때까지 피추월선을 피해야 합니다.',memory:'추월 = 뒤에서 오는 배가 피항'}},
  };

  function detect(question,answer){
    const a=String(answer||''),q=String(question||'');

    // Prefer an explicit concept named in the correct answer. This avoids a stem
    // mentioning several vessel types from overriding the actual correct choice.
    if(/조종불능|not\s*under\s*command/i.test(a))return diagrams.nuc();
    if(/운전제한|조종능력.*제한|restricted.*ability.*manoeuv|restricted.*ability.*maneuv/i.test(a))return diagrams.ram();
    if(/흘수제약|constrained.*draught|constrained.*draft/i.test(a))return diagrams.cbd();
    if(/좌초|aground/i.test(a))return diagrams.aground();
    if(/정박선|정박 중|at\s*anchor/i.test(a))return diagrams.anchor();
    if(/트롤|trawl|그물을\s*끌/i.test(a))return diagrams.trawling();
    if(/어로|어선|fishing/i.test(a))return diagrams.fishing();
    if(/200\s*미터.*초과|200\s*m.*초과|tow.*200/i.test(a))return diagrams.tow200();
    if(/범선.*기관|기관.*범선|sailing.*power|sailing.*engine/i.test(a))return diagrams.sailMotor();
    if(/기뢰.*제거|mine\s*clear/i.test(a))return diagrams.mine();
    if(/준설|수중작업|dredg/i.test(a))return diagrams.dredging();

    // If the answer is a shape/action rather than a vessel name, infer the visual
    // from the question stem. This covers "200 m 초과 → 마름모" style questions.
    if(/조종불능|not\s*under\s*command/i.test(q))return diagrams.nuc();
    if(/운전제한|조종능력.*제한|restricted.*ability.*manoeuv|restricted.*ability.*maneuv/i.test(q))return diagrams.ram();
    if(/흘수제약|constrained.*draught|constrained.*draft/i.test(q))return diagrams.cbd();
    if(/좌초|aground/i.test(q))return diagrams.aground();
    if(/정박선|정박 중|at\s*anchor/i.test(q))return diagrams.anchor();
    if(/트롤|trawl|그물을\s*끌/i.test(q))return diagrams.trawling();
    if(/어로|어선|fishing/i.test(q))return diagrams.fishing();
    if(/200\s*미터.*초과|200\s*m.*초과|tow.*200/i.test(q))return diagrams.tow200();
    if(/범선.*기관|기관.*범선|sailing.*power|sailing.*engine/i.test(q))return diagrams.sailMotor();
    if(/기뢰.*제거|mine\s*clear/i.test(q))return diagrams.mine();
    if(/준설|수중작업|dredg/i.test(q))return diagrams.dredging();
    if(/정면.*마주|마주치는\s*상태|head[- ]?on/i.test(q))return diagrams.headOn();
    if(/횡단\s*상태|crossing\s*situation/i.test(q))return diagrams.crossing();
    if(/추월\s*상태|overtak/i.test(q))return diagrams.overtaking();
    return null;
  }

  function render(){
    const ctx=context();
    const old=document.getElementById(CARD_ID);
    if(!ctx){if(old)old.remove();return}
    const d=detect(ctx.question,ctx.answer);
    if(!d){if(old)old.remove();return}
    const signature=d.key+'|'+ctx.question.slice(0,80)+'|'+ctx.answer.slice(0,40);
    if(old&&old.dataset.signature===signature)return;
    ensureStyle();
    const card=old||document.createElement('div');card.id=CARD_ID;card.dataset.signature=signature;
    card.innerHTML=`<div class="mdv-head"><div class="mdv-title">그림으로 보기</div><div class="mdv-badge">항해 시각화</div></div><div class="mdv-grid"><div>${d.svg}</div><div><div class="mdv-name">${escapeText(d.name)}</div><div class="mdv-note">${escapeText(d.note)}</div><div class="mdv-memory">시험장에서 이렇게 기억: ${escapeText(d.memory)}</div></div></div>`;
    if(!old)ctx.explanation.appendChild(card);
  }

  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  document.addEventListener('click',schedule,true);
  schedule();
})();
