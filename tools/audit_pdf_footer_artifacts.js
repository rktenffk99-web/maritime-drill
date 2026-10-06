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
function compact(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}

for(const m of index.matchAll(bundleRe)){
  const name=bundleName(m[1]);
  if(!target.test(name))continue;
  const raw=zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8');
  vm.runInContext(raw,sandbox,{filename:name});
}

const rows=[];
const suffixPatterns=[
  {kind:'page_num_dash',re:/\s+(\d{1,2})\s*-\s*$/},
  {kind:'dash_page_num',re:/\s+-\s*(\d{1,2})\s*$/},
  {kind:'spaced_dash_page_dash',re:/\s+-\s*(\d{1,2})\s*-\s*$/},
];

for(const [examId,exam] of Object.entries(sandbox.window.MD_PAST||{})){
  const gm=/^(20\d{2})-navi([123])(?:e)?-(\d+)$/.exec(examId);
  if(!gm||!exam||!Array.isArray(exam.questions))continue;
  for(const q of exam.questions){
    const subject=q['과목']??q.subject??'';
    const no=q['번호']??q.no??null;
    const fields=[['stem',q['문제']??q.question??'']];
    const choices=q['선택지']??q.choices??[];
    if(Array.isArray(choices))choices.forEach((x,i)=>fields.push(['choice'+i,x]));
    for(const [field,value] of fields){
      const s=compact(value);
      for(const p of suffixPatterns){
        const m=s.match(p.re);
        if(!m)continue;
        rows.push({examId,grade:Number(gm[2]),session:Number(gm[3]),subject,no,field,kind:p.kind,page:Number(m[1]),text:s});
        break;
      }
    }
  }
}

rows.sort((a,b)=>a.grade-b.grade||a.examId.localeCompare(b.examId)||String(a.subject).localeCompare(String(b.subject),'ko')||(a.no??0)-(b.no??0)||a.field.localeCompare(b.field));
const byGrade={1:0,2:0,3:0};
const byKind={};
const byPage={};
for(const r of rows){
  byGrade[r.grade]=(byGrade[r.grade]||0)+1;
  byKind[r.kind]=(byKind[r.kind]||0)+1;
  byPage[r.page]=(byPage[r.page]||0)+1;
}
console.log('PDF_FOOTER_ARTIFACT_SUMMARY '+JSON.stringify({count:rows.length,byGrade,byKind,byPage}));
for(const r of rows)console.log('PDF_FOOTER_ARTIFACT '+JSON.stringify(r));
