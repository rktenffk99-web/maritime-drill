'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('  // unified-mock-v525:'),end=html.indexOf('  function ppChoiceOrder(q){',start);
const calls=[];let release,reject;
const s={window:null,startNavigatorPassPlanMock:(...args)=>{calls.push(['exam',...args]);return new Promise((resolve,no)=>{release=resolve;reject=no})},startNavigatorPredictiveMock:(...args)=>{calls.push(['practice',...args]);return new Promise((resolve,no)=>{release=resolve;reject=no})}};
s.window=s;vm.createContext(s);vm.runInContext(html.slice(start,end),s);
(async()=>{
  const first=s.startNavigatorUnifiedMock('navi2');
  await s.startNavigatorUnifiedMock('navi2');await s.startNavigatorTargetedPractice('navi3');
  assert.deepEqual(calls,[['exam','navi2',true]]);release();await first;
  const second=s.startNavigatorTargetedPractice('navi3');await s.startNavigatorTargetedPractice('navi3');
  assert.deepEqual(calls[1],['practice','navi3',true]);assert.equal(calls.length,2);reject(new Error('assembly failed'));
  await assert.rejects(second,/assembly failed/);
  const retry=s.startNavigatorUnifiedMock('navi3');assert.equal(calls.length,3);release();await retry;
  console.log('PASS duplicate activation cannot replace a pending paper and failed creation unlocks retry');
})().catch(error=>{console.error(error);process.exitCode=1});
