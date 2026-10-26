#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('convenience-controls.js','utf8');
const start=source.indexOf('  function closeReportDialog('),end=source.indexOf('  async function requestWakeLock(',start);
assert.ok(start>=0&&end>start);

function harness(){
  let mutations=0;
  const records=new Map(),messages=[];
  let document;
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};this.events={};this._text='';this.disabled=false;this.className='';this.classList={contains:name=>this.className.split(' ').includes(name)};}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
    set textContent(value){this._text=String(value);mutations++;}
    get parentNode(){return this.parentElement}
    get previousElementSibling(){const siblings=this.parentElement?.children||[];return siblings[siblings.indexOf(this)-1]||null;}
    appendChild(child){child.parentElement=this;this.children.push(child);mutations++;return child;}
    insertBefore(child,before){child.parentElement=this;this.children.splice(this.children.indexOf(before),0,child);mutations++;}
    insertAdjacentElement(where,child){assert.equal(where,'afterend');child.parentElement=this.parentElement;this.parentElement.children.splice(this.parentElement.children.indexOf(this)+1,0,child);mutations++;}
    descendants(){return this.children.flatMap(child=>[child,...child.descendants()])}
    contains(node){return this===node||this.descendants().includes(node)}
    remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;mutations++;}}
    setAttribute(k,v){this.attributes[k]=String(v)}
    addEventListener(k,fn){this.events[k]=fn}
    focus(){document.activeElement=this}
    getClientRects(){return this.style.display==='none'||this.parentElement?.getClientRects().length===0?[]:[{}];}
    querySelectorAll(selector){
      const all=this.descendants();
      if(selector==='div,span')return all.filter(el=>['DIV','SPAN'].includes(el.tagName));
      if(selector==='.tag')return all.filter(el=>el.classList.contains('tag'));
      if(selector==='button')return all.filter(el=>el.tagName==='BUTTON');
      if(selector.startsWith('button,'))return all.filter(el=>['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(el.tagName));
      return all.filter(el=>selector.startsWith('#')?el.id===selector.slice(1):selector==='.card'&&el.classList.contains('card'));
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  }
  const body=new Element(),root=new Element();root.id='app';body.appendChild(root);
  document={body,activeElement:null,createElement:tag=>new Element(tag),getElementById:id=>body.descendants().find(x=>x.id===id)||null,contains:node=>body.contains(node)};
  const header=new Element(),counter=new Element('span'),card=new Element();card.className='card';
  counter.textContent='실전 3 / 125';header.appendChild(counter);root.appendChild(header);root.appendChild(card);
  const tag=new Element('span');tag.className='tag';tag.textContent='2025년';card.appendChild(tag);
  const question=new Element();question.textContent='어느 선지가 맞습니까?';card.appendChild(question);
  const choices=new Element(),choice=new Element('button');choice.textContent='선지';choices.appendChild(choice);card.appendChild(choices);
  const sandbox={document,window:{confirm:()=>true},console,Date,JSON,Number,REPORTS_KEY:'reports',RESOLVED_REPORTS_CUTOFF:'2026-09-18T00:41:10.000Z',
    appRoot:()=>root,inQuestionSession:()=>true,questionChoiceButtons:()=>[choice],toast:text=>messages.push(text),
    escapeText:value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    localStorage:{getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)},setTimeout:fn=>fn()};
  vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
  return {s:sandbox,document,root,header,counter,card,Element,records,messages,get mutations(){return mutations}};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}

test('current and legacy counters are captured without surrounding controls',()=>{
  const h=harness();
  for(const label of ['실전 3 / 125','실전예측 58 / 75','모의 4/125','문제 70/70']){
    h.counter.textContent=label;
    assert.equal(h.s.findQuestionCounter(h.root),h.counter);
    const snapshot=h.s.collectQuestionSnapshot();
    assert.equal(snapshot.counter,label);assert.equal(snapshot.question,'어느 선지가 맞습니까?');
    assert.deepEqual(Array.from(snapshot.tags),['2025년']);
  }
  h.counter.textContent='그만 오늘의 숙제 문제 70/70 재확인 중';
  assert.equal(h.s.collectQuestionSnapshot().counter,'문제 70/70');
});

test('saving a first or subsequent report updates its badge without re-rendering the question',()=>{
  const h=harness();h.s.addReportButton();
  const button=h.document.getElementById('md-report-btn');
  assert.equal(button.parentElement,h.header);assert.equal(h.document.getElementById('md-report-list-btn'),null);
  h.s.saveReport('오타/깨짐');
  const badge=h.document.getElementById('md-report-list-btn');
  assert.equal(badge.textContent,'신고 1');assert.equal(h.document.getElementById('md-report-btn'),button);
  const unchanged=h.mutations;
  for(let i=0;i<20;i++)h.s.addReportButton();
  assert.equal(h.mutations,unchanged,'MutationObserver callbacks must settle without redundant DOM writes');
  h.s.saveReport('직접 입력','선지 끝 확인');assert.equal(badge.textContent,'신고 2');
  assert.equal(h.document.getElementById('md-report-list-btn'),badge);
  h.records.set('reports','[]');h.s.addReportButton();assert.equal(h.document.getElementById('md-report-list-btn'),null);
  assert.equal(h.document.getElementById('md-report-btn'),button);
});

test('imported reports with non-array tags render and copy without losing their details',()=>{
  const h=harness(),rows=[
    {question:'q1',tags:'2급 · 법규',detail:'첫 신고'},
    {question:'q2',tags:{bad:true},detail:'둘째 신고'},
    {question:'q3',tags:['3급',null,7,{bad:true}],detail:'셋째 신고'},
  ];
  const copied=h.s.formatReports(rows);
  assert.match(copied,/2급 · 법규/);assert.match(copied,/3급 · 7/);assert.match(copied,/둘째 신고/);assert.ok(!copied.includes('[object Object]'));
  h.records.set('reports',JSON.stringify(rows));
  // Focus behavior is exercised independently below; capture the actual list HTML.
  h.s.prepareReportDialog=()=>{};
  const create=h.document.createElement;
  h.document.createElement=tag=>{const el=create(tag);el.querySelector=()=>({});return el;};
  h.s.openReportListModal();
  const html=h.document.getElementById('md-report-list-modal').innerHTML;
  assert.match(html,/첫 신고/);assert.match(html,/둘째 신고/);assert.match(html,/셋째 신고/);
  assert.match(html,/2급 · 법규/);assert.ok(!html.includes('[object Object]'));
});

test('report dialogs label themselves, focus visible controls, trap Tab and restore focus on Escape',()=>{
  for(const id of ['md-report-modal','md-report-list-modal']){
    const h=harness(),trigger=new h.Element('button');trigger.id='md-report-btn';h.header.appendChild(trigger);trigger.focus();
    const overlay=new h.Element();overlay.id=id;
    const dialog=new h.Element();dialog.className='card';overlay.appendChild(dialog);h.document.body.appendChild(overlay);
    const disabled=new h.Element('button');disabled.disabled=true;dialog.appendChild(disabled);
    const hidden=new h.Element('textarea');hidden.style.display='none';dialog.appendChild(hidden);
    const first=new h.Element('button'),last=new h.Element('button');dialog.appendChild(first);dialog.appendChild(last);
    h.s.prepareReportDialog(overlay,id+'-title');
    assert.equal(dialog.attributes.role,'dialog');assert.equal(dialog.attributes['aria-modal'],'true');assert.equal(dialog.attributes['aria-labelledby'],id+'-title');
    assert.equal(h.document.activeElement,first);
    const key=(key,shiftKey=false)=>{const state={key,shiftKey,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};overlay.events.keydown(state);return state;};
    assert.equal(key('Tab',true).prevented,true);assert.equal(h.document.activeElement,last);
    assert.equal(key('Tab').prevented,true);assert.equal(h.document.activeElement,first);
    dialog.focus();assert.equal(key('Tab',true).prevented,true);assert.equal(h.document.activeElement,last);
    dialog.focus();assert.equal(key('Tab').prevented,true);assert.equal(h.document.activeElement,first);
    assert.equal(key('Enter').prevented,false,'native button activation is retained');
    const escape=key('Escape');assert.ok(escape.prevented&&escape.stopped);assert.equal(h.document.getElementById(id),null);assert.equal(h.document.activeElement,trigger);
  }
});

test('closing after its original badge was removed focuses the surviving report button',()=>{
  const h=harness(),button=new h.Element('button'),badge=new h.Element('button');button.id='md-report-btn';h.header.appendChild(button);h.header.appendChild(badge);
  const overlay=new h.Element();overlay.id='md-report-list-modal';overlay._mdPreviousFocus=badge;h.document.body.appendChild(overlay);badge.remove();
  h.s.closeReportDialog(overlay);assert.equal(h.document.activeElement,button);
});
console.log(`problem report UI regressions: PASS (${passed} cases)`);
