'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('mock-explanation-controls.js','utf8');
const keyboard=fs.readFileSync('keyboard-controls.js','utf8');

assert.match(keyboard,/mdLoadAuxScript\('mock-explanation-controls\.js'\)/,'mock explanation script is not loaded');
assert.match(source,/currentMode[^\n]+==='past'/,'past-mode guard missing');
assert.match(source,/pastMode[^\n]+==='mock'/,'mock-mode guard missing');
assert.match(source,/button\[onclick="pastNext\(\)"\]/,'navigation-row anchor missing');
assert.match(source,/id="\$\{BUTTON_ID\}"/,'explanation button missing');
assert.match(source,/renderExplainBlock\(q,\{compact:true\}\)/,'existing explanation renderer is not reused');
assert.match(source,/panel\.querySelectorAll\('details'\).*open=true/,'nested explanation details are not expanded on request');
assert.match(source,/activeKey!==key/,'question change does not reset the explanation toggle');
assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem|clear)/,'explanation viewer must not mutate learning storage');
assert.doesNotMatch(source,/choosePastAnswer|pastAnswers\s*\[/,'explanation viewer must not submit or change answers');
const SHELL='md-mock-explanation-shell',BUTTON='md-mock-explanation-toggle',PANEL='md-mock-explanation-panel';
function harness(extra={}){
  const nodes=new Map(),saved=[];
  function element(){
    return {id:'',style:{},hidden:false,attributes:{},events:{},details:[],
      setAttribute(k,v){this.attributes[k]=v},addEventListener(k,fn){this.events[k]=fn},click(){this.events.click()},
      querySelector(selector){return nodes.get(selector.slice(1))||null},querySelectorAll(){return this.details},
      remove(){for(const id of [SHELL,BUTTON,PANEL])nodes.delete(id)},
      set innerHTML(value){
        this.html=value;
        if(this.id===SHELL){const b=element(),p=element();b.id=BUTTON;p.id=PANEL;nodes.set(BUTTON,b);nodes.set(PANEL,p)}
        if(this.id===PANEL)this.details=value.includes('<details')?[{open:false}]:[];
      },get innerHTML(){return this.html||''}};
  }
  const next={parentElement:{insertAdjacentElement(where,shell){nodes.set(shell.id,shell)}}};
  const s={console:{warn(){}},currentMode:'past',pastMode:'mock',pastIdx:0,pastStartedAt:1,pastAnswers:[null],
    pastQueue:[{'정답':0,'선택지':['첫 번째 답','두 번째 답'],'해설':'문항 해설',_planKey:'q1'}],
    document:{getElementById:id=>nodes.get(id)||null,querySelector:()=>next,createElement:element,readyState:'loading',addEventListener(){}},
    savePastProgress(){saved.push({answers:s.pastAnswers.slice(),viewed:s.pastQueue.some(q=>q._evaluationExplanationViewed===true)})},...extra};
  s.window=s;vm.createContext(s);vm.runInContext(source,s);const api=s.__mdMockExplanationControls;
  return {s,saved,nodes,api,mount(){api.mount()},click(){nodes.get(BUTTON).click()},get panel(){return nodes.get(PANEL)},get button(){return nodes.get(BUTTON)}};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
test('every written mock can explicitly reveal the correct choice before answering',()=>{
  for(const flag of [null,'_balancedMock','_predictiveMock','_evaluationMock']){
    const h=harness();if(flag)h.s.pastQueue[0][flag]=true;h.mount();
    assert.equal(h.panel.hidden,true);assert.equal(h.panel.innerHTML,'');assert.equal(h.button.textContent,'정답·해설 보기');
    h.click();assert.equal(h.panel.hidden,false);assert.match(h.panel.innerHTML,/정답: ㉮/);assert.match(h.panel.innerHTML,/첫 번째 답/);assert.match(h.panel.innerHTML,/문항 해설/);
    assert.deepEqual(h.s.pastAnswers,[null]);
  }
});
test('a registered answer remains visible when an explanation is missing or unavailable',()=>{
  const h=harness({renderExplainBlock(){throw new Error('unavailable')}});delete h.s.pastQueue[0]['해설'];h.mount();h.click();
  assert.match(h.panel.innerHTML,/첫 번째 답/);assert.match(h.panel.innerHTML,/등록된 해설이 없습니다/);
});
test('answer and fallback explanation text are escaped',()=>{
  const h=harness();h.s.pastQueue[0]['선택지'][0]='A < B & C';h.s.pastQueue[0]['해설']='<span>해설</span>';h.mount();h.click();
  assert.match(h.panel.innerHTML,/A &lt; B &amp; C/);assert.match(h.panel.innerHTML,/&lt;span&gt;해설&lt;\/span&gt;/);assert.ok(!h.panel.innerHTML.includes('<span>해설</span>'));
});
test('evaluation help is remembered once without changing an already selected answer',()=>{
  const h=harness();h.s.pastQueue[0]._evaluationMock=true;h.s.pastAnswers[0]=1;h.mount();h.click();
  assert.equal(h.s.pastQueue[0]._evaluationExplanationViewed,true);assert.deepEqual(h.s.pastAnswers,[1]);assert.equal(h.saved.length,1);assert.equal(h.saved[0].viewed,true);
  h.click();assert.equal(h.panel.hidden,true);assert.equal(h.panel.innerHTML,'');h.click();assert.equal(h.saved.length,1);
});
test('new questions and new papers start closed even when the same question appears again',()=>{
  const h=harness();h.mount();h.click();h.s.pastQueue.push({...h.s.pastQueue[0]});h.s.pastIdx=1;h.mount();assert.equal(h.panel.hidden,true);
  h.s.pastIdx=0;h.mount();h.click();h.s.pastAnswers=[null];h.mount();assert.equal(h.panel.hidden,true);
});
test('redrawing the same question preserves its explicit toggle, and nested explanation details open',()=>{
  const h=harness({renderExplainBlock:()=>'<details><summary>해설</summary>본문</details>'});h.mount();h.click();
  assert.equal(h.panel.details[0].open,true);h.nodes.get(SHELL).remove();h.mount();assert.equal(h.panel.hidden,false);
});
test('study screens and result screens do not receive an extra mock answer button',()=>{
  const h=harness();h.mount();h.s.pastMode='study';h.mount();assert.equal(h.nodes.size,0);
  h.s.pastMode='mock';h.s.currentMode='past-result';h.mount();assert.equal(h.nodes.size,0);
});
test('an invalid answer index does not reveal an invented choice',()=>{
  for(const answer of [null,'',-1,9]){const h=harness();h.s.pastQueue[0]['정답']=answer;h.mount();h.click();assert.match(h.panel.innerHTML,/등록된 정답을 확인할 수 없습니다/);assert.ok(!h.panel.innerHTML.includes('정답: ㉮'));}
});
test('focused reveal buttons keep Enter and Space activation instead of navigating to another question',()=>{
  let handler,advanced=0;const s={currentMode:'past',pastNext(){advanced++},document:{getElementById:()=>null,addEventListener:(type,fn)=>{handler=fn}}};
  vm.createContext(s);vm.runInContext(keyboard.slice(0,keyboard.indexOf('function mdLoadAuxScript(')),s);
  const target={tagName:'BUTTON',closest:()=>({})};
  for(const [key,code] of [['Enter','Enter'],[' ','Space']]){
    let prevented=false;handler({key,code,target,preventDefault(){prevented=true},stopImmediatePropagation(){throw new Error('must not suppress native button activation')}});
    assert.equal(advanced,0);assert.equal(prevented,false);
    const h=harness();h.mount();let stopped=false;h.button.events.keydown({key,code,stopPropagation(){stopped=true}});assert.equal(stopped,true);
  }
  handler({key:' ',code:'Space',target:{tagName:'DIV'},preventDefault(){},stopImmediatePropagation(){}});assert.equal(advanced,1);
});
console.log(`mock in-exam answer and explanation controls: PASS (${passed} behavior cases)`);
