#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');

const index=fs.readFileSync('index.html','utf8');
const sandbox={window:{},console:{log(){},warn(){},error(){}}};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);

const bundleRe=/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs;
const target=/^past-(20\d{2})-navi([123])(?:e)?-(\d+)\.js$/;

function bundleName(id){
  let name=id.replace(/^md-bundle-/,'');
  if(name.endsWith('_js'))name=name.slice(0,-3)+'.js';
  return name;
}
function puaCount(text){return (String(text).match(/[\uE000-\uF8FF]/g)||[]).length}
function compact(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function looksFormula(v){
  const s=String(v==null?'':v);
  return puaCount(s)>0 || /(?:계산식|공식|구하는 식|비례|tan|sin|cos|sqrt|√|ρ|λ|θ|GM|GZ|Tcm|MCT|IHP|DWT|TPC|Cb|\^|[=×÷])/i.test(s);
}

for(const m of index.matchAll(bundleRe)){
  const name=bundleName(m[1]);
  if(!target.test(name))continue;
  const raw=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
  vm.runInContext(raw,sandbox,{filename:name});
}

const rows=[];
for(const [examId,exam] of Object.entries(sandbox.window.MD_PAST||{})){
  const gm=/^(20\d{2})-navi([123])(?:e)?-(\d+)$/.exec(examId);
  if(!gm||!exam||!Array.isArray(exam.questions))continue;
  for(const q of exam.questions){
    const stem=q['문제']??q.question??'';
    const choices=q['선택지']??q.choices??[];
    const joined=[stem,...(Array.isArray(choices)?choices:[])].join(' ');
    if(!looksFormula(joined))continue;
    const pc=puaCount(joined);
    // Prioritize likely broken equation/font extraction rather than ordinary textual math.
    if(pc===0 && !/(계산식|공식|구하는 식|GM|GZ|Tcm|MCT|IHP|Cb|tan|sin|cos|ρ|λ|θ)/i.test(joined))continue;
    rows.push({
      examId,
      year:Number(gm[1]),
      grade:Number(gm[2]),
      session:Number(gm[3]),
      no:q['번호']??q.no??null,
      subject:q['과목']??q.subject??'',
      answer:q['정답']??q.answer??null,
      pua:pc,
      stem:compact(stem),
      choices:(Array.isArray(choices)?choices:[]).map(compact)
    });
  }
}

rows.sort((a,b)=>a.grade-b.grade||a.year-b.year||a.session-b.session||String(a.subject).localeCompare(String(b.subject),'ko')||(a.no??0)-(b.no??0));
const byGrade={1:0,2:0,3:0}, puaByGrade={1:0,2:0,3:0};
for(const r of rows){byGrade[r.grade]++;puaByGrade[r.grade]+=r.pua}
console.log('FORMULA_CANDIDATE_SUMMARY '+JSON.stringify({count:rows.length,byGrade,puaByGrade}));
for(const r of rows)console.log('FORMULA_CANDIDATE '+JSON.stringify(r));
