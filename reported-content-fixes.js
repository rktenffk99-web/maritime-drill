// Maritime Drill reported content text corrections
// Applies only exact, user-reported malformed strings and leaves unrelated wording unchanged.
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
    ['MARPOL Annex V에 따라 모든 선박이 비치해야 하는 법정 장부.','MARPOL Annex V에 따라 총톤수 100톤 이상 선박, 일정 조건의 15인 이상 승선 선박 및 고정·부유식 플랫폼 등에 비치가 요구되는 법정 장부.']
  ]);

  function fixString(value){
    let out=String(value==null?'':value);
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

  global.__mdReportedContentFixes={fixString,patchObject,patchKnownData,replacements:REPLACEMENTS};

  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDomGuard,{once:true});
    else bootDomGuard();
  }
})(window);
