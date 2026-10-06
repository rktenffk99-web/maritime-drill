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

  function patchVerifiedFormulaQuestion(obj){
    if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;
    const q=getQuestionText(obj);
    if(!q)return false;

    // User-reported case + duplicate source pattern in earlier papers.
    if(/Squatting|스쿼팅/i.test(q)&&/침하량/.test(q)&&/(방형계수|방형비척계수)/.test(q)&&/선속/.test(q)){
      const coefficient=/방형비척계수/.test(q)?'방형비척계수':'방형계수';
      setQuestionText(
        obj,
        '선저여유수심이 충분한 해역에서 스쿼팅(Squatting) 현상에 의한 선체 침하량을 구하는 식을 옳게 표현한 것은? [단, S: 침하량(m), Cb: '+coefficient+', V: 선속(kn)]'
      );
      const choices=getChoices(obj);
      if(choices&&choices.length===4){
        const hasUnit=choices.some(x=>/\(m\)/.test(String(x)));
        const unit=hasUnit?'(m)':'';
        choices[0]='S = Cb × V² / 100'+unit;
        choices[1]='S = Cb × V / 100'+unit;
        choices[2]='S = Cb² × V² / 10'+unit;
        choices[3]='S = Cb² × V / 10'+unit;
      }
      return true;
    }
    return false;
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
    patchVerifiedFormulaQuestion,auditKnownData,collectBrokenGlyphs,replacements:REPLACEMENTS,
    equationCharMap:EQUATION_CHAR_MAP
  };

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDomGuard,{once:true});
    else bootDomGuard();
  }
})(window);
