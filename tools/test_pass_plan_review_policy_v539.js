'use strict';
// v5.39: re-appearance weight used for homework order matches the measured re-appearance rates.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(process.env.MD_TEST_HTML||path.join(root,'index.html'),'utf8');
const built=spawnSync(process.env.MD_PYTHON||'python',['tools/patch_pass_plan_review_policy_v539.py','--stdin','--stdout'],{cwd:root,input:html,encoding:'utf8',maxBuffer:60*1024*1024});
assert.equal(built.status,0,built.stderr);assert.equal(built.stdout,html,'apply the v5.39 review policy patch before final verification');
const start=html.indexOf('  function ppHomeworkReappearWeight(item){'),end=html.indexOf('  function ppIsDue(rec,today){',start);
assert.ok(start>0&&end>start,'weight helper missing');
const ctx={Math,Number,Set,Date,Array};vm.createContext(ctx);vm.runInContext(html.slice(start,end)+';this.w=ppHomeworkReappearWeight;',ctx);
const w=years=>ctx.w({maxYear:2026,hits:years.map(year=>({year}))});
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name)}
test('a question last asked long ago ranks below a recent single appearance',()=>{
  assert.ok(w([2025])>w([2020,2021,2022]),`${w([2025])} vs ${w([2020,2021,2022])}`);
});
test('latest-year questions rank highest and repeats still add weight',()=>{
  assert.ok(w([2026])>w([2025]));assert.ok(w([2024,2026])>w([2026]));assert.ok(w([2023,2025])>w([2025]));
});
test('age decay follows 1 / 0.55 / 0.35 / 0.2 for 0 / 1 / 2 / 3+ years',()=>{
  const base=1+0.72;
  assert.equal(+w([2023]).toFixed(4),+(base*0.2).toFixed(4));assert.equal(+w([2020]).toFixed(4),+(base*0.2).toFixed(4));
  assert.equal(+w([2024]).toFixed(4),+((base+0.3)*0.35).toFixed(4));
});
test('homework rows carry the weight and same-session rechecks are off',()=>{
  assert.ok(html.includes("needsSameDayConfirmation:PP_SAME_DAY_RECHECK&&!priorRecall&&r.sameDayFirstCorrectDate!==today,reappear:ppHomeworkReappearWeight(item)"));
  assert.ok(html.includes('const PP_SAME_DAY_RECHECK=false;'));
  assert.ok(!html.includes('30~50문제 뒤 자동 재확인'),'old same-day recheck guidance removed');
});
console.log(`pass plan review policy v5.39 checks: PASS (${n} cases)`);
