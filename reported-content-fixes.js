// Maritime Drill reported content text corrections
// Normalizes PDF/HWP equation-font corruption and verified OCR/text issues.
(function(global){
  'use strict';

  // HWP/PDF equation-font characters were extracted into Unicode Private Use Area.
  // Browsers without the proprietary source font render them as tofu (□).
  // This table is the legacy equation-font encoding used by the navigator past papers.
  const EQUATION_CHAR_MAP=Object.freeze((()=>{
    const map={};
    const upper='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(let i=0;i<upper.length;i++)map[String.fromCharCode(0xE000+i)]=upper[i];
    const lower='abcdefghijklmnopqrstuvwxyz';
    for(let i=0;i<lower.length;i++)map[String.fromCharCode(0xE0E5+i)]=lower[i];
    const digitMap={
      0xE03D:'0',0xE034:'1',0xE035:'2',0xE036:'3',0xE037:'4',
      0xE038:'5',0xE039:'6',0xE03A:'7',0xE03B:'8',0xE03C:'9'
    };
    for(const [cp,ch] of Object.entries(digitMap))map[String.fromCharCode(Number(cp))]=ch;
    Object.assign(map,{
      '\uE043':'×','\uE044':'(','\uE045':')','\uE046':'−','\uE047':'=',
      '\uE048':'+','\uE052':',','\uE053':'.','\uE054':'/','\uE055':'<',
      '\uE056':'>','\uE05B':'∫','\uE05C':'√','\uE06D':'/',
      '\uE09C':'Ω','\uE0A0':'δ','\uE0A4':'θ','\uE0A7':'λ','\uE0A8':'μ',
      '\uE0AC':'π','\uE0AD':'ρ','\uE0BB':'ℓ','\uE0C8':'°'
    });
    return map;
  })());

  const REPLACEMENTS=Object.freeze([
    ['유지선은원칙적으로','유지선은 원칙적으로'],
    ['위하여침로를','위하여 침로를'],
    ['투하하는보급품','투하하는 보급품'],
    ['Stockless anchor의 적절한묘쇄','Stockless anchor의 적절한 묘쇄'],
    ['㉴','㉰'],
    ['㉵','㉱'],
    ['옳지않은','옳지 않은'],
    ['위하여한쪽','위하여 한쪽'],
    ['다른선박','다른 선박'],
    ['선박은기적','선박은 기적'],
    ['혼동되지아니하는','혼동되지 아니하는'],
    ['두어야한다','두어야 한다'],
    ['MARPOL Annex V에 따라 모든 선박이 비치해야 하는 법정 장부.','MARPOL Annex V에 따라 총톤수 100톤 이상 선박, 일정 조건의 15인 이상 승선 선박 및 고정·부유식 플랫폼 등에 비치가 요구되는 법정 장부.']
  ]);

  const BROKEN_GLYPH_RE=/[\uE000-\uF8FF\uFFFD]/g;

  function normalizeEquationGlyphs(value){
    let source=String(value==null?'':value);
    // HWP square-root output can carry an overbar/fraction marker directly after √.
    source=source.split('\uE05C\uE06D').join('√');
    let out='';
    for(const ch of source)out+=EQUATION_CHAR_MAP[ch]||ch;
    return out;
  }

  function normalizeFormulaArtifacts(value){
    let out=String(value==null?'':value);

    // Detached Cb subscript caused by PDF text extraction.
    out=out.replace(/C\s*:\s*(방형(?:비척)?계수),\s*V:\s*선속\(kn\)\]\s*b/g,'Cb: $1, V: 선속(kn)]');
    out=out.replace(/방형계수\(C\s*\)([^\]\r\n]{0,80})\]\s*b/g,'방형계수(Cb)$1]');

    // Squatting formula occurs in multiple 2급 papers. Restore subscript/superscript semantics.
    out=out.replace(/S\s*=\s*C×V2\/100(\(m\))?/g,'S = Cb × V² / 100$1');
    out=out.replace(/S\s*=\s*C×V\/100(\(m\))?\s*b\s*b/g,'S = Cb × V / 100$1');
    out=out.replace(/S\s*=\s*C2×V2\/10(\(m\))?/g,'S = Cb² × V² / 10$1');
    out=out.replace(/S\s*=\s*C2×V\/10(\(m\))?\s*b\s*b/g,'S = Cb² × V / 10$1');

    // Grain-code choice can arrive through homework/frequency queues as a plain
    // string rather than a full question object. Handle both raw PUA and already
    // tofu-rendered □ forms here so every renderer gets the same clean text.
    if(/Free surface effects/.test(out)&&/메타센터높이/.test(out)&&/0\.15m/.test(out)){
      out='탱크 내의 Free surface effects를 수정한 후의 메타센터높이(G₀M)는 0.15m 이상일 것';
    }

    return out;
  }

  function fixString(value){
    let out=normalizeFormulaArtifacts(normalizeEquationGlyphs(value));
    for(const [from,to] of REPLACEMENTS){
      if(out.includes(from))out=out.split(from).join(to);
    }
    return out;
  }

  function getQuestionText(obj){
    for(const key of ['문제','question','q','text']){
      if(typeof obj[key]==='string')return obj[key];
    }
    return '';
  }

  function setQuestionText(obj,text){
    for(const key of ['문제','question','q','text']){
      if(typeof obj[key]==='string'){obj[key]=text;return true;}
    }
    return false;
  }

  function getChoices(obj){
    for(const key of ['선택지','choices','options','answers']){
      if(Array.isArray(obj[key]))return obj[key];
    }
    return null;
  }

  // PDF page footer (e.g. "- 4 -" / "4 -") was sometimes concatenated
  // to the final answer choice during text extraction. In the source corpus
  // every verified occurrence is on the last choice, never in the stem.
  const PDF_FOOTER_SUFFIX_RE=/\s+(?:[1-9]|1[01])\s*-\s*$/;

  function stripPdfFooterArtifact(value){
    const source=String(value==null?'':value);
    return source.replace(PDF_FOOTER_SUFFIX_RE,'').trimEnd();
  }

  function patchPdfFooterArtifact(obj){
    const choices=getChoices(obj);
    if(!choices||!choices.length)return false;
    const i=choices.length-1;
    if(typeof choices[i]!=='string')return false;
    const fixed=stripPdfFooterArtifact(choices[i]);
    if(fixed===choices[i])return false;
    choices[i]=fixed;
    return true;
  }

  function setChoices(obj,items){
    const choices=getChoices(obj);
    if(!choices||choices.length!==items.length)return false;
    for(let i=0;i<items.length;i++)choices[i]=items[i];
    return true;
  }

  function patchVerifiedFormulaQuestion(obj){
    if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;
    const q=getQuestionText(obj);
    if(!q)return false;
    const answer=Number(obj['정답']??obj.answer);
    let changed=false;

    // 1급: 해수 비중 변화에 따른 흘수 변화량.
    if(/Tons per centimeter immersion/.test(q)&&/흘수 변화량/.test(q)&&/해수비중/.test(q)){
      setQuestionText(obj,'배수량 W, Tcm(Tons per centimeter immersion)인 선박이 해수비중 ρ₁인 해역에서 해수비중 ρ₂인 수역으로 입항할 때 흘수 변화량을 계산하는 식은?');
      setChoices(obj,[
        '(W / Tcm) × (1 − ρ₁ / ρ₂)',
        '(W / Tcm) × (1.025 / ρ₂ − 1.025 / ρ₁)',
        '(W / Mcm) × (1 − ρ₁ / ρ₂)',
        '(W / Mcm) × (1.025 / ρ₂ − 1.025 / ρ₁)'
      ]);
      changed=true;
    }

    // 1급: 일정 연료량에서의 항속거리.
    if(/항속거리를 구하는 식/.test(q)&&/주기관용 연료/.test(q)&&/사용할 수 있는 연료/.test(q)){
      setQuestionText(obj,'일정한 양의 연료를 보유한 선박이 속력 V로 항주할 때 항속거리 D를 구하는 식은? (단, Q: 속력 V에서 1일 주기관 연료소비량, M: 1일 잡용연료량, F: 사용 가능한 연료량)');
      setChoices(obj,[
        'D = V × 12 × F / (M + Q)',
        'D = V × 24 × F / (M + Q)',
        'D = V × 12 × F × M + Q',
        'D = V × 24 × F × M + Q'
      ]);
      changed=true;
    }

    // 1급: 기온·수온 차이에 따른 초인거리 개정값.
    if(/기온이 수온보다 높은 경우/.test(q)&&/개정값/.test(q)){
      setQuestionText(obj,'해도상 광달거리로부터 등화의 초인거리를 구할 때 기온이 수온보다 높은 경우의 개정값 공식은? (단, tₐ: 기온, tᵥ: 수온)');
      setChoices(obj,[
        '0.28(tᵥ − tₐ)',
        '2 × 0.28(tᵥ − tₐ)',
        '0.28(tₐ − tᵥ)',
        '2 × 0.28(tₐ − tᵥ)'
      ]);
      changed=true;
    }

    // 1급: 정률법 감가상각 — 잔존가액 10% 가정.
    if(/정률법에 의한 감가상각액 계산식/.test(q)){
      setQuestionText(obj,'선박의 사용년수에 따른 정률법의 상각비율 r을 정하는 식은? (단, A: 취득선가, n: 내용년수, 잔존가액은 취득선가의 10%)');
      setChoices(obj,[
        'A(1 + r)ⁿ / A = 1/10',
        'A(1 + r)ⁿ / A = 1/20',
        'A(1 − r)ⁿ / A = 1/10',
        'A(1 − r)ⁿ / A = 1/20'
      ]);
      changed=true;
    }

    // 1급: 교차방위법 선위 정밀도. 과거 1급 원문과 대조.
    if(/교차방위법/.test(q)&&/선위의 정밀도 K/.test(q)){
      setQuestionText(obj,'연안항해 중 A, B 두 물표의 방위를 측정하여 교차방위법으로 위치를 구했을 때 선위의 정밀도 K를 나타내는 식은? (단, 두 물표까지의 거리 d₁, d₂, 두 방위선의 교각 θ)');
      setChoices(obj,[
        'K ∝ sin θ / (d₁ × d₂)',
        'K ∝ (d₁ × d₂) × sin θ',
        'K ∝ (d₁ × d₂) / sin θ',
        'K ∝ (d₁ × sin θ) / d₂'
      ]);
      changed=true;
    }

    // 1급: 선수방위별 자차식.
    if(/선수방위에 따른 자차량/.test(q)){
      setQuestionText(obj,'선수방위에 따른 자차량을 나타내는 공식으로 옳지 않은 것은? (단, δ: 자차, A·B·C·D·E: 자차계수)');
      setChoices(obj,[
        '선수방위가 동(E)일 때 δ = A + B + E',
        '선수방위가 서(W)일 때 δ = A − B − E',
        '선수방위가 남(S)일 때 δ = A − C + E',
        '선수방위가 북(N)일 때 δ = A + C + E'
      ]);
      changed=true;
    }

    // 1급: 점장위도항법 관계식.
    if(/점장위도항법/.test(q)&&/점장변위/.test(q)){
      setQuestionText(obj,'점장위도항법에서 변위 ℓ, 변경 DLo, 동서거 p, 점장변위 m, 침로 C, 항정 D의 관계로 옳지 않은 것은?');
      setChoices(obj,[
        'D = ℓ sec C',
        'p = DLo cos C',
        'ℓ = D cos C',
        'DLo = m tan C'
      ]);
      changed=true;
    }

    // 1급: 장방형 수선면의 길이방향 관성모멘트.
    if(/장방형 구조물/.test(q)&&/길이방향의 관성모멘트/.test(q)){
      setQuestionText(obj,'길이 L, 폭 B인 장방형 구조물의 중심을 지나는 길이방향 축에 대한 관성모멘트는?');
      setChoices(obj,[
        'I = LB² / 12',
        'I = LB³ / 12',
        'I = BL² / 12',
        'I = BL³ / 12'
      ]);
      changed=true;
    }

    // 1급: 자동조타 PID형 타각식.
    if(/자동조타장치에서 타각/.test(q)&&/비례상수/.test((getChoices(obj)||[]).join(' '))){
      setQuestionText(obj,'자동조타장치에서 타각 μ를 정하는 식 μ = −(Nθ + R·dθ/dt + I∫θdt)에 관한 설명으로 옳지 않은 것은?');
      const choices=getChoices(obj);
      if(choices){
        choices[0]='비례상수 N, R, I는 작으면 작을수록 좋다.';
        choices[1]='I는 정상편차를 조정하기 위한 비례상수이다.';
        choices[2]='θ는 설정 침로에서 벗어난 각도, 즉 편각을 말한다.';
        choices[3]='R은 조정 가능한 상수이고 R을 조정하는 것을 레이트(Rate) 조정이라고 한다.';
      }
      changed=true;
    }

    // 1급: 극상정중 관측 조건.
    if(/극상정중을 관측할 수 있는 조건/.test(q)){
      setQuestionText(obj,'위도 L과 적위 d가 이명일 때 광력이 약한 혹성이나 항성의 극상정중을 관측할 수 있는 조건은?');
      setChoices(obj,['d < 80° − L','d < 90° − L','L > 90° − d','L > 100° − d']);
      changed=true;
    }

    // 1급: 등대 지리학적 광달거리.
    if(/등대가 수평선상에 처음 보일 때/.test(q)&&/지리학적/.test(q)){
      setQuestionText(obj,'등대가 수평선상에 처음 보일 때 등대까지의 지리학적 광달거리를 계산하는 식으로 옳은 것은? (단, h: 안고(m), H: 등대 높이(m), D: 광달거리(해리))');
      setChoices(obj,[
        'D = 1.144(H + h)',
        'D = 1.144(√H + √h)',
        'D = 2.083(H + h)',
        'D = 2.083(√H + √h)'
      ]);
      changed=true;
    }

    // 1급: Doppler log의 선수·선미 방향 속도식.
    if(/도플러 선속계\(Doppler log\)/.test(q)&&/옳지 않은 것은/.test(q)){
      setQuestionText(obj,'도플러 선속계(Doppler log)에서 선수·선미 방향 속도 V = c(f_f − f_a) / (4f_s cos θ)를 구하는 식에 관한 설명으로 옳지 않은 것은?');
      const choices=getChoices(obj);
      if(choices){
        choices[0]='θ는 선박의 경사각이다.';
        choices[1]='c는 수중에서의 음속이다.';
        choices[2]='f_s는 송신 음파의 주파수이다.';
        choices[3]='f_f, f_a는 선수·선미 방향에서 수신한 음파의 주파수이다.';
      }
      changed=true;
    }

    // 1급: 태풍 최대풍속 실험식.
    if(/태풍의 최대풍속/.test(q)&&/중위도 지방/.test(q)){
      setQuestionText(obj,'태풍의 최대풍속을 구하는 실험식 V(m/s) = K√(1010 − Pc)에서 중위도 지방의 상수 K 값은? (단, Pc: 태풍 중심기압(hPa))');
      changed=true;
    }

    // 1급: 롤링에 따른 레이더 스캐너 횡이동·거리오차.
    if(/레이더 스캐너/.test(q)&&/횡방향으로 움직이고/.test(q)&&/측정거리/.test(q)){
      setQuestionText(obj,'레이더 스캐너가 롤링축으로부터 H m 높이에 있고 선박이 L° 롤링할 때, 스캐너의 횡방향 이동량과 선수에서 θ 방위의 물표에 대한 거리오차를 순서대로 고른 것은?');
      setChoices(obj,[
        'H sin L sin θ, H sin L',
        'H sin L, H sin L sin θ',
        'H cos L, H cos L sin θ',
        'H cos L sin θ, H cos L'
      ]);
      changed=true;
    }

    // 1급: 일반화물선 상갑판 안전하중 약산식.
    if(/일반화물선에서 (?:Upper deck|상갑판)의 안전하중/.test(q)){
      setQuestionText(obj,'일반화물선에서 상갑판(Upper deck)의 안전하중(ton)을 계산하는 약산식으로 옳은 것은? (단, A: 갑판면적(ft²))');
      setChoices(obj,['3A / 35','3A / 50','5A / 35','5A / 50']);
      changed=true;
    }

    // 1급: Admiralty coefficient(속력계수) 식.
    if(/속력계수/.test(q)&&/실마력/.test(q)&&/연료소비량/.test(q)){
      setQuestionText(obj,'기관의 실마력 IHP = W^(2/3) × V³ / C에서 속력계수 C에 관한 설명으로 옳지 않은 것은? (단, W: 배수량, V: 속력)');
      changed=true;
    }

    // 1급: Anchor shank 각도에 따른 파주력 감소량.
    if(/Anchor shank/.test(q)&&/파주력의 감소량/.test(q)){
      setQuestionText(obj,'투묘 중 Anchor shank가 해저면에서 15° 들리면 파주력의 감소량은?');
      setChoices(obj,['약 1/2','약 1/3','약 1/4','약 1/5']);
      changed=true;
    }

    // 1급(어선): Broaching 방지를 위한 감속 한계.
    if(/브로칭을 피하기/.test(q)&&/감속 한계값/.test(q)){
      setQuestionText(obj,'황천항해 시 Broaching을 피하기 위한 선체길이 L 대비 감속 한계값은?');
      setChoices(obj,['0.8√L','1.0√L','1.8√L','2.0√L']);
      changed=true;
    }

    // 1급: 등대 회항 시 일정거리 변침법.
    if(/등대로부터 일정한 거리를 유지/.test(q)&&/언제 변침/.test(q)){
      setQuestionText(obj,'등대를 회항하면서 등대로부터 일정한 거리를 유지하려면, 변침각 θ에 대해 언제 변침하여야 하는가?');
      setChoices(obj,[
        '(1/2)θ°씩 등대가 정횡방향에서 뒤로 보일 때 변침',
        '(1/2)θ°씩 등대가 정횡방향에서 앞으로 보일 때 변침',
        'θ°씩 등대가 정횡방향에서 뒤로 보일 때 변침',
        'θ°씩 등대가 정횡방향에서 앞으로 보일 때 변침'
      ]);
      changed=true;
    }

    // 1급: 파공부 침수 유속(Torricelli).
    if(/파공부의 침수 유속/.test(q)){
      setQuestionText(obj,'수면하 선체 파공부의 침수 유속을 구하는 식은? (단, v: 유속(m/s), g: 중력가속도(m/s²), h: 파공부에서 수선면까지의 높이(m))');
      setChoices(obj,['v = 2gh','v = 2√(gh)','v = √(2gh)','v = (1/2)gh']);
      changed=true;
    }

    // 1급(어선): TPC의 Cw, Cb 첨자 표기.
    if(/매 cm 배수톤/.test(q)&&/수선면적계수/.test(q)&&/방형비척계수/.test(q)){
      setQuestionText(obj,'길이 80m, 폭 12m의 어선이 3.2m 등흘수로 비중 1.000의 담수에 떠 있다. 이 어선의 매 cm 배수톤은? (단, 수선면적계수 Cw = 0.90, 방형비척계수 Cb = 0.80)');
      changed=true;
    }

    // 1급: 복원성 설명 중 깨진 GM 표기.
    if(/공선 상태에서는 배수량이 작으므로/.test((getChoices(obj)||[]).join(' '))){
      const choices=getChoices(obj);
      if(choices)choices[3]='공선 상태에서는 배수량이 작으므로 만선 상태와 같은 복원력을 가지기 위해서는 만선 상태보다 작은 GM을 필요로 한다.';
      changed=true;
    }

    // 1급: 정액법 감가상각식.
    if(/정액법에 의한 선박의 감가상각/.test(q)){
      const choices=getChoices(obj);
      if(choices)choices[0]='상각액 계산식은 (취득가액 + 수리비 − 잔존가액) / 내용년수이다.';
      changed=true;
    }

    // 1급: 경사시험 관련 θ 기호가 깨진 수치문항.
    if(/중량물을.*횡.*이동/.test(q)&&/tan/.test(q)&&/GM/.test(q)){
      setQuestionText(obj,getQuestionText(obj).replace(/tan\s*[A-Za-zθ]+/,'tan θ').replace(/각이\s*[A-Za-zθ]+라면/,'각이 θ라면'));
      changed=true;
    }
    if(/선체 중심의수평 이동량|선체 중심의 수평 이동량/.test(q)&&/메타센터 높이\(GM\)/.test(q)){
      setQuestionText(obj,getQuestionText(obj).replace(/tan\s*[A-Za-zθ]+/,'tan θ').replace(/각이\s*[A-Za-zθ]+/,'각이 θ'));
      changed=true;
    }

    // 1급: 등대 정횡 반복변침의 θ 표기.
    if(/등대를 정횡으로 볼 때마다/.test(q)&&/선위는 어떻게/.test(q)){
      setQuestionText(obj,getQuestionText(obj).replace(/[A-Za-zθ]+°씩 변침/,'θ°씩 변침'));
      const choices=getChoices(obj);
      if(choices)choices[3]='변침각 θ의 크기에 따라 접근할 수도 있고 멀어질 수도 있다.';
      changed=true;
    }

    // 2급: Tackle 배율 — repeated across 2020~2023.
    if(/Tackle의 배율을 구하는 식/.test(q)){
      setQuestionText(obj,'Tackle의 배율을 구하는 식은? (단, N: 배율, m: Tackle의 Sheave 총수, n: 동활차에 걸리는 Rope의 수)');
      setChoices(obj,[
        'N = (10n / m) × 10',
        'N = 10n / (10 + m)',
        'N = 10m / (10 + n)',
        'N = (10 + n) / (10m)'
      ]);
      changed=true;
    }

    // 2급: 경사시험(복원성) 공식.
    if(/경사 시험에 의해 복원력을 구하는 식/.test(q)){
      setQuestionText(obj,"경사 시험에 의해 GM을 구하는 식으로 옳은 것은? (단, B: 부심, D: 배수량, G: 무게중심, w: 이동 중량, d: 이동 거리, Q: 경사각, GG′: 중심의 이동 거리)");
      setChoices(obj,[
        'GM = (w × d) / (BM × tan Q)',
        'GM = (w × d) / (GG′ × tan Q)',
        'GM = (w × d) / (D × tan Q)',
        'GM = (w × d) / (D × GG′)'
      ]);
      changed=true;
    }

    // 2급: 자장식 호흡구 잔여시간 식.
    if(/자장식 호흡구/.test(q)&&/잔여시간/.test(q)){
      setQuestionText(obj,'자장식 호흡구의 개략적인 잔여시간은 [실린더 내 공기압력(kg/cm²) × 실린더 내용적(L)] / [x(L/min)]으로 계산한다. 분모의 x에 들어갈 수치는?');
      setChoices(obj,['10','20','30','40']);
      changed=true;
    }

    // 2급: 종메타센터 반지름 BML = IL / V.
    if(/(관성 모멘트|관.*성 모멘트)/.test(q)&&/(종경심|종메타센터)/.test(q)&&/계산식/.test(q)){
      setQuestionText(obj,'종메타센터 반지름 BML = IL / V일 때 관성모멘트 IL을 가장 잘 설명한 것은? (단, B: 부심, ML: 종경심, V: 침하부 선체용적)');
      changed=true;
    }

    // 2급: Squatting — user-reported case + duplicates in earlier/later papers.
    if(/Squatting|스쿼팅/i.test(q)&&/침하량/.test(q)&&/(방형계수|방형비척계수)/.test(q)&&/선속/.test(q)){
      const coefficient=/방형비척계수/.test(q)?'방형비척계수':'방형계수';
      setQuestionText(obj,'선저여유수심이 충분한 해역에서 스쿼팅(Squatting) 현상에 의한 선체 침하량을 구하는 식을 옳게 표현한 것은? [단, S: 침하량(m), Cb: '+coefficient+', V: 선속(kn)]');
      const oldChoices=getChoices(obj)||[];
      const unit=oldChoices.some(x=>/\(m\)/.test(String(x)))?'(m)':'';
      setChoices(obj,[
        'S = Cb × V² / 100'+unit,
        'S = Cb × V / 100'+unit,
        'S = Cb² × V² / 10'+unit,
        'S = Cb² × V / 10'+unit
      ]);
      changed=true;
    }

    // 2급: 가속 인양 시 실질적인 하중 증가량 f.
    if(/실질적인 하중 증가량/.test(q)){
      setQuestionText(obj,'하중 W를 가속도 a(m/s²)로 감아올려 정속도에 도달할 때까지의 실질적인 하중 증가량 f의 계산식으로 옳은 것은? (단, g는 중력가속도)');
      setChoices(obj,[
        'f = W × a / g',
        'f = W × g / a',
        'f = W(1 − g / a)',
        'f = W(1 − a / g)'
      ]);
      changed=true;
    }

    // 2급: 인양 중 Dynamic load F.
    if(/Dynamic loads?\s*\(F\)/i.test(q)){
      setQuestionText(obj,'화물 W톤을 가속도 a(m/s²)로 감아올려 정속도에 도달할 때의 Dynamic load(F)를 구하는 계산식은? (단, g는 중력가속도)');
      setChoices(obj,[
        'F = W(1 + g / a)',
        'F = W(1 − g / a)',
        'F = W(1 + a / g)',
        'F = W(1 − a / g)'
      ]);
      changed=true;
    }

    // 2급: 횡요주기 공식.
    if(/횡요주기를 계산하는.*공식/.test(q)&&/(0\.802|802)/.test(q)){
      setQuestionText(obj,'선박의 횡요주기를 계산하는 공식 T = 0.802B / √GM에서 횡요축에 대한 회전반경은 대략 선폭(B)의 몇 %로 간주한 것인가?');
      changed=true;
    }

    // 2급: 기관 실마력과 배수량 관계.
    if(/기관 실마력\(I\.H\.P\.\).*배수량\(W\)/.test(q)){
      setQuestionText(obj,'선박의 기관 실마력(I.H.P.)과 배수량(W)의 관계를 나타낸 식은?');
      setChoices(obj,[
        'I.H.P. ∝ W²',
        'I.H.P. ∝ W³',
        'I.H.P. ∝ W^(1/3)',
        'I.H.P. ∝ W^(2/3)'
      ]);
      changed=true;
    }

    // 2급: 동조횡요 관계식.
    if(/동조횡요/.test(q)&&/파장/.test(q)&&/메타센터높이/.test(q)){
      setQuestionText(obj,'선체의 자유 횡요주기와 파의 주기가 같아 동조횡요가 일어날 때 파장(λ), 선폭(B), 메타센터높이(GM)의 관계로 옳은 것은?');
      setChoices(obj,[
        'B ≒ λ × √GM',
        'λ ≒ B × √GM',
        'B ≒ (G / M) × λ',
        'B² ≒ GM × λ'
      ]);
      changed=true;
    }

    // 2급: 케플러 제3법칙 표기 깨짐.
    if(/인공위성의 운동/.test(q)){
      const choices=getChoices(obj);
      if(choices){
        for(let i=0;i<choices.length;i++){
          if(/지구 위성의 주기/.test(choices[i])&&/장반경/.test(choices[i])){
            choices[i]='지구 위성의 주기(분)는 장반경(km)의 3/2승에 비례한다.';
            changed=true;
          }
        }
      }
    }

    // 2급: Tcm 표기.
    if(/Sagging/.test(q)&&/40ton/.test(q)){
      setQuestionText(obj,'15cm의 Sagging이 생긴 선박에서 배수량을 측정할 경우, 이 Sagging에 대한 배수량 수정량은? (단, Tcm = 40ton)');
      changed=true;
    }

    // 2급: KB/BM/KG/GM 관계 표기.
    if(/부심의 상하 위치/.test(q)&&/1\.2m/.test(q)&&/3\.2m/.test(q)&&/1\.8m/.test(q)){
      setQuestionText(obj,'KB = 1.2m, BM = 3.2m인 선박이 안정 평형 상태로 떠 있다. KG = 1.8m이면 GM은?');
      changed=true;
    }
    if(/부심의 상하 위치/.test(q)&&/1\.5m/.test(q)&&/3\.5m/.test(q)&&/2\.7m/.test(q)){
      setQuestionText(obj,'KB = 1.5m, BM = 3.5m인 선박이 안정 평형 상태로 떠 있고 GM = 2.7m라면 KG는?');
      changed=true;
    }

    // 2급: Broken space ratio.
    if(/Broken space/.test(q)){
      const choices=getChoices(obj);
      if(choices){
        for(let i=0;i<choices.length;i++){
          if(/Broken space ratio/.test(choices[i])){
            choices[i]='Broken space ratio(%) = [(Vb − Vc) / Vb] × 100 (단, Vb: Bale capacity, Vc: 화물이 차지하는 선창용적)';
            changed=true;
          }
        }
      }
    }

    // 2급: 일반화물선 상갑판 관용 최대하중.
    if(/(중량화물|갑판적 화물|특수선박)/.test(q)&&/상갑판.*(최대하중|안전하중)|상갑판 최대하중/.test(q)){
      setQuestionText(obj,'중량화물이나 갑판적 화물을 운반하는 특수선박을 제외한 일반화물선의 관용상 상갑판 최대하중을 구하는 식은? (단, A: 갑판면적(ft²))');
      setChoices(obj,['5A / 35','10A / 35','5A / 50','10A / 50']);
      changed=true;
    }

    // 2급: SOLAS 곡물 운송의 초기 GM 표기.
    if(/곡물의 운송규정|Carriage of grain/i.test(q)){
      const choices=getChoices(obj);
      if(choices){
        for(let i=0;i<choices.length;i++){
          if(/Free surface effects/.test(choices[i])&&/0\.15m/.test(choices[i])){
            choices[i]='탱크 내의 Free surface effects를 수정한 후의 메타센터높이(G₀M)는 0.15m 이상일 것';
            changed=true;
          }
        }
      }
    }

    // 2급: 항속거리 D.
    if(answer===3&&/항속거리/.test(q)&&/주기관의 연료량/.test(q)&&/잡용연료량/.test(q)){
      setQuestionText(obj,'속력 V로 1일에 소비하는 주기관 연료량을 Q, 1일 잡용연료량을 M, 사용 가능한 전 연료량을 F라 할 때 항속거리 D를 구하는 식은?');
      setChoices(obj,[
        'D = V × 24 × M + Q / F',
        'D = (24 × F / V) × (M + Q)',
        'D = (F / 24) × V × (M + Q)',
        'D = V × 24 × F / (M + Q)'
      ]);
      changed=true;
    }

    // 2급: 지구 자전 각속도의 위도 성분.
    if(/지구는 24시간에 한 바퀴/.test(q)&&/각속도/.test(q)){
      setQuestionText(obj,'지구는 24시간에 한 바퀴씩 서에서 동으로 각속도 Ω로 돈다. 임의 위도 λ에서 지표면은 ( )로 회전하고 ( )로 경사한다. 순서대로 옳은 것은?');
      setChoices(obj,[
        'Ω sin λ, Ω tan λ',
        'Ω sin λ, Ω cos λ',
        'Ω cos λ, Ω sin λ',
        'Ω cos λ, Ω tan λ'
      ]);
      changed=true;
    }

    // 2급: 평면항법.
    if(/평면항법에 관한 공식/.test(q)&&/동서거/.test(q)){
      setQuestionText(obj,'평면항법에 관한 공식으로 옳은 것은? (단, C: 침로, ℓ: 변위, p: 동서거, D: 항정)');
      setChoices(obj,[
        'p = ℓ × sin C',
        'p = ℓ × cos C',
        'p = D × sin C',
        'p = D × cos C'
      ]);
      changed=true;
    }

    // 2급: 묘쇄 현수부 길이.
    if(/묘쇄 현수부의 길이/.test(q)){
      setQuestionText(obj,'묘쇄 현수부의 길이 S = √[h(h + 2H/w)]에서 H와 w의 의미를 순서대로 설명한 것으로 옳은 것은?');
      changed=true;
    }

    // 2급: 화물 적재에 따른 G의 수직 이동거리.
    if(/중심 G에서 수직 상방향/.test(q)&&/수직 이동거리/.test(q)){
      setQuestionText(obj,'배수량 Δ톤인 선박의 중심 G에서 수직 상방향으로 d미터 떨어진 위치에 w톤의 화물을 적재했을 때 중심 G의 수직 이동거리(m)를 구하는 식은?');
      setChoices(obj,[
        'w × d / Δ',
        'w × d / (Δ + w)',
        '(−w) × d / (Δ + w)',
        '(−w) × d / [Δ + (−w)]'
      ]);
      changed=true;
    }

    // 2급(어선): 망사의 신장률.
    if(/망사의 신장률/.test(q)){
      setQuestionText(obj,'다음 중 망사의 신장률을 나타낸 식은? (단, ℓ: 망사의 원래 길이, ℓ₁: 망사가 파단되는 순간의 길이)');
      setChoices(obj,[
        'ℓ₁ / ℓ × 100',
        '(ℓ₁ − ℓ) / ℓ₁ × 100',
        '(ℓ₁ − ℓ) / ℓ × 100',
        '(ℓ − ℓ₁) / ℓ₁ × 100'
      ]);
      changed=true;
    }

    // 3급: Brereton scale. 2020과 2024는 같은 네 식이지만 선택지 순서가 다르다.
    if(/Brereton scale(?:\(B\.F\.\))? 검재법/.test(q)){
      setQuestionText(obj,'Brereton scale(B.F.) 검재법은? (단, a, b: 상·하단의 껍질을 포함하지 않은 직경(inch), l: 목재 길이(ft))');
      const correct='[(a + b) / 2]² × (π / 4) × l × (1 / 12)';
      const a='[(a + b) / 2]² × l × 12';
      const b='[(a + b) / 4]² × l × (π / 12)';
      const c='[(a + b) / 2]² × l × (1 / 12)';
      if(answer===0)setChoices(obj,[correct,a,b,c]);
      else setChoices(obj,[a,b,c,correct]);
      changed=true;
    }

    // 3급: 등대의 지리학적 광달거리.
    if(/표준대기상태/.test(q)&&/지리학적 광달거리/.test(q)&&/등고/.test(q)&&/안고/.test(q)){
      setQuestionText(obj,'표준대기상태에서 등대의 지리학적 광달거리를 구하는 공식은? (단, D: 광달거리(해리), H: 등고(m), h: 안고(m))');
      setChoices(obj,[
        'D = 2.074(√H + h)',
        'D = 2.074(√H + √h)',
        'D = 1.074(√H + h)',
        'D = 1.074(√H + √h)'
      ]);
      changed=true;
    }

    // 3급(어선): 종방향 중량 이동에 따른 트림 변화.
    if(/어선 트림의 변화량/.test(q)&&/트림모멘트/.test(q)){
      setQuestionText(obj,'선내 중량물 w(ton)을 종방향으로 d(m) 이동했을 때 트림 변화량 t(cm)를 구하는 식은? (단, M.T.C.: 매 cm 트림모멘트(m·ton))');
      setChoices(obj,[
        't = d × M.T.C. / w',
        't = M.T.C. / (w × d)',
        't = w × d / M.T.C.',
        't = w × M.T.C. / d'
      ]);
      changed=true;
    }

    // 3급: 거등권 항법의 변경·동서거 관계.
    if(/거등권 항법에서 변경/.test(q)){
      setQuestionText(obj,'거등권 항법에서 변경(DLo)을 구할 수 있는 공식은? (단, DLo: 변경, p: 동서거, L: 위도, D: 항정)');
      setChoices(obj,[
        'p = DLo cos L',
        'DLo = D cos L',
        'p = DLo sin L',
        'DLo = p sin L'
      ]);
      changed=true;
    }

    // 3급: Tackle hauling part 하중.
    if(/Hauling part/.test(q)&&/Leading block/.test(q)){
      setQuestionText(obj,'Sheave의 총수가 m, 동활차에 걸리는 Rope의 수가 n인 Tackle에 W톤의 하중이 걸려 있을 때 Hauling part에 걸리는 Load(P)는? (단, Leading block은 1개)');
      setChoices(obj,[
        'P = W × (100 + m) / 100',
        'P = W × 10m / (10 + n)',
        'P = W × 100m / (100 + n)',
        'P = W × (10 + m) / (10n) × 1.10'
      ]);
      changed=true;
    }

    // 단위·기호만 깨진 문제를 문맥에 맞게 보정.
    const choices=getChoices(obj);
    if(choices){
      for(let i=0;i<choices.length;i++){
        let s=String(choices[i]);
        s=s.replace(/kg\/cm2\b/gi,'kg/cm²').replace(/kg\/m3\b/gi,'kg/m³').replace(/\bm3\b/g,'m³').replace(/\bft3\b/gi,'ft³').replace(/m\/s2\b/gi,'m/s²');
        if(s!==choices[i]){choices[i]=s;changed=true;}
      }
    }
    let cleanQ=getQuestionText(obj);
    const unitFixed=cleanQ
      .replace(/kg\/cm2\b/gi,'kg/cm²')
      .replace(/kg\/m3\b/gi,'kg/m³')
      .replace(/\bm3\b/g,'m³')
      .replace(/\bft3\b/gi,'ft³')
      .replace(/m\/s2\b/gi,'m/s²')
      .replace(/sin\s*θ/g,'sin θ');
    if(unitFixed!==cleanQ){setQuestionText(obj,unitFixed);changed=true;}

    return changed;
  }

  function patchObject(value,seen){
    if(!value||typeof value!=='object')return value;
    const visited=seen||new WeakSet();
    if(visited.has(value))return value;
    visited.add(value);
    if(Array.isArray(value)){
      for(let i=0;i<value.length;i++){
        if(typeof value[i]==='string')value[i]=fixString(value[i]);
        else patchObject(value[i],visited);
      }
      return value;
    }
    for(const key of Object.keys(value)){
      const current=value[key];
      if(typeof current==='string')value[key]=fixString(current);
      else patchObject(current,visited);
    }
    patchPdfFooterArtifact(value);
    patchVerifiedFormulaQuestion(value);
    return value;
  }

  function collectBrokenGlyphs(value,path,out,seen){
    if(value==null)return out||[];
    const results=out||[];
    const visited=seen||new WeakSet();
    if(typeof value==='string'){
      const matches=value.match(BROKEN_GLYPH_RE);
      if(matches&&matches.length)results.push({path:path||'',count:matches.length,sample:value.slice(0,180)});
      return results;
    }
    if(typeof value!=='object'||visited.has(value))return results;
    visited.add(value);
    if(Array.isArray(value)){
      value.forEach((item,index)=>collectBrokenGlyphs(item,(path||'')+'['+index+']',results,visited));
    }else{
      for(const key of Object.keys(value))collectBrokenGlyphs(value[key],path?path+'.'+key:key,results,visited);
    }
    return results;
  }

  function auditKnownData(){
    const report={navi1:[],navi2:[],navi3:[],all:[]};
    const roots=[];
    if(global.MD_NAVI_FREQUENCY)roots.push(['MD_NAVI_FREQUENCY',global.MD_NAVI_FREQUENCY]);
    if(global.MD_DATA)roots.push(['MD_DATA',global.MD_DATA]);
    if(global.MD_PAST)roots.push(['MD_PAST',global.MD_PAST]);
    for(const [name,root] of roots){
      const found=collectBrokenGlyphs(root,name,[]);
      report.all.push(...found);
      for(const item of found){
        const p=item.path.toLowerCase();
        if(/navi1|1급|1st/.test(p))report.navi1.push(item);
        if(/navi2|2급|2nd/.test(p))report.navi2.push(item);
        if(/navi3|3급|3rd/.test(p))report.navi3.push(item);
      }
    }
    return report;
  }

  function patchKnownData(){
    if(global.MD_NAVI_FREQUENCY)patchObject(global.MD_NAVI_FREQUENCY);
    if(global.MD_DATA)patchObject(global.MD_DATA);
    if(global.MD_PAST)patchObject(global.MD_PAST);
  }

  function installFrequencyHook(){
    const original=global.ensureNavi3FrequencyData;
    if(typeof original!=='function'||original.__mdReportedTextFix)return;
    async function wrappedEnsureNavi3FrequencyData(){
      const result=await original.apply(this,arguments);
      patchObject(result);patchKnownData();return result;
    }
    wrappedEnsureNavi3FrequencyData.__mdReportedTextFix=true;
    wrappedEnsureNavi3FrequencyData.__mdReportedTextFixOriginal=original;
    global.ensureNavi3FrequencyData=wrappedEnsureNavi3FrequencyData;
  }

  function installPastExamHook(){
    const original=global.getPastExam;
    if(typeof original!=='function'||original.__mdReportedTextFix)return;
    function wrappedGetPastExam(){
      const result=original.apply(this,arguments);
      patchObject(result);return result;
    }
    wrappedGetPastExam.__mdReportedTextFix=true;
    wrappedGetPastExam.__mdReportedTextFixOriginal=original;
    global.getPastExam=wrappedGetPastExam;
  }

  function patchDom(root){
    if(!root||typeof document==='undefined'||!document.createTreeWalker)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const fixed=fixString(node.nodeValue);
      if(fixed!==node.nodeValue)node.nodeValue=fixed;
    }
  }

  function bootDomGuard(){
    patchKnownData();
    installFrequencyHook();
    installPastExamHook();
    const root=document.getElementById('app')||document.body;
    if(!root)return;
    patchDom(root);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        if(mutation.type==='characterData'){
          const fixed=fixString(mutation.target.nodeValue);
          if(fixed!==mutation.target.nodeValue)mutation.target.nodeValue=fixed;
          continue;
        }
        for(const node of mutation.addedNodes){
          if(node.nodeType===Node.TEXT_NODE){
            const fixed=fixString(node.nodeValue);
            if(fixed!==node.nodeValue)node.nodeValue=fixed;
          }else if(node.nodeType===Node.ELEMENT_NODE)patchDom(node);
        }
      }
    });
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }

  patchKnownData();
  installFrequencyHook();
  installPastExamHook();

  global.__mdReportedContentFixes={
    fixString,normalizeEquationGlyphs,normalizeFormulaArtifacts,patchObject,patchKnownData,
    patchVerifiedFormulaQuestion,patchPdfFooterArtifact,stripPdfFooterArtifact,
    auditKnownData,collectBrokenGlyphs,replacements:REPLACEMENTS,
    equationCharMap:EQUATION_CHAR_MAP
  };

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDomGuard,{once:true});
    else bootDomGuard();
  }
})(window);
