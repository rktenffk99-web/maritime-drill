'use strict';
// v5.55: key terms in navigator (non-English) questions show a short definition on tap/hover.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c={console,document:{readyState:'complete',addEventListener(){},getElementById(){return null}},addEventListener(){},matchMedia:()=>({matches:false})};c.window=c;vm.createContext(c);
for(const f of ['navi-term-glossary.js','english-study-glossary.js','english-word-study.js','english-word-popup.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const P=c.MDEnglishWordPopup,G=c.MDNaviTermGlossary;
assert.ok(G.terms.length>3000,'glossary has terms');
const k=Object.keys(G.keys).find(x=>/\|운용\|/.test(x));
const [y,s,ses,sub,n]=k.split('|');
const q={_year:+y,_short:s,_session:+ses,'회차':+ses,'과목':sub,'번호':+n};
const list=P.termList(q);
assert.ok(list.length>0);
const [name,def]=list[0];
const raw=`앞 ${name} <뒤> & "끝"`;
const out=P.html(q,raw);
assert.ok(out.includes(`<span class="mdw" data-mdt="${name}">${name}</span>`),'term wrapped');
assert.equal(out.replace(/<span class="mdw" data-mdt="[^"]*">([^<]*)<\/span>/g,'$1'),raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),'escaping unchanged');
assert.deepEqual({...P.termLookup(q,name)},{name,definition:def});
// Other questions, English and non-navigator grades stay plain.
assert.equal(P.html({...q,'번호':999},`${name} <x>`),`${name} &lt;x&gt;`);
assert.equal(P.html({...q,_short:'engi3'},`${name}`),name);
assert.equal(P.termList({...q,'과목':'영어'}).length,0);
// No definition names an answer marker or says 정답/오답.
for(const [t,d] of G.terms)assert.doesNotMatch(d,/정답|오답|㉮|㉯|㉰|㉱/,t);
assert.ok(!G.terms.some(([t])=>t==='레이더'||t==='선박법'),'basic words excluded');
const idx=fs.readFileSync('index.html','utf8');
assert.match(idx,/english-word-study\.js\?v=[^"]+"><\/script>\n<script src="navi-term-glossary\.js\?v=[^"]+"><\/script>\n<script src="english-word-popup\.js/);
console.log(`navi term popup: ${G.terms.length} terms over ${Object.keys(G.keys).length} questions`);
