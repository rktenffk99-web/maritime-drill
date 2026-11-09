const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={document:{createElement(){let value='';return {set innerHTML(s){value=s},get value(){return value}}}}};c.window=c;vm.createContext(c);
for(const f of ['english-study-glossary.js','english-word-study.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const d=c.MDEnglishWordStudyData;
const snapshot=JSON.stringify(d);
let checked=0;
for(const [key,sections] of Object.entries(d.pronunciationContexts)){
 const [year,grade,session,,number]=key.split('|');
 for(const [index,section] of Object.entries(sections)){
  const q={_year:Number(year),_short:grade,_session:Number(session),'과목':'영어','번호':Number(number),'문제':'','선택지':['','','','']};
  if(Number(index)===0)q['문제']=section.text;else q['선택지'][Number(index)-1]=section.text;
  const html=c.MDEnglishWordStudy.supplement(q);
  for(const reading of Object.values(section.readings)){assert(html.includes('발음: '+reading),key+' exact-context reading missing');checked++;}
  // A changed sentence must fall back to explicit alternatives, never inherit POS.
  if(Number(index)===0)q['문제']+=' changed';else q['선택지'][Number(index)-1]+=' changed';
  assert(c.MDEnglishWordStudy.supplement(q).includes('문맥별 선택 필요'));
 }
}
const q={_year:2099,_short:'navi3',_session:1,'과목':'영어','번호':1,'문제':'buoy invalid brocheures use close','선택지':[]};
const html=c.MDEnglishWordStudy.supplement(q);
assert(html.includes('미국식 /ˈbuːi/ 또는 /bɔɪ/ · 영국식 /bɔɪ/'));
assert(html.includes('발음: 발음 미확정'));
assert(html.includes('명사 /ˈjus/ · 동사 /ˈjuz/ (문맥별 선택 필요)'));
assert(html.includes('/ɪnˈvælɪd/'));
const legacy={html:'<span style="color:#0EA5E9">bags</span> <span style="color:#94A3B8">[백스]</span> → 포대<br><span>handle bags</span> <span style="color:#94A3B8">[핸들 백스]</span> → 포대를 다루다'};
const old=JSON.stringify(legacy),patched=c.MDEnglishWordStudy.augment(q,legacy).html;
assert(patched.includes('[/ˈbæɡz/]'));
assert(patched.includes('[핸들 백즈]'));
assert(!patched.includes('[백스]'));
assert(patched.includes('→ 포대를 다루다'));
assert.equal(JSON.stringify(legacy),old,'legacy source explanation mutated');
// Apply phrase corrections only to the reviewed English token. Identical
// Korean strings belonging to other English words must not be rewritten.
const contextual={html:'<span>holds water</span> <span style="color:#94A3B8">[홀즈 워터]</span><br><span>holes</span> <span style="color:#94A3B8">[홀즈]</span><br><span>holds and holes</span> <span style="color:#94A3B8">[홀즈 앤드 홀즈]</span>'};
const fixed=c.MDEnglishWordStudy.augment(q,contextual).html;
assert(fixed.includes('[홀드즈 워터]'));
assert(fixed.includes('[홀즈]'));
assert(fixed.includes('[홀즈 앤드 홀즈]'));
const saint={_year:2025,_short:'navi3',_session:3,'과목':'영어','번호':2,'문제':d.pronunciationContexts['2025|navi3|3|영어|2']['0'].text,'선택지':[]};
assert(c.MDEnglishWordStudy.supplement(saint).includes('saint의 축약형 /ˈseɪnt/'));
const phase=c.MDEnglishWordStudy.augment(q,{html:'<span>St. Nicholas</span> <span style="color:#94A3B8">[스트리트 니콜라스]</span>'}).html;
assert(phase.includes('[세인트 니콜라스]'));
assert.equal(JSON.stringify(d),snapshot,'rendering mutated dictionary/context data');
console.log(JSON.stringify({reviewedContextReadings:checked,staleContextFallback:true,unknownSpellingNoGuess:true,dialectAlternatives:true}));
