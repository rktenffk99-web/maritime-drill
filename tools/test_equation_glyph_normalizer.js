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
assert.match(index,/md-reported-choice-normalize/,'shared pastChoiceText renderer is not normalized');

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

// Verified formula reconstruction regressions — source text was compared with the exam copies.
function formulaQ(examId,subject,no){
  const exam=sandbox.window.MD_PAST[examId];
  assert.ok(exam,`${examId} missing`);
  const row=exam.questions.find(x=>x['과목']===subject&&x['번호']===no);
  assert.ok(row,`${examId} ${subject} ${no} missing`);
  fixes.patchObject(row);
  return row;
}

assert.deepEqual(Array.from(formulaQ('2020-navi2-2','상선전문',3)['선택지']),[
  'N = (10n / m) × 10','N = 10n / (10 + m)','N = 10m / (10 + n)','N = (10 + n) / (10m)'
]);
assert.equal(formulaQ('2020-navi2-3','운용',10)['선택지'][2],'GM = (w × d) / (D × tan Q)');
assert.equal(formulaQ('2022-navi2-1','상선전문',8)['선택지'][2],'F = W(1 + a / g)');
assert.equal(formulaQ('2022-navi2-2','항해',23)['선택지'][3],'I.H.P. ∝ W^(2/3)');
assert.equal(formulaQ('2024-navi2-2','항해',24)['선택지'][3],'D = V × 24 × F / (M + Q)');
assert.equal(formulaQ('2024-navi2-3','항해',9)['선택지'][2],'p = D × sin C');
assert.match(formulaQ('2024-navi2-4','운용',5)['문제'],/S = √\[h\(h \+ 2H\/w\)\]/);
assert.equal(formulaQ('2024-navi2-4','운용',10)['선택지'][1],'w × d / (Δ + w)');

assert.equal(formulaQ('2020-navi3-4','항해',5)['선택지'][1],'D = 2.074(√H + √h)');
assert.equal(formulaQ('2022-navi3e-2','어선전문',6)['선택지'][2],'t = w × d / M.T.C.');
assert.equal(formulaQ('2023-navi3-3','항해',16)['선택지'][0],'p = DLo cos L');
assert.equal(formulaQ('2024-navi3-2','상선전문',6)['선택지'][3],'[(a + b) / 2]² × (π / 4) × l × (1 / 12)');
assert.equal(formulaQ('2024-navi3-3','상선전문',1)['선택지'][3],'P = W × (10 + m) / (10n) × 1.10');
assert.equal(formulaQ('2020-navi1-2','상선전문',4)['선택지'][1],'(W / Tcm) × (1.025 / ρ₂ − 1.025 / ρ₁)');
assert.equal(formulaQ('2020-navi1-4','상선전문',12)['선택지'][2],'A(1 − r)ⁿ / A = 1/10');
assert.equal(formulaQ('2021-navi1-2','항해',8)['선택지'][0],'K ∝ sin θ / (d₁ × d₂)');
assert.equal(formulaQ('2021-navi1-3','운용',18)['선택지'][2],'v = √(2gh)');
assert.equal(formulaQ('2023-navi1-3','운용',8)['선택지'][1],'I = LB³ / 12');
assert.equal(formulaQ('2024-navi1-1','항해',4)['선택지'][2],'f_s는 송신 음파의 주파수이다.');
assert.equal(formulaQ('2024-navi1-4','항해',7)['선택지'][3],'D = 2.083(√H + √h)');
assert.equal(formulaQ('2025-navi1-3','상선전문',3)['선택지'][3],'5A / 50');


console.log(`navigator bundles tested: ${targetBundles}; analysis bundles: ${analysisBundles}; exams: ${examCount}`);
console.log(`PUA before normalization (exam) — 1급: ${beforeByGrade[1]}, 2급: ${beforeByGrade[2]}, 3급: ${beforeByGrade[3]}`);
console.log(`PUA before normalization (analysis) — 1급: ${analysisBeforeByGrade[1]}, 2급: ${analysisBeforeByGrade[2]}, 3급: ${analysisBeforeByGrade[3]}`);
console.log('PUA after normalization — exam/analysis 1/2/3급: 0');
console.log('Squatting regression: PASS');
