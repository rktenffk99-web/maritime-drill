'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),zlib=require('zlib'),os=require('os'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
function rng(seed=81){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const scope={console};scope.window=scope;vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'balanced-mock.js'),'utf8'),scope);
const engine=scope.__mdBalancedMock;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const data={rules:[{subject:'항해',id:'classified',pattern:'^classified '}]};
function item(key,question,extra={}){return {key,subject:'항해',question,hits:[{year:2026}],...extra}}
const uniform=Array.from({length:100},(_,i)=>item('c'+i,'classified '+i)).concat(Array.from({length:100},(_,i)=>item('u'+i,'other '+i)));
test('classification coverage does not multiply per-question draw probability',()=>{
  const random=rng(1739);let classified=0,total=0;
  for(let run=0;run<160;run++){
    const draw=engine.predictiveSample(uniform,{data,count:25,weight:()=>1,random});
    assert.equal(draw.length,25);assert.equal(new Set(draw.map(x=>x.key)).size,25);
    classified+=draw.filter(x=>x.key.startsWith('c')).length;total+=draw.length;
  }
  assert.ok(classified/total>0.46&&classified/total<0.54,{classified,total});
  console.log('  uniform classified share '+(100*classified/total).toFixed(2)+'% (bank 50%)');
});
test('question weights are retained without replacement',()=>{
  const items=[item('high','high'),item('low','low')],random=rng(7);let high=0;
  for(let i=0;i<2000;i++)high+=engine.predictiveSample(items,{count:1,weight:q=>q.key==='high'?9:1,random})[0].key==='high';
  assert.ok(high>1720&&high<1880,high);
  assert.equal(engine.predictiveSample(items,{count:50,weight:()=>0,random}).length,2);
});
test('same stems with different choices remain separate; shuffled identical content deduplicates',()=>{
  const a=item('a','Select the correct one.',{choices:['north','south','east','west'],answer:0});
  const b=item('b','Select the correct one.',{choices:['rain','snow','hail','fog'],answer:1});
  const alias=item('alias','Select the correct one.',{choices:['west','east','north','south'],answer:2});
  assert.notEqual(engine.fingerprint(a),engine.fingerprint(b));assert.equal(engine.fingerprint(a),engine.fingerprint(alias));
  const draw=engine.predictiveSample([a,b,alias],{count:25,random:rng()});assert.equal(draw.length,2);
  assert.equal(engine.select([a,b,alias],{gradeId:'navi2',data,state:null,count:25}).items.length,2);
  assert.equal(engine.evaluationSelect([a,b,alias],{gradeId:'navi2',data,state:null,count:25}).items.length,2);
});
test('evaluation eventually tests the one-question topic rather than rounding it to zero forever',()=>{
  const items=Array.from({length:299},(_,i)=>item('major'+i,'classified '+i)).concat([item('rare','rare only')]);
  let state=null;const random=rng(29),seen=new Set();let rare=0;
  for(let i=0;i<36;i++){
    const previous=new Set(engine.normalize(state).grades.navi2.recent.flat());
    const draw=engine.evaluationSelect(items,{gradeId:'navi2',data,state,count:25,identity:q=>q.key,random});
    assert.equal(draw.items.length,25);assert.ok(draw.identities.every(id=>!previous.has(id)));
    draw.identities.forEach(id=>seen.add(id));rare+=draw.identities.includes('rare');state=engine.record(state,'navi2',draw.identities);
  }
  assert.equal(seen.size,300);assert.equal(rare,3);
  assert.ok(Object.values(state.grades.navi2.seen).every(row=>row[0]===3));
});
test('evaluation short pools relax exclusions and preserve subject size without duplicates',()=>{
  const items=uniform.slice(0,50);let state=engine.record(null,'navi2',items.slice(0,25).map(q=>q.key));state=engine.record(state,'navi2',items.slice(25).map(q=>q.key));
  const draw=engine.evaluationSelect(items,{gradeId:'navi2',data,state,count:25,identity:q=>q.key,random:rng()});
  assert.equal(draw.recentWindow,1);assert.equal(draw.items.length,25);assert.ok(draw.identities.every(id=>items.slice(0,25).some(q=>q.key===id)));
});
test('legacy representative exposure is retained without crediting new variants or unsafe clusters',()=>{
  const representative=item('navi2|old','old representative',{choices:['a','b','c','d'],answer:0});
  const variant=item('navi2|old~v-digest','old representative',{choices:['e','f','g','h'],answer:1,legacyGroupKey:'navi2|old'});
  const raw=engine.record(null,'navi2',['navi2|old','hd-unsafe']),before=JSON.stringify(raw),id=engine.identity(representative),variantId=engine.identity(variant);
  const next=engine.rebaseExposure(raw,'navi2',[representative,variant]);
  assert.equal(JSON.stringify(raw),before);assert.equal(next.grades.navi2.seen[id][0],1);
  assert.equal(next.grades.navi2.seen[variantId],undefined);
  assert.ok(next.grades.navi2.recent[0].includes(id));assert.ok(next.grades.navi2.recent[0].includes('hd-unsafe'));
  const eligible=[representative,variant,...uniform];
  const draw=engine.evaluationSelect(eligible,{gradeId:'navi2',data,state:next,count:25,random:rng()});
  assert.ok(!draw.identities.includes(id));
  const saved=engine.record(next,'navi2',draw.identities);assert.ok(draw.identities.every(k=>saved.grades.navi2.seen[k][0]===1));
});

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'md-mock-v522-'));
try{
  const patched=path.join(temp,'index.html');
  cp.execFileSync('python',[path.join(root,'tools/patch_mock_sampling_v522.py'),'--input',path.join(root,'index.html'),'--output',patched]);
  const source=fs.readFileSync(patched,'utf8');
  cp.execFileSync('python',[path.join(root,'tools/patch_mock_sampling_v522.py'),'--input',patched]);
  test('the final source patch is idempotent and uses the shared content identity',()=>{
    assert.equal(fs.readFileSync(patched,'utf8'),source);
    assert.equal((source.match(/const identity=item=>window\.__mdBalancedMock\.identity\(item\);/g)||[]).length,2);
    assert.ok(source.includes('return window.__mdBalancedMock.evaluationSelect(items,options);'));
    assert.ok(!source.includes('const identity=item=>PP_HOMEWORK_DUPLICATE_CLUSTER[item.key]||item.key;'));
  });
  scope.ppPredictiveWeight=q=>q.w||1;
  vm.runInContext(source.slice(source.indexOf('  function ppPredictiveQuestionFingerprint'),source.indexOf('  window.startNavigatorPredictiveMock')),scope);
  test('integrated predictive priority sample keeps ten core questions and 25 distinct questions',()=>{
    const items=Array.from({length:100},(_,i)=>item('core'+i,'question '+i,{w:i<30?10:1}));
    const draw=scope.ppPredictivePrioritySample(items,data,25,[],{});
    assert.equal(draw.length,25);assert.equal(new Set(draw.map(q=>q.key)).size,25);
    assert.ok(draw.filter(q=>q.w===10).length>=10);
  });
  scope.ppPredictiveRecentLevel=()=>-1;scope.ppPredictivePersonalMultiplier=()=>1;
  vm.runInContext(source.slice(source.indexOf('  function ppPredictiveWeight'),source.indexOf('  function ppWeightedChoice')),scope);
  test('recency weighting rolls into 2027 without changing the existing 2026 weights',()=>{
    const current=item('current','current',{maxYear:2026,hits:[{year:2026},{year:2025},{year:2024},{year:2022}]});
    const future=item('future','future',{maxYear:2027,hits:current.hits.map(h=>({year:h.year+1}))});
    assert.equal(scope.ppPredictiveWeight(current,[],{}),scope.ppPredictiveWeight(future,[],{}));
    const expected=1+4*0.72+0.8+0.55+0.35+0.9+0.6+0.3+1.25;
    assert.equal(scope.ppPredictiveWeight(current,[],{}),expected);
    assert.ok(scope.ppPredictiveWeight(item('latest','latest',{maxYear:2027,hits:[{year:2027}]}),[],{})>scope.ppPredictiveWeight(item('old','old',{maxYear:2027,hits:[{year:2024}]}),[],{}));
    assert.ok(!source.includes("pastYear=2026;pastSession=0;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock'"));
  });
}finally{fs.rmSync(temp,{recursive:true,force:true})}

test('evaluation explanations are blocked before submission, while practice explanations remain',()=>{
  const s={currentMode:'past',pastMode:'mock',pastQueue:[{_evaluationMock:true}],pastIdx:0,document:{getElementById:()=>null,readyState:'loading',addEventListener(){}}};s.window=s;vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(root,'mock-explanation-controls.js'),'utf8'),s);
  assert.equal(s.__mdMockExplanationControls.isMockExam(),false);
  assert.equal(s.__mdMockExplanationControls.currentQuestion(),null);
  s.pastQueue=[{_balancedMock:true}];assert.equal(s.__mdMockExplanationControls.isMockExam(),true);
  s.pastQueue=[{_predictiveMock:true}];assert.equal(s.__mdMockExplanationControls.isMockExam(),true);
  s.currentMode='past-result';assert.equal(s.__mdMockExplanationControls.isMockExam(),false);
});

if(!process.argv.includes('--synthetic-only')){
  test('actual recent-five-year bank retains content variants and rotates all evaluation questions',()=>{
    const s={console,setTimeout(){},MutationObserver:class{observe(){}},document:{readyState:'loading',addEventListener(){},documentElement:{}},localStorage:{getItem(){return null},setItem(){}}};s.window=s;vm.createContext(s);
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    for(const m of html.matchAll(/<script\s+type="application\/gzip"\s+id="(md-bundle-[^"]+)">\s*([A-Za-z0-9+/=\r\n]+?)\s*<\/script>/gs)){
      if(!/^md-bundle-past-(?:analysis-navi[23]|20\d{2}-navi[23]-\d+)_js$/.test(m[1]))continue;
      vm.runInContext(zlib.gunzipSync(Buffer.from(m[2].replace(/\s+/g,''),'base64')).toString('utf8'),s);
    }
    for(const file of ['reported-content-fixes.js','learning-integrity.js','data-identity.js','balanced-mock.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),s,{filename:file});
    s.__mdReportedContentFixes.patchKnownData();
    const e=s.__mdBalancedMock,random=rng(997);
    for(const gradeId of ['navi2','navi3']){
      const d=s.MD_NAVI_FREQUENCY[gradeId],pool=s.__mdDataIdentity.buildPool(d,{gradeId,subjects:d.subjects,years:s.__mdDataIdentity.trainingYears(d),getExam:(g,y,n)=>s.MD_PAST[y+'-'+g+'-'+n],usable:q=>!s.__mdLearningIntegrity.contentIssue(q)});
      for(const subject of d.subjects){
        const items=pool.filter(q=>q.subject===subject),eligible=new Set(items.map(q=>e.identity(q)));assert.ok(eligible.size>=100);
        let state=null,seen=new Set();
        for(let paper=0;paper<Math.ceil(eligible.size/25)+4;paper++){
          const prior=new Set(e.normalize(state).grades[gradeId].recent.flat());
          const out=e.evaluationSelect(items,{gradeId,data:d,state,count:25,random});
          assert.equal(out.items.length,25);assert.equal(new Set(out.identities).size,25);assert.ok(out.identities.every(id=>!prior.has(id)));
          out.identities.forEach(id=>seen.add(id));state=e.record(state,gradeId,out.identities);
        }
        assert.equal(seen.size,eligible.size,gradeId+' '+subject+' rotation must cover the complete content bank');
        const draw=e.predictiveSample(items,{count:25,weight:()=>1,random});assert.equal(draw.length,25);assert.equal(new Set(draw.map(q=>e.fingerprint(q))).size,25);
        console.log('  '+gradeId+' '+subject+': '+eligible.size+' content identities, full rotation');
      }
    }
  });
}
console.log('mock sampling v5.22 regressions: PASS ('+passed+' cases)');
