#!/usr/bin/env node
'use strict';
// Inspect source question choices for reports filed 2026-11-11.
// This audit reads the exact bundled past-exam banks without changing content.
const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const index=fs.readFileSync('index.html','utf8');
const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
vm.createContext(sandbox);
const bundleRe=/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs;
for(const match of index.matchAll(bundleRe)){
  let name=match[1].replace(/^md-bundle-/,'');
  if(name.endsWith('_js'))name=name.slice(0,-3)+'.js';
  if(!/^past-20\d{2}-navi[123]e?-\d+\.js$/.test(name))continue;
  const src=zlib.gunzipSync(Buffer.from(match[2].replace(/\s+/g,''),'base64')).toString('utf8');
  vm.runInContext(src,sandbox,{filename:name});
}
const cases=[
  ['#12','2025',3,'상선전문',25,'국제기름오염방지증서'],
  ['#11','2025',2,'상선전문',25,'BWM'],
  ['#10','2025',1,'상선전문',25,'유성혼합물'],
  ['#9','2026',2,'항해',4,'자이로컴퍼스'],
  ['#8','2023',4,'법규',64,''],
  ['#7-5','2024',1,'운용',3,'Stockless anchor'],
  ['#4','2023',4,'상선전문',23,'IAMSAR'],
  ['#3','2025',4,'항해',13,'위치선'],
  ['#2','2025',4,'법규',7,'적용 대상 물질'],
  ['#1','2024',4,'법규',11,'교통안전특정해역']
];
let total=0;
for(const [label,year,round,subject,num,term] of cases){
  const found=[];
  for(const [id,paper] of Object.entries(sandbox.window.MD_PAST||{})){
    const parts=/^(20\d{2})-navi[123]e?-(\d+)$/.exec(id);
    if(!parts||parts[1]!==year||Number(parts[2])!==round||!Array.isArray(paper.questions))continue;
    for(const q of paper.questions){
      if(q['과목']!==subject||Number(q['번호'])!==num)continue;
      const stem=String(q['문제']||'');
      if(term&&!stem.includes(term))continue;
      found.push({id,question:stem,choices:q['선택지']||q.choices||[],answer:q['정답']});
    }
  }
  total+=found.length;
  console.log('REPORTED_CASE '+JSON.stringify({label,found}));
}
console.log('REPORTED_CASE_SUMMARY '+JSON.stringify({matchedBanks:total,loadedBanks:Object.keys(sandbox.window.MD_PAST||{}).length}));
