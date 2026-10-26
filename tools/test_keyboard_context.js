'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
const external=fs.readFileSync(path.join(root,'keyboard-controls.js'),'utf8').split('function mdLoadAuxScript(')[0];
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf("document.addEventListener('keydown',function(e){\n  // keyboard-context-v527");
const end=html.indexOf('// ── v4.24:',start);
assert.ok(start>0&&end>start,'final generated keyboard handler is required');
const inline=html.slice(start,end);
function harness(mode,modal=null){
  const handlers=[],calls=[];
  const s={console,document:{addEventListener:(_,fn,capture)=>handlers.push({fn,capture}),
    getElementById:id=>id===modal?{}:null,querySelectorAll:()=>Array.from({length:4},(_,i)=>({click:()=>calls.push('choice'+i)}))},
    currentMode:mode,pastQueue:[{'선택지':['1','2','3','4']}],pastAnswers:[null],pastIdx:0,pastMode:'mock',
    queue:[{}],currentIdx:0,showAnswer:false,hintLevel:0,answerCollapsed:true,
    pastNext:()=>calls.push('next'),choosePastAnswer:i=>calls.push('choice'+i),renderPastCard:()=>calls.push('render'),
    renderHintAction:()=>calls.push('hint'),togglePastMark:()=>calls.push('bookmark'),
    setAnswerCollapse:()=>calls.push('collapse'),prevCard:()=>calls.push('previous'),skipCard:()=>calls.push('skip')};
  s.window={chooseNavigatorPassPlanAnswer(){},nextNavigatorPassPlanQuestion:()=>calls.push('next'),prevNavigatorPassPlanQuestion:()=>calls.push('previous')};
  vm.createContext(s);vm.runInContext(external,s);vm.runInContext(inline,s);
  return {s,calls,press(key,code=key,options={}){
    let stopped=false;
    const e={key,code,target:{tagName:'BODY',closest:()=>null},defaultPrevented:false,
      preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){stopped=true},stopPropagation(){},...options};
    for(const {fn} of handlers){fn(e);if(stopped)break}return e;
  }};
}
let cases=0;
for(const mode of ['past','pass-plan-session','study','mock','focus','review']){
  for(const modal of ['md-modal-wrap','_confirmDialog','md-report-modal','md-report-list-modal']){
    const h=harness(mode,modal);
    for(const [key,code] of [['Enter','Enter'],[' ','Space'],['1','Digit1'],['ArrowRight','ArrowRight'],['ArrowDown','ArrowDown']])h.press(key,code);
    assert.deepEqual(h.calls,[],`${mode}: ${modal} must block background shortcuts`);cases++;
  }
  for(const tagName of ['BUTTON','A','SUMMARY','SPAN']){
    const h=harness(mode),target={tagName,closest:()=>({})};
    for(const [key,code] of [['Enter','Enter'],['Enter','NumpadEnter'],[' ','Space']])assert.equal(h.press(key,code,{target}).defaultPrevented,false);
    assert.deepEqual(h.calls,[],`${mode}: focused control must receive native activation`);cases++;
  }
  for(const options of [{isComposing:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'TEXTAREA',closest:()=>null}}]){
    const h=harness(mode);h.press('Enter','Enter',options);h.press(' ','Space',options);h.press('1','Digit1',options);
    assert.deepEqual(h.calls,[],`${mode}: editing/modifier shortcuts must remain intact`);cases++;
  }
}
for(const mode of ['past','pass-plan-session']){
  const h=harness(mode);h.press('1','Digit1');h.press('Enter','Enter');h.press(' ','Space');
  assert.deepEqual(h.calls,['choice0','next','next'],mode+' body shortcuts still work');cases++;
  const held=harness(mode);held.press('Enter','Enter',{repeat:true});held.press(' ','Space',{repeat:true});
  assert.deepEqual(held.calls,[],mode+' held keys must not skip questions');cases++;
}
const study=harness('study');study.press(' ','Space');assert.deepEqual(study.calls,['hint']);cases++;
console.log(`keyboard context regressions: PASS (${cases} cases)`);
