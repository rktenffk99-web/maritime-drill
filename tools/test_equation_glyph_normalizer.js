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
assert.ok(fixes && typeof fixes.fixString==='function','content fixer did not initialize');

const bundleRe=/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs;
const target=/^past-(20\d{2})-navi([123])(?:e)?-(\d+)\.js$/;
const analysisTarget=/^past-analysis-navi([123])\.js$/;
const beforeByGrade={1:0,2:0,3:0};
const analysisBeforeByGrade={1:0,2:0,3:0};
let targetBundles=0;
let analysisBundles=0;

assert.match(index,/data-bundled-src="reported-content-fixes\.js"/,'final index.html does not embed reported-content-fixes.js');

function bundleName(id){
  let name=id.replace(/^md-bundle-/,'');
  if(name.endsWith('_js'))name=name.slice(0,-3)+'.js';
  return name;
}
function puaCount(text){
  return (String(text).match(/[\uE000-\uF8FF]/g)||[]).length;
}

for(const match of index.matchAll(bundleRe)){
  const name=bundleName(match[1]);
  const m=name.match(target);
  const a=name.match(analysisTarget);
  if(!m && !a)continue;
  const raw=zlib.gunzipSync(Buffer.from(match[2].replace(/\s+/g,''),'base64')).toString('utf8');
  if(m){
    targetBundles++;
    beforeByGrade[m[2]]+=puaCount(raw);
  }else{
    analysisBundles++;
    analysisBeforeByGrade[a[1]]+=puaCount(raw);
  }
  vm.runInContext(raw,sandbox,{filename:name});
}

assert.ok(targetBundles>100,`unexpected navigator bundle count: ${targetBundles}`);
assert.equal(analysisBundles,3,`unexpected navigator analysis bundle count: ${analysisBundles}`);
assert.ok(sandbox.window.MD_PAST,'MD_PAST was not populated');

let afterTotal=0;
let examCount=0;
for(const exam of Object.values(sandbox.window.MD_PAST)){
  if(!exam || !exam.meta || !/^navi[123](?:e)?$/.test(exam.meta.gradeShort||''))continue;
  examCount++;
  fixes.patchObject(exam);
  afterTotal+=puaCount(JSON.stringify(exam));
}
assert.equal(afterTotal,0,'navigator 1/2/3 exam data still contains private-use equation glyphs after normalization');

fixes.patchKnownData();
const analysisAfter=puaCount(JSON.stringify(sandbox.window.MD_NAVI_FREQUENCY||{}));
assert.equal(analysisAfter,0,'navigator 1/2/3 analysis data still contains private-use equation glyphs after normalization');

// Regression: user-reported screenshot case — 2022 3회 2급 운용.
const exam=sandbox.window.MD_PAST['2022-navi2-3'];
assert.ok(exam,'2022-navi2-3 exam missing');
const q=exam.questions.find(x=>x['과목']==='운용' && x['번호']===6);
assert.ok(q,'2022-navi2-3 운용 6번 missing');
assert.match(q['문제'],/Cb:\s*방형계수/);
assert.doesNotMatch(q['문제'],/\]\s*b\s*$/);
assert.deepEqual(Array.from(q['선택지']),[
  'S = Cb × V² / 100',
  'S = Cb × V / 100',
  'S = Cb² × V² / 10',
  'S = Cb² × V / 10'
]);

// Same malformed source pattern appears in an earlier 2급 paper.
const exam2021=sandbox.window.MD_PAST['2021-navi2-2'];
assert.ok(exam2021,'2021-navi2-2 exam missing');
const q2021=exam2021.questions.find(x=>x['과목']==='운용' && x['번호']===7);
assert.ok(q2021,'2021-navi2-2 운용 7번 missing');
assert.ok(q2021['선택지'].every(x=>!/[\uE000-\uF8FF]/.test(x)));
assert.match(q2021['선택지'][0],/^S = Cb × V² \/ 100/);

console.log(`navigator bundles tested: ${targetBundles}; analysis bundles: ${analysisBundles}; exams: ${examCount}`);
console.log(`PUA before normalization (exam) — 1급: ${beforeByGrade[1]}, 2급: ${beforeByGrade[2]}, 3급: ${beforeByGrade[3]}`);
console.log(`PUA before normalization (analysis) — 1급: ${analysisBeforeByGrade[1]}, 2급: ${analysisBeforeByGrade[2]}, 3급: ${analysisBeforeByGrade[3]}`);
console.log('PUA after normalization — exam/analysis 1/2/3급: 0');
console.log('Squatting regression: PASS');
