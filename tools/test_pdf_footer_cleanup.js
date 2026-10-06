#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');

const index=fs.readFileSync('index.html','utf8');
const fixerCode=fs.readFileSync('reported-content-fixes.js','utf8');

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fixerCode,sandbox,{filename:'reported-content-fixes.js'});

const fixes=sandbox.window.__mdReportedContentFixes;
assert.ok(fixes && typeof fixes.patchObject==='function');
assert.equal(fixes.stripPdfFooterArtifact('outstanding 6 -'),'outstanding');
assert.equal(fixes.stripPdfFooterArtifact('x - 4'),'x - 4');
assert.equal(fixes.stripPdfFooterArtifact('-4'),'-4');
assert.equal(fixes.stripPdfFooterArtifact('Rule 11'),'Rule 11');

const bundleRe=/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs;
const target=/^past-(20\d{2})-navi([123])(?:e)?-(\d+)\.js$/;
const suffix=/\s+(?:[1-9]|1[01])\s*-\s*$/;

function bundleName(id){
  let name=id.replace(/^md-bundle-/,'');
  if(name.endsWith('_js'))name=name.slice(0,-3)+'.js';
  return name;
}

for(const m of index.matchAll(bundleRe)){
  const name=bundleName(m[1]);
  if(!target.test(name))continue;
  const raw=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
  vm.runInContext(raw,sandbox,{filename:name});
}

let before=0;
let nonLastBefore=0;
let after=0;
const gradeBefore={1:0,2:0,3:0};

for(const [examId,exam] of Object.entries(sandbox.window.MD_PAST||{})){
  const gm=/^(20\d{2})-navi([123])(?:e)?-(\d+)$/.exec(examId);
  if(!gm||!exam||!Array.isArray(exam.questions))continue;

  for(const q of exam.questions){
    const choices=q['선택지']??q.choices??[];
    if(!Array.isArray(choices)||!choices.length)continue;

    for(let i=0;i<choices.length;i++){
      if(suffix.test(String(choices[i]))){
        before++;
        gradeBefore[gm[2]]++;
        if(i!==choices.length-1)nonLastBefore++;
      }
    }

    fixes.patchObject(q);

    for(const choice of (q['선택지']??q.choices??[])){
      if(suffix.test(String(choice)))after++;
    }
  }
}

assert.ok(before>=1000,`expected large corpus of PDF footer artifacts, got ${before}`);
assert.equal(nonLastBefore,0,'PDF footer suffix unexpectedly appears outside final choice');
assert.equal(after,0,'PDF footer artifacts remain after normalization');

console.log('PDF footer cleanup: PASS '+JSON.stringify({before,after,gradeBefore}));
