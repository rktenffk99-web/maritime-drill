'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'daily-storage.js'),'utf8');
const key='md_nav23_pass_daily_v1',restore='md_restore_point_v1',plain=v=>JSON.parse(JSON.stringify(v));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function harness(initial={}){
  const data=new Map(Object.entries(initial)),writes=[];
  const sandbox={window:null,console,Date,localStorage:{getItem:k=>data.has(k)?data.get(k):null,setItem(k,v){data.set(k,v);writes.push(k);}}};
  sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {api:sandbox.__mdDailyStorage,data,writes,sandbox};
}
const assignment={keys:['navi3|a','navi2|b','navi3|a'],createdAt:123,signature:'same-settings',dueCount:1,newCount:2,phases:{navi3:{candidates:[{question:'source '.repeat(10000)}],allRemaining:[{question:'more '.repeat(10000)}]}}};
test('compact cache retains exact queue, order, signature and quota metadata',()=>{
  const {api}=harness(),before=JSON.stringify(assignment),out=api.compactDaily({'2026-09-21':assignment});
  const {phases,...expected}=assignment;assert.deepEqual(plain(out['2026-09-21']),expected);assert.equal(JSON.stringify(assignment),before);
  assert.ok(JSON.stringify(out).length<500);assert.equal(JSON.stringify(api.compactDaily(out)),JSON.stringify(out));
});
test('only the last 30 schedule days are cached; today survives incorrect future dates',()=>{
  const {api}=harness(),daily={};for(let i=1;i<=31;i++)daily['2099-01-'+String(i).padStart(2,'0')]=assignment;
  const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');daily[today]=assignment;
  const out=api.compactDaily(daily);assert.equal(Object.keys(out).length,30);assert.ok(out[today]);assert.ok(out['2099-01-31']);assert.ok(!out['2099-01-01']);
});
test('migration and restore-point compaction preserve progress, answers and every unrelated item',()=>{
  const progress='{"navi3|a":{"attempts":12,"correct":8,"wrong":4}}',checkpoint='{"queueKeys":["a","b"],"answers":[2,null],"nextIndex":1}',daily=JSON.stringify({'2026-09-21':assignment});
  const items={[key]:daily,md_nav23_pass_progress_v1:progress,md_pass_plan_session_checkpoint_v2:checkpoint,md_custom:'keep exactly'};
  const point={app:'Maritime Drill',exportedAt:'2026-09-20T03:00:00Z',reason:'before-sync',items};
  const {api,data,writes}=harness({...items,[restore]:JSON.stringify(point)});api.migrateLocal();
  assert.equal(data.get('md_nav23_pass_progress_v1'),progress);assert.equal(data.get('md_pass_plan_session_checkpoint_v2'),checkpoint);assert.equal(data.get('md_custom'),'keep exactly');
  const saved=JSON.parse(data.get(restore));assert.equal(saved.exportedAt,point.exportedAt);assert.equal(saved.reason,point.reason);assert.equal(saved.items.md_nav23_pass_progress_v1,progress);assert.equal(saved.items.md_pass_plan_session_checkpoint_v2,checkpoint);
  assert.equal(saved.items[key],data.get(key));assert.deepEqual(writes,[restore,key]);api.migrateLocal();assert.equal(writes.length,2);
});
test('malformed or unrelated data is not deleted during compaction',()=>{
  const {api}=harness();for(const value of ['{bad','[]','null','"text"'])assert.equal(api.compactValue(key,value),value);
  assert.equal(api.compactValue('md_nav23_pass_progress_v1','{"phases":"user data"}'),'{"phases":"user data"}');
});
test('a blocked storage write leaves all existing data in place',()=>{
  const raw=JSON.stringify({'2026-09-21':assignment}),h=harness({[key]:raw});h.sandbox.localStorage.setItem=()=>{throw Object.assign(new Error('blocked'),{name:'SecurityError'})};h.sandbox.console={warn(){}};
  h.api.migrateLocal();assert.equal(h.data.get(key),raw);
});
// Exercise the actual app save and settings functions with failing storage.
test('save boundary compacts imports and does not claim success on failure',()=>{
  const h=harness(),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),s=h.sandbox;
  s.showStorageWarning=()=>{};vm.runInContext(html.slice(html.indexOf('function safeStorageSet('),html.indexOf('function safeStorageRemove(')),s);
  assert.equal(s.safeStorageSet(key,JSON.stringify({'2026-09-21':assignment}),'test'),true);assert.ok(h.data.get(key).length<500);
  s.localStorage.setItem=()=>{throw new Error('full')};assert.equal(s.safeStorageSet(key,'{}','test'),false);
  const start=html.indexOf('window.saveNavigatorPassPlanSettings=async function(){'),end=html.indexOf('  window.recalculateNavigatorPassPlanToday=',start),fn=html.slice(start,end);
  assert.ok(fn.includes('if(!ppSavePlan(plan))return'));assert.ok(fn.includes('if(!ppSaveDaily(daily))return'));assert.ok(fn.includes('if(planDailySaveSucceeded)showToast'));
});
console.log(`daily storage regressions: PASS (${passed} cases)`);
