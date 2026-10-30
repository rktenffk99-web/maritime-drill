const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const src=fs.readFileSync('index.html','utf8');
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
function decode(s){return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):entities[e]||_);}
const c={console,document:{createElement(){let value='';return {set innerHTML(s){value=decode(s)},get value(){return value}}}}};c.window=c;vm.createContext(c);
for(const m of src.matchAll(/<script[^>]*id="(md-bundle-[^"]+)"[^>]*>([\s\S]*?)<\/script>/g)){
 if(!/past-(?:explain-|20\d\d-navi[23]-)/.test(m[1]))continue;
 vm.runInContext(zlib.gunzipSync(Buffer.from(m[2].trim(),'base64')).toString(),c);
}
for(const f of ['explain-2026-navi3-3.js','explain-2026-navi3-3-english.js','english-study-glossary.js','english-word-study.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
// Exercise the real app lookup path, including lazy-loaded and split-field fallbacks.
vm.runInContext(src.slice(src.indexOf('function getExplain(q){'),src.indexOf('// 기본 해설도 허용')),c);
c.getExplainIds=q=>[`${q._year}|${q._short}|${q['회차']}|${q['과목']}|${q['번호']}`];
const snapshot=JSON.stringify(c.MD_PAST),before=JSON.stringify(c.MD_EXPLAIN);let n=0,total=0;const samples=[];
for(const [exam,data] of Object.entries(c.MD_PAST)){
 const [year,grade,session]=exam.split('-');
 for(const source of data.questions){
  if(source['과목']!=='영어')continue;
  const q={...source,_year:Number(year),_short:grade,_session:Number(session)};
  const e=c.getExplain(q);assert(e?.html,exam+':'+q['번호']);
  assert.match(e.html,/단어별 기본 뜻·형태/);
  assert.doesNotMatch(e.html,/단어 뜻 미등록|발음 미등록|발음 미확인/);
  const sections=[q['문제'],...q['선택지']];let expectedRows=0;
  for(const section of sections){
   const ts=c.MDEnglishWordStudy.tokens(section);total+=ts.length;expectedRows+=new Set(ts.map(w=>w.toLowerCase())).size;
   for(const w of ts)assert(c.MDEnglishWordStudyData.lexicon[w.toLowerCase()],exam+' missing '+w);
  }
  const extra=c.MDEnglishWordStudy.supplement(q);
  assert.equal((extra.match(/<tr><td/g)||[]).length,expectedRows,'must represent every unique token in each section');
  assert.equal((extra.match(/<table/g)||[]).length,sections.filter(s=>c.MDEnglishWordStudy.tokens(s).length).length);
  if(c.MDEnglishWordStudy.isWatchQuestion(q)){
   assert.match(e.html,/obviously가 실제로 포함/);assert.match(e.html,/A‑VIII\/2/);
   assert.doesNotMatch(e.html,/강한 조건이 없습니다|실제 STCW 규정에는.*강한 조건/);
   samples.push({exam,number:q['번호']});
  }
  n++;
 }
}
assert.equal(n,1225);assert.equal(total,45885);
assert.equal(JSON.stringify(c.MD_PAST),snapshot,'questions and answers must not mutate');
assert.equal(JSON.stringify(c.MD_EXPLAIN),before,'legacy explanation data must not mutate');
const q={_year:2025,_short:'navi3','회차':2,'과목':'영어','번호':14,'문제':'Choose &#x4E;otify <u>i&#39;m</u>','선택지':['<img src=x onerror=alert(1)> boat','safe','','']};
const safe=c.MDEnglishWordStudy.supplement(q);assert(!safe.includes('<img'));assert(safe.includes('Notify'));assert(safe.includes('i&#39;m'));
assert.equal(c.MDEnglishWordStudy.augment({...q,_short:'navi3e'},{html:'fish'}).html,'fish');
assert.equal(c.MDEnglishWordStudy.augment({...q,'과목':'항해'},{html:'nav'}).html,'nav');
assert.equal(c.MDEnglishWordStudy.augment(q,{html:'loading',loading:true}).html,'loading');
assert.equal(c.MDEnglishWordStudy.augment({...q,'문제':'xyzzymissing'},null).html.includes('보강 필요'),true);
console.log(JSON.stringify({questions:n,wordOccurrences:total,missing:0,watchQuestionCorrections:samples}));
