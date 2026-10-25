#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');

const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('reported-content-fixes.js','utf8');
const reported=[
  {exam:'2024-navi3-4',subject:'법규',number:11,last:'도선사의 사용'},
  {exam:'2025-navi3-4',subject:'법규',number:7,last:'잔류성오염물질'},
  {exam:'2025-navi3-4',subject:'항해',number:13,last:'수평거리에 의한 위치선'},
  {exam:'2023-navi2-4',subject:'상선전문',number:23,last:'Williamson turn'},
  {exam:'2024-navi2-1',subject:'운용',number:3,last:'5~7배'},
  // The report's Q64 is its displayed queue position, not source question 7.
  {exam:'2023-navi2-4',subject:'법규',number:7,last:'12, 4'},
];
const rawScripts=new Map();
for(const match of html.matchAll(/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs)){
  const name=match[1].replace(/^md-bundle-/,'').replace(/_js$/,'.js');
  if(reported.some(row=>name===`past-${row.exam}.js`)){
    rawScripts.set(name,zlib.gunzipSync(Buffer.from(match[2].replace(/\s+/g,''),'base64')).toString('utf8'));
  }
}

function extract(start,end){
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,`missing app function ${start}`);
  return html.slice(a,b);
}

async function main(){
  const sandbox={console,Set,Map,PAST_GRADE_MAP:{navi2:['navi2'],navi3:['navi3']},pastDataSubjectsLoaded:new Set()};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  sandbox.getPastDataFilesForSubject=grade=>[...rawScripts.keys()].filter(name=>name.includes(`-${grade}-`));
  sandbox.loadScriptsWithLimit=async files=>files.map(name=>{
    vm.runInContext(rawScripts.get(name),sandbox,{filename:name});
    return true;
  });
  vm.runInContext(extract('function getPastExamsForSubject(subjectId){','// v4.34:'),sandbox);
  vm.runInContext(extract('async function ensurePastDataForSubject(subjectId){','async function ensurePastExplainForYears(years){'),sandbox);
  // The correction script boots before the compressed paper data is loaded.
  vm.runInContext(source,sandbox,{filename:'reported-content-fixes.js'});
  assert.equal(sandbox.MD_PAST,undefined);
  await sandbox.ensurePastDataForSubject('navi2');
  await sandbox.ensurePastDataForSubject('navi3');
  const fixes=sandbox.__mdReportedContentFixes;
  vm.runInContext(extract('function pastChoiceText(value){','function renderPastCard(){'),sandbox);

  for(const row of reported){
    const rawContext={window:{}};
    vm.createContext(rawContext);
    vm.runInContext(rawScripts.get(`past-${row.exam}.js`),rawContext);
    const raw=rawContext.window.MD_PAST[row.exam].questions.find(q=>q['과목']===row.subject&&q['번호']===row.number);
    const q=sandbox.MD_PAST[row.exam].questions.find(q=>q['과목']===row.subject&&q['번호']===row.number);
    assert.ok(raw&&q,JSON.stringify(row));
    assert.match(raw['선택지'][3],/\s+\d+\s*-$/,'fixture must reproduce the reported corruption');
    assert.equal(q['선택지'][3],row.last,`lazy load: ${row.exam} ${row.subject} ${row.number}`);
    assert.equal(q['정답'],raw['정답'],'a text-only repair must preserve the answer');
    assert.deepEqual(Array.from(q['선택지'].slice(0,3)),Array.from(raw['선택지'].slice(0,3)));
    // Renderer fallback handles old copies and homework's shuffled positions.
    const shuffled=[raw['선택지'][3],...raw['선택지'].slice(0,3)];
    assert.equal(fixes.fixChoiceText(shuffled[0]),row.last);
    assert.equal(sandbox.pastChoiceText(shuffled[0]),row.last,'the deployed renderer must repair old/shuffled choices');
  }
  for(const text of ['-4','x - 4','12, 4','5~7배','Rule 11','(-2) × 4','10 − 2','3 - 2']){
    assert.equal(fixes.fixChoiceText(text),text,`valid number/formula must remain: ${text}`);
  }
  assert.equal(fixes.fixString('본문 4 -'),'본문 4 -','page suffix stripping is choice-specific');
  console.log('reported lazy content: PASS (8 reports / 6 source questions, lazy load + shuffled cached choices + preserved answers/numbers)');
}

main().catch(error=>{console.error(error);process.exitCode=1});
