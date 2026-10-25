'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../convenience-controls.js'),'utf8');
const key='md_problem_reports_v1';
function harness(raw='[]'){
  const data=new Map([[key,raw]]),messages=[],removed=[];
  const sandbox={REPORTS_KEY:key,RESOLVED_REPORTS_CUTOFF:'2026-09-18T00:41:10.000Z',Date,JSON,Number,
    toast:message=>messages.push(message),collectQuestionSnapshot:()=>({question:'문제',tags:['2급'],counter:'문제 1/10'}),
    document:{getElementById:id=>({remove(){removed.push(id)}})},window:{confirm:()=>true},
    localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
  vm.createContext(sandbox);
  for(const [start,end] of [['  function readReports(', '  function formatReports('],['  function clearReports(', '  function openReportListModal('],['  function saveReport(', '  function openReportModal(']]){
    const a=src.indexOf(start),b=src.indexOf(end,a);assert.ok(a>=0&&b>a);vm.runInContext(src.slice(a,b),sandbox);
  }
  return {s:sandbox,data,messages,removed};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const old=JSON.stringify([{createdAt:'2026-10-20T00:00:00Z',question:'existing'}]);
test('failed report save keeps existing reports and the open input; retry saves once',()=>{
  const h=harness(old),write=h.s.localStorage.setItem;
  h.s.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};
  assert.equal(h.s.saveReport('직접 입력','선지 끝에 글자'),false);
  assert.equal(h.data.get(key),old);assert.equal(h.removed.length,0);assert.match(h.messages.at(-1),/저장하지 못/);
  h.s.localStorage.setItem=write;
  assert.equal(h.s.saveReport('직접 입력','선지 끝에 글자'),true);
  const rows=JSON.parse(h.data.get(key));assert.equal(rows.length,2);assert.equal(rows[1].detail,'선지 끝에 글자');
  assert.deepEqual(h.removed,['md-report-modal']);
});
test('malformed saved reports are preserved instead of overwritten with an empty list',()=>{
  for(const raw of ['{bad','{}','[null]']){
    const h=harness(raw);assert.equal(h.s.saveReport('오타/깨짐'),false);assert.equal(h.data.get(key),raw);assert.equal(h.removed.length,0);
  }
});
test('500-report limit does not silently discard the oldest report',()=>{
  const raw=JSON.stringify(Array.from({length:500},(_,i)=>({question:String(i),createdAt:'2026-10-20T00:00:00Z'}))),h=harness(raw);
  assert.equal(h.s.saveReport('정답 이상'),false);assert.equal(h.data.get(key),raw);assert.match(h.messages.at(-1),/500/);
});
test('failed deletion leaves report UI open and does not claim success',()=>{
  const h=harness(old);h.s.localStorage.removeItem=()=>{throw new Error('SecurityError')};
  assert.equal(h.s.clearReports(),false);assert.equal(h.data.get(key),old);assert.equal(h.removed.length,0);assert.match(h.messages.at(-1),/삭제하지 못/);
});
test('explicit report deletion uses sync reset generation and checks failure',()=>{
  const h=harness(old);let called;
  h.s.window.__mdDriveSyncV2={resetKey:(...args)=>{called=args;return false}};
  assert.equal(h.s.clearReports(),false);assert.deepEqual(called,[key,'[]','문제 신고 전체 삭제']);
  assert.equal(h.data.get(key),old);assert.equal(h.removed.length,0);
  h.s.window.__mdDriveSyncV2.resetKey=()=>{h.data.set(key,'[]');return true};
  h.s.clearReports();assert.equal(h.data.get(key),'[]');assert.ok(h.removed.length>0);
});
test('historical cleanup failure still exposes current reports',()=>{
  const raw=JSON.stringify([{createdAt:'2026-09-01T00:00:00Z',question:'resolved'},...JSON.parse(old)]),h=harness(raw);
  h.s.localStorage.setItem=()=>{throw new Error('blocked')};assert.equal(h.s.readReports().length,1);assert.equal(h.data.get(key),raw);
});
test('blank custom report cannot create a record',()=>{
  const h=harness(old);assert.equal(h.s.saveReport('직접 입력','   '),false);assert.equal(h.data.get(key),old);
});
console.log(`problem report storage regressions: PASS (${passed} cases)`);

(async()=>{
  for(const fails of [false,true]){
    const h=harness(old),s=h.s;
    s.navigator={clipboard:{writeText:async()=>{throw new Error('permission denied')}}};
    s.document.createElement=()=>({value:'',select(){},remove(){}});
    s.document.body={appendChild(){}};
    s.document.execCommand=()=>{if(fails)throw new Error('blocked');return false};
    const a=src.indexOf('  function formatReports('),b=src.indexOf('  function clearReports(',a);
    vm.runInContext(src.slice(a,b),s);
    assert.equal(await s.copyReports(),false);assert.equal(h.data.get(key),old);
    assert.match(h.messages.at(-1),/복사하지 못/);assert.ok(!h.messages.some(x=>x.includes('복사했습니다')));
  }
  console.log('PASS failed clipboard fallback never claims a backup was copied (false + exception)');
})().catch(e=>{console.error(e);process.exitCode=1});
