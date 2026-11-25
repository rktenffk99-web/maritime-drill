'use strict';
// v5.41: pictures cropped from the official booklets make figure questions usable again.
const fs=require('fs'),path=require('path'),vm=require('vm'),zlib=require('zlib'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');process.chdir(root);
const html=fs.readFileSync('index.html','utf8');
function bundle(id){
  const m=html.match(new RegExp(`<script type="application/gzip" id="md-bundle-past-${id}_js">([^<]+)</script>`));
  assert.ok(m,'bundle '+id);return zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8');
}
function sandbox(){
  const s={MD_PAST:{},localStorage:{getItem(){return null},setItem(){}},document:{readyState:'complete'}};s.window=s;vm.createContext(s);
  for(const f of ['learning-integrity.js','data-identity.js','figure-images-data.js'])vm.runInContext(fs.readFileSync(f,'utf8'),s,{filename:f});
  s.getPastExam=(short,year,session)=>s.MD_PAST[`${year}-${short}-${session}`]||null;
  s.ensurePastDataForSubject=async()=>Object.values(s.MD_PAST);
  vm.runInContext(fs.readFileSync('figure-images.js','utf8'),s,{filename:'figure-images.js'});
  return s;
}
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n)};
(async()=>{
  const s=sandbox(),data=s.__MD_FIGURE_IMAGE_DATA,keys=Object.keys(data);
  await test('every figure points at one real question that lacked its picture',()=>{
    assert.ok(keys.length>=20);
    const before=sandbox();before.__MD_FIGURE_IMAGE_DATA={};
    for(const key of keys){
      const [id,subject,no]=key.split('|');
      if(!before.MD_PAST[id])vm.runInContext(bundle(id),before);
      const rows=before.MD_PAST[id].questions.filter(q=>q['과목']===subject&&Number(q['번호'])===Number(no));
      assert.equal(rows.length,1,key);
      const q=rows[0],issue=before.__mdLearningIntegrity.contentIssue(q)||before.__mdDataIdentity.questionIssue(q);
      assert.ok(issue,key+' was already usable');
      assert.match(data[key].src,/^data:image\/webp;base64,/);
    }
  });
  await test('restored questions become usable through getPastExam and lazy loads',async()=>{
    for(const id of new Set(keys.map(k=>k.split('|')[0])))vm.runInContext(bundle(id),s);
    await s.ensurePastDataForSubject('navi3');
    for(const key of keys){
      const [id,subject,no]=key.split('|'),[year,short,session]=id.split('-');
      const q=s.getPastExam(short,year,session).questions.find(r=>r['과목']===subject&&Number(r['번호'])===Number(no));
      assert.equal(s.__mdLearningIntegrity.contentIssue(q),'',key);
      assert.equal(s.__mdDataIdentity.questionIssue(q),'',key);
      assert.ok(q._figureImage,key);
    }
  });
  await test('reported 2024 3급 4회 항해 8번 shows its <보기> picture; answer unchanged',()=>{
    const q=s.getPastExam('navi3',2024,4).questions.find(r=>r['과목']==='항해'&&r['번호']===8);
    assert.equal(q['정답'],1);assert.equal(q['선택지'][1],'Pilot station');
    const h=s.__mdFigureImages.html(q);assert.match(h,/<img src="data:image\/webp;base64,/);assert.match(h,/한국해양수산연수원/);
  });
  await test('picture-only choices get ordinal labels that survive shuffling; existing text choices stay',()=>{
    const all=s.getPastExam('navi3',2021,2).questions.find(r=>r['과목']==='항해'&&r['번호']===8);
    assert.deepEqual(JSON.parse(JSON.stringify(all['선택지'])),['그림의 첫 번째 보기','그림의 두 번째 보기','그림의 세 번째 보기','그림의 네 번째 보기']);
    const part=s.getPastExam('navi3',2020,3).questions.find(r=>r['과목']==='운용'&&r['번호']===15);
    assert.deepEqual(JSON.parse(JSON.stringify(part['선택지'])),['▲','●','그림의 세 번째 보기','△']);
  });
  await test('html is empty for ordinary questions and never renders a non-image URL',()=>{
    assert.equal(s.__mdFigureImages.html({'문제':'x'}),'');
    assert.equal(s.__mdFigureImages.html({_figureImage:'javascript:alert(1)'}),'');
  });
  await test('the app renders the figure in the paper, review and homework cards',()=>{
    assert.equal((html.match(/__mdFigureImages\.html\(q\)/g)||[]).length,3);
    assert.match(fs.readFileSync('keyboard-controls.js','utf8'),/mdLoadAuxScript\('figure-images-data\.js'\);\nmdLoadAuxScript\('figure-images\.js'\);/);
  });
  console.log(`${passed} figure-image checks passed`);
})().catch(e=>{console.error(e);process.exit(1)});
