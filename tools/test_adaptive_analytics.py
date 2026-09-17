from pathlib import Path
import subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')
required=[
    '<script src="adaptive-analytics.js"></script>',
    'window.mdPredictiveWeaknessMultiplier',
    'window.mdAdaptiveStudyOrder',
    'n3aData(item.gradeId)',
    'window.mdAdaptiveStudyOrder(newCandidates,n3aData(g),progress,quotas[g])',
    'window.mdAdaptiveStudyOrder(newCandidates,n3aData(g),progress,remainingNewSlots)',
    "if(planSessionKind==='concept-weak')return '취약 파트 보강';",
    '최근 5개년 출제경향 + 파트별 취약도 자동가중 · 급수별 최근 완료 모의 중복 억제',
]
for needle in required:
    if needle not in src:
        raise SystemExit(f'missing adaptive analytics marker: {needle}')

js=Path('adaptive-analytics.js')
if not js.exists():
    raise SystemExit('adaptive-analytics.js missing')
proc=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('adaptive-analytics.js syntax failed:\n'+proc.stderr)

harness=r'''
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const values=new Map();
global.localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
vm.runInThisContext(fs.readFileSync('adaptive-analytics.js','utf8'));
assert.strictEqual(mdPredictiveConceptInfo({gradeId:'navi3',subject:'항해',question:'레이더 화면상 다중 반사 거짓상은?'}).label,'레이더·ARPA');
assert.strictEqual(mdPredictiveConceptInfo({gradeId:'navi3',subject:'법규',question:'상법상 운송인의 감항능력 의무는?'}).label,'상법·해상운송');
assert.strictEqual(mdPredictiveConceptInfo({gradeId:'navi3',subject:'영어',question:'According to SMCP, Standard Wheel Orders'}).label,'SMCP·해사통신');
const weakKey='영어|SMCP·해사통신', strongKey='영어|해사영어 독해·어휘';
localStorage.setItem('md_predictive_concept_stats_v1',JSON.stringify({version:1,navi2:{concepts:{}},navi3:{concepts:{
  [weakKey]:{subject:'영어',label:'SMCP·해사통신',attempts:8,correct:2,wrong:6},
  [strongKey]:{subject:'영어',label:'해사영어 독해·어휘',attempts:10,correct:9,wrong:1}
}}}));
const weak=mdPredictiveWeaknessMultiplier({gradeId:'navi3',subject:'영어',question:'SMCP distress communication'},null);
const strong=mdPredictiveWeaknessMultiplier({gradeId:'navi3',subject:'영어',question:'ordinary maritime reading passage'},null);
assert(weak>1.2,'weak concept must be boosted');
assert(strong<=1,'strong concept should not be boosted');
const candidates=[];
for(let i=0;i<10;i++)candidates.push({key:'navi3|weak'+i,gradeId:'navi3',subject:'영어',question:'SMCP distress message '+i});
for(let i=0;i<20;i++)candidates.push({key:'navi3|base'+i,gradeId:'navi3',subject:'영어',question:'ordinary maritime reading passage '+i});
const ordered=mdAdaptiveStudyOrder(candidates,null,{},10);
const weakInFirst=ordered.slice(0,10).filter(x=>x.question.includes('SMCP')).length;
assert(weakInFirst>=3 && weakInFirst<=4,'new-question reinforcement should be bounded near 35%');
console.log('adaptive analytics runtime checks: PASS');
'''
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(harness)
    path=f.name
proc=subprocess.run(['node',path],capture_output=True,text=True)
if proc.returncode:
    raise SystemExit('adaptive analytics runtime failed:\n'+proc.stdout+'\n'+proc.stderr)
print(proc.stdout.strip())
print('adaptive analytics integration checks: PASS')
