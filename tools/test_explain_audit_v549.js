'use strict';
// v5.49 navigator explanation audit: one answer-key fix, rewrites, wording, figure exclusions.
const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function bundle(id){const m=html.match(new RegExp(`<script type="application/gzip" id="md-bundle-${id}_js">([^<]+)</script>`));assert.ok(m,id);return zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8');}
const s={};s.window=s;vm.createContext(s);
for(const y of [2020,2021,2022,2023,2024,2025,2026])vm.runInContext(bundle('past-explain-'+y),s);
vm.runInContext(bundle('past-2020-navi2-2'),s);
const text=k=>s.MD_EXPLAIN[k].html.replace(/<[^>]+>/g,'').replace(/㉴/g,'㉰').replace(/㉵/g,'㉱');
// 1. answer key: 선적항 (시행규칙 제16조), same as 2021-navi2-3 and 2024-navi2-4
const q=s.MD_PAST['2020-navi2-2'].questions.find(r=>r['과목']==='법규'&&r['번호']===5);
assert.equal(q['선택지'][q['정답']],'선박의 선적항');
assert.match(text('2020|navi2|2|법규|5'),/정답은 ㉯이다/);
// 2. rewrites argue for the data answer
assert.match(text('2026|navi2|2|운용|12'),/북고남저형이고[\s\S]*정답은 ㉮이다/);
assert.doesNotMatch(text('2026|navi2|2|운용|12'),/서고 ?동저형에 해당합니다/);
assert.match(text('2023|navi2|3|운용|10'),/복원력 소실각[\s\S]*정답은 ㉯이다/);
assert.doesNotMatch(text('2023|navi2|3|운용|10'),/위험 횡요각\(危險橫搖角, Angle of Vanishing Stability\)/);
assert.match(text('2024|navi2|3|운용|11'),/57\.3° 위치의 ③[\s\S]*정답은 ㉰이다/);
// 3. the answer bullet no longer calls the answer "오답"
const M='㉮㉯㉰㉱';
for(const k of ['2024|navi2|1|운용|13','2024|navi3|4|상선전문|22','2023|navi2|3|법규|24','2023|navi3|4|법규|2','2025|navi3|1|법규|5']){
  const [y,g,ses,sub,n]=k.split('|');vm.runInContext(bundle(`past-${y}-${g}-${ses}`),s);
  const a=s.MD_PAST[`${y}-${g}-${ses}`].questions.find(r=>r['과목']===sub&&String(r['번호'])===n)['정답'];
  const line=text(k).split('•').find(x=>x.trim().startsWith(M[a]));
  assert.ok(line,k);assert.doesNotMatch(line,/오답(?!\s*(?:이\s*)?아님)/,k);assert.match(line,/정답/,k);
}
// 4. figure questions whose picture was not extracted are excluded
const li={localStorage:{getItem(){return null},setItem(){}}};li.window=li;vm.createContext(li);
vm.runInContext(fs.readFileSync('learning-integrity.js','utf8'),li);
const F=li.__mdLearningIntegrity.figureMissing;
assert.ok(F('다음의 정적 복원력 곡선에서 GM은?'));
assert.ok(F('In the following figure, which sentence expresses the position of No.1 buoy according to IMO SMCP?'));
assert.ok(!F('정적 복원력 곡선에서 위험 횡요각에 대한 설명으로옳지 않은 것은?'));
assert.ok(!F('"전단력 곡선에서 전단력의 극대값은 ( )이 ( )과교차하는 모든 점에서 나타난다."'));
// 5. the four pictures now come from the official booklets, so they are usable again
const fig={};fig.window=fig;vm.createContext(fig);vm.runInContext(fs.readFileSync('figure-images-data.js','utf8'),fig);
for(const k of ['2024-navi2-3|운용|11','2024-navi2e-3|운용|11','2020-navi3-4|영어|4','2020-navi3-4|영어|5','2022-navi3-4|영어|4','2022-navi3e-4|영어|4'])
  assert.match(fig.__MD_FIGURE_IMAGE_DATA[k].src,/^data:image\/webp;base64,/,k);
const issue=li.__mdLearningIntegrity.contentIssue;
assert.equal(issue({'문제':'다음의 정적 복원력 곡선에서 GM은?','선택지':['①','②','③','④'],'정답':2,_figureImage:'data:image/webp;base64,AA'}),'');
console.log('explain audit v549: PASS');
