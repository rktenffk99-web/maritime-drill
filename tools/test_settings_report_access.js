#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app-navigation.js','utf8');

for(const mode of ['select','prep','pass-plan','past','pass-plan-session']){
  const events=[];
  let modal;
  const sandbox={
    console,currentMode:mode,APP_VERSION:'test',ttsEnabled:false,
    pastAnswers:[1,null],planSessionAnswers:[2,null],
    escapeHTML:text=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    readAutomaticRestorePoint:()=>null,driveSyncRefreshPanel(){},
    driveSyncPanelHTML:()=>'<div>동기화</div>',
    openModal(opts){modal=opts;events.push('settings')},
    closeModal(){events.push('close-settings')},
    openMaritimeProblemReports(){events.push('open-reports')},
    localStorage:{getItem(){throw Error('navigation must not read/change a study session')},setItem(){throw Error('navigation must not save answers')}},
    document:{
      documentElement:{dataset:{}},head:{appendChild(){}},
      body:{classList:{toggle(){}}},
      createElement:()=>({}),getElementById:()=>null,querySelector:()=>null,
      addEventListener(){},
    },
    addEventListener(){},
  };
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{filename:'app-navigation.js'});
  sandbox.openMaritimeSettings();
  assert.match(modal.body,/id="md-report-settings"/,'report access must exist outside question screens');
  const match=modal.body.match(/<button\b[^>]*onclick="([^"]+)"[^>]*>저장된 문제 신고 보기<\/button>/);
  assert.ok(match,`missing discoverable report action in ${mode}`);
  vm.runInContext(match[1],sandbox);
  assert.deepEqual(events,['settings','close-settings','open-reports']);
  assert.equal(sandbox.currentMode,mode,'viewing reports must preserve the current screen');
  assert.deepEqual(sandbox.pastAnswers,[1,null]);
  assert.deepEqual(sandbox.planSessionAnswers,[2,null]);
}
console.log('settings report access: PASS (home, prep, plan and both question modes preserve answers)');
