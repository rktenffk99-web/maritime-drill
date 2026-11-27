'use strict';
// v5.51: underline targets read from the official booklets restore lost English questions.
const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('node:assert/strict');
const ctx={console};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('reported-content-fixes.js','utf8'),ctx);
const api=ctx.__mdReportedContentFixes;
const html=fs.readFileSync('index.html','utf8');
const s={};s.window=s;vm.createContext(s);
for(const m of html.matchAll(/id="md-bundle-past-(20(?:2[0-5])-navi[23]-\d)_js">([^<]+)</g))vm.runInContext(zlib.gunzipSync(Buffer.from(m[2],'base64')).toString(),s);
const li={localStorage:{getItem(){return null},setItem(){}}};li.window=li;vm.createContext(li);
vm.runInContext(fs.readFileSync('learning-integrity.js','utf8'),li);
let restored=0;
const terms={};
for(const [id,p] of Object.entries(s.MD_PAST)){
  for(const q0 of p.questions){
    if(!/\bunderlined\b/i.test(q0['문제']))continue;
    const q=JSON.parse(JSON.stringify(q0));
    api.patchObject(q);
    const m=q['문제'].match(/\[밑줄: ([^\]]+)\]$/);
    assert.ok(m,'still missing underline: '+id+' '+q0['번호']);
    assert.equal(li.__mdLearningIntegrity.contentIssue(q),'',id+' '+q0['번호']);
    terms[id+'|'+q0['번호']]=m[1];restored++;
  }
}
assert.ok(restored>=61,'restored '+restored);
assert.equal(terms['2020-navi2-2|14'],'contraband');
assert.equal(terms['2021-navi3-1|17'],'conversant');     // same stem as below,
assert.equal(terms['2024-navi2-1|20'],'instigating');    // different underline
assert.equal(terms['2020-navi3-2|8'],'stopped temporarily');
assert.match(terms['2021-navi2-3|15'],/^that — /);
// answer key untouched, idempotent
const q=JSON.parse(JSON.stringify(s.MD_PAST['2020-navi2-2'].questions.find(r=>r['과목']==='영어'&&r['번호']===14)));
api.patchObject(q);const once=q['문제'];api.patchObject(q);assert.equal(q['문제'],once);
assert.equal(q['정답'],3);
console.log('underline v551: PASS ('+restored+' questions)');
