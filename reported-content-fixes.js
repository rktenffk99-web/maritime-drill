// Maritime Drill reported content text corrections
// Normalizes verified OCR/PDF text corruption without changing unrelated question wording.
(function(global){
  'use strict';

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

  // 한글 PDF 수식 폰트가 Unicode PUA(Private Use Area)로 추출되면서
  // 브라우저에서 □ 로 보이는 문자 중 의미가 확실히 확인된 것만 복원한다.
  const VERIFIED_PUA_MAP=Object.freeze({
    '\uE012':'S',
    '\uE047':'=',
    '\uE002':'C',
    '\uE0E6':'b',
    '\uE015':'V',
    '\uE054':'/',
    '\uE034':'1',
    '\uE03D':'0',
    '\uE035':'2',
    '\uE001':'B',
    '\uE006':'G',
    '\uE00C':'M',
    '\uE0A7':'λ'
  });

  const BROKEN_GLYPH_RE=/[\uE000-\uF8FF\uFFFD]/g;

  function decodeVerifiedPua(value){
    return String(value==null?'':value).replace(/[\uE000-\uF8FF]/g,ch=>
      Object.prototype.hasOwnProperty.call(VERIFIED_PUA_MAP,ch)?VERIFIED_PUA_MAP[ch]:ch
    );
  }

  function fixString(value){
    let out=decodeVerifiedPua(value);
    for(const [from,to] of REPLACEMENTS){
      if(out.includes(from)) out=out.split(from).join(to);
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
      if(typeof obj[key]==='string'){
        obj[key]=text;
        return true;
      }
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

    // 2022년 2급 항해사(상선) 항해: Squatting 침하량 공식.
    // 원문 PDF 수식 글꼴이 PUA로 추출되어 Cb, V², /100 등이 □ 로 표시되던 문제.
    if(/Squatting|스쿼팅/i.test(q)&&/침하량/.test(q)&&/방형계수/.test(q)&&/선속/.test(q)){
      setQuestionText(
        obj,
        '선저여유수심이 충분한 해역에서 스쿼팅(Squatting) 현상에 의한 선체 침하량을 구하는 식을 옳게 표현한 것은? [단, S: 침하량(m), Cb: 방형계수, V: 선속(kn)]'
      );
      const choices=getChoices(obj);
      if(choices&&choices.length===4){
        choices[0]='S = Cb × V² / 100';
        choices[1]='S = Cb × V / 100';
        choices[2]='S = Cb² × V² / 10';
        choices[3]='S = Cb² × V / 10';
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
    if(value==null)return out;
    const results=out||[];
    const visited=seen||new WeakSet();
    if(typeof value==='string'){
      const matches=value.match(BROKEN_GLYPH_RE);
      if(matches&&matches.length){
        results.push({path:path||'',count:matches.length,sample:value.slice(0,180)});
      }
      return results;
    }
    if(typeof value!=='object'||visited.has(value))return results;
    visited.add(value);
    if(Array.isArray(value)){
      value.forEach((item,index)=>collectBrokenGlyphs(item,(path||'')+'['+index+']',results,visited));
    }else{
      for(const key of Object.keys(value)){
        collectBrokenGlyphs(value[key],path?path+'.'+key:key,results,visited);
      }
    }
    return results;
  }

  function auditKnownData(){
    const report={navi2:[],navi3:[],all:[]};
    const roots=[];
    if(global.MD_NAVI_FREQUENCY)roots.push(['MD_NAVI_FREQUENCY',global.MD_NAVI_FREQUENCY]);
    if(global.MD_DATA)roots.push(['MD_DATA',global.MD_DATA]);
    if(global.MD_PAST)roots.push(['MD_PAST',global.MD_PAST]);

    for(const [name,root] of roots){
      const found=collectBrokenGlyphs(root,name,[]);
      report.all.push(...found);
      for(const item of found){
        const p=item.path.toLowerCase();
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

  global.__mdReportedContentFixes={
    fixString,
    decodeVerifiedPua,
    patchObject,
    patchKnownData,
    patchVerifiedFormulaQuestion,
    auditKnownData,
    collectBrokenGlyphs,
    replacements:REPLACEMENTS,
    verifiedPuaMap:VERIFIED_PUA_MAP
  };

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDomGuard,{once:true});
    else bootDomGuard();
  }
})(window);
