'use strict';
// v5.47: English words in past-exam questions and choices can be tapped/hovered for meanings.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c={console,document:{readyState:'complete',createElement(){let v='';return {set innerHTML(s){v=s},get value(){return v}}},addEventListener(){},getElementById(){return null}},addEventListener(){},matchMedia:()=>({matches:false})};c.window=c;vm.createContext(c);
for(const f of ['english-study-glossary.js','english-word-study.js','english-word-popup.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const P=c.MDEnglishWordPopup;
const q={_year:2020,_short:'navi3',_session:2,'회차':2,'과목':'영어','번호':2,'문제':'Select a suitable word for the blank. "( ) means port which a vessel is bound for."','선택지':['Destination','Departure','Destiny','Datum']};
const html=P.html(q,q['문제']);
assert.match(html,/<span class="mdw" data-mdw="port">port<\/span>/);
assert.match(html,/&quot;\( \) <span/,'escaping must match escapeHtml');
assert.equal(html.replace(/<span class="mdw" data-mdw="[^"]*">([^<]*)<\/span>/g,'$1'),q['문제'].replace(/&/g,'&amp;').replace(/"/g,'&quot;'));
const port=P.lookup(q,'port');
assert.equal(port.context.startsWith('항구'),true);
assert.ok(port.basic.length>0);
assert.doesNotMatch(P.html(q,"don't <b>"),/<b>/);
// Not English, or not a navigator grade: plain escaped text, no spans.
assert.equal(P.html({...q,'과목':'항해'},'port <x>'),'port &lt;x&gt;');
assert.equal(P.hint({...q,'과목':'항해'}),'');
assert.match(P.hint(q),/단어를 누르면 뜻이 나옵니다/);
// Every English question in coverage renders at least one tappable word in its stem.
const cov=JSON.parse(fs.readFileSync('english-study/coverage.json','utf8'));
let words=0;
for(const r of cov.questions){
  const [y,s,ses,,n]=r.id.split('|');
  const qq={_year:+y,_short:s,_session:+ses,'회차':+ses,'과목':'영어','번호':+n};
  const all=r.tokens.flat();
  const hits=all.filter(w=>P.lookup(qq,w)).length;
  assert.ok(hits>0,`${r.id}: no word meanings`);
  words+=hits;
}
const idx=fs.readFileSync('index.html','utf8');
assert.equal((idx.match(/MDEnglishWordPopup\.html\(q,/g)||[]).length,4,'stem+choices in past card and pass plan');
assert.match(idx,/english-word-study\.js\?v=[^"]+"><\/script>\n<script src="english-word-popup\.js/);
console.log(`english word popup: ${cov.questions.length} questions, ${words} word tokens with meanings`);
