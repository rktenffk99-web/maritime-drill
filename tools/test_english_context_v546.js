'use strict';
// v5.46: key words in each English question show the meaning in that sentence first.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c={console,document:{createElement(){let v='';return {set innerHTML(s){v=s},get value(){return v}}}}};c.window=c;vm.createContext(c);
for(const f of ['english-study-glossary.js','english-word-study.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const d=c.MDEnglishWordStudyData,ctx=d.context;
const cov=JSON.parse(fs.readFileSync('english-study/coverage.json','utf8'));
const done=fs.readdirSync('english-study/context-meanings').filter(f=>/^\d{4}-/.test(f)).map(f=>f.slice(0,4));
for(const year of new Set(done)){
  const ids=cov.questions.map(r=>r.id).filter(id=>id.startsWith(year+'|'));
  const missing=ids.filter(id=>!ctx[id]);
  assert.deepEqual(missing,[],`${year} questions without context meanings`);
  for(const id of ids){
    const words=new Set(cov.questions.find(r=>r.id===id).tokens.flat());
    const n=Object.keys(ctx[id]).length;
    assert.ok(n>=2,`${id} has only ${n} context words`);
    for(const w of Object.keys(ctx[id]))assert.ok(words.has(w),`${id}: ${w} not in question`);
  }
}
// '좌현'이 아니라 '항구'로 읽어야 하는 문장에서 문맥 뜻이 먼저 나온다.
const q={_year:2020,_short:'navi3',_session:2,'회차':2,'과목':'영어','번호':2,'문제':'Select a suitable word for the blank. "( ) means port which a vessel is bound for."','선택지':['Destination','Departure','Destiny','Datum']};
const html=c.MDEnglishWordStudy.supplement(q);
assert.match(html,/이 문장에서:<\/b> 항구/);
assert.match(html,/기본: /);
console.log(`english context meanings: ${Object.keys(ctx).length} questions, ${Object.values(ctx).reduce((a,o)=>a+Object.keys(o).length,0)} words`);
