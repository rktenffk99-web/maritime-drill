// Maritime Drill reported content text corrections
// Applies only exact, user-reported malformed strings and leaves unrelated wording unchanged.
(function(global){
  'use strict';


  // HWP/PDF equation-font characters were extracted into the Unicode Private Use Area.
  // Browsers without the original proprietary equation font render these as tofu boxes.
  // Convert the subset present in navigator 1/2/3 past-exam data to portable Unicode.
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
      '\uE043':'×',
      '\uE044':'(',
      '\uE045':')',
      '\uE046':'−',
      '\uE047':'=',
      '\uE048':'+',
      '\uE052':',',
      '\uE053':'.',
      '\uE054':'/',
      '\uE055':'<',
      '\uE056':'>',
      '\uE05B':'∫',
      '\uE05C':'√',
      '\uE06D':'/',
      '\uE09C':'Ω',
      '\uE0A0':'δ',
      '\uE0A4':'θ',
      '\uE0A7':'λ',
      '\uE0A8':'μ',
      '\uE0AC':'π',
      '\uE0AD':'ρ',
      '\uE0BB':'ℓ',
      '\uE0C8':'°'
    });
    return map;
  })());

  function normalizeEquationGlyphs(value){
    let source=String(value==null?'':value);
    // HWP square-root output often carries an overbar marker immediately after √.
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

    // Repeated Squatting formula questions (including 2022 3회 2급 운용).
    // The original PDF equation font lost the b subscript and superscript ² ordering.
    out=out.replace(/S\s*=\s*C×V2\/100(\(m\))?/g,'S = Cb × V² / 100$1');
    out=out.replace(/S\s*=\s*C×V\/100(\(m\))?\s*b\s*b/g,'S = Cb × V / 100$1');
    out=out.replace(/S\s*=\s*C2×V2\/10(\(m\))?/g,'S = Cb² × V² / 10$1');
    out=out.replace(/S\s*=\s*C2×V\/10(\(m\))?\s*b\s*b/g,'S = Cb² × V / 10$1');

    return out;
  }

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
    // 2025년 1회 2급 법규 Q25 신고: 정답(20m, 100m)은 맞고 원문 띄어쓰기가 깨져 있었다.
    ['선박은기적','선박은 기적'],
    ['혼동되지아니하는','혼동되지 아니하는'],
    ['두어야한다','두어야 한다'],
    ['MARPOL Annex V에 따라 모든 선박이 비치해야 하는 법정 장부.','MARPOL Annex V에 따라 총톤수 100톤 이상 선박, 일정 조건의 15인 이상 승선 선박 및 고정·부유식 플랫폼 등에 비치가 요구되는 법정 장부.']
  ]);

  function fixString(value){
    let out=normalizeFormulaArtifacts(normalizeEquationGlyphs(value));
    for(const [from,to] of REPLACEMENTS){
      if(out.includes(from)) out=out.split(from).join(to);
    }
    return out;
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
    return value;
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
      patchObject(result);
      patchKnownData();
      return result;
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
      patchObject(result);
      return result;
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
          }else if(node.nodeType===Node.ELEMENT_NODE){
            patchDom(node);
          }
        }
      }
    });
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }

  patchKnownData();
  installFrequencyHook();
  installPastExamHook();

  global.__mdReportedContentFixes={fixString,normalizeEquationGlyphs,normalizeFormulaArtifacts,patchObject,patchKnownData,replacements:REPLACEMENTS,equationCharMap:EQUATION_CHAR_MAP};

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDomGuard,{once:true});
    else bootDomGuard();
  }
})(window);
