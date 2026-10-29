'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
function source(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,start);return html.slice(a,b);}
function row(short){return {meta:{gradeShort:short,year:2025,session:1,gradeLabel:'2급 항해사'},questions:[{'과목':'항해','번호':1,'문제':'test','선택지':['a','b','c','d'],'정답':0}]};}
const s={window:null,console,Date,Math,Map,Set,
  MD_PAST:{a:row('navi2'),b:row('navi2e'),c:row('navi3'),d:row('navi3e')},
  PAST_GRADE_MAP:{navi2:['navi2','navi2e'],navi3:['navi3','navi3e']},
  baseFromShort:short=>short.replace(/(?:de|e|d)$/,''),
  SUBJECTS:[{id:'navi2',name:'2급 항해사'}],SUBJECT_GROUPS:[],BASE_GRADE_LABEL:{navi2:'2급 항해사'},
  pastSubjectId:'navi2',pastBaseShort:'navi2',pastYear:2025,pastSession:1,pastVariant:'어선',pastReturnView:null,pastAllYears:false,
  currentMode:'past-menu',app:{innerHTML:''},PAST_MOCK_PER_SUBJECT:25,icon:()=>'icon',
  renderPastSessionPick(){throw Error('unexpected empty merchant exam');}};
s.window=s;vm.createContext(s);
vm.runInContext(source('function variantLabel(short){','// ── v5.00:'),s);
assert.deepEqual(Array.from(s.getPastExamsByBase('navi2','all'),p=>p.meta.gradeShort),['navi2']);
assert.deepEqual(Array.from(s.getPastExamsByBase('navi2','어선'),p=>p.meta.gradeShort),['navi2']);
assert.deepEqual(Array.from(s.getPastExamsForSubject('navi2'),p=>p.meta.gradeShort),['navi2']);
assert.deepEqual(Array.from(s.getPastExamsByBase('navi3','all'),p=>p.meta.gradeShort),['navi3','navi3e']);
assert.deepEqual(Array.from(s.getPastExamsByBase('navi3','어선'),p=>p.meta.gradeShort),['navi3e']);
vm.runInContext(source('function getPastExamsForSession(baseShort, year, session, variant){','// Step 4:'),s);
vm.runInContext(source('function renderPastRunner(subjectId, baseShort, year, session){','// v4.35: runner 화면의 상선/어선 필터 변경'),s);
s.renderPastRunner('navi2','navi2',2025,1);
assert.match(s.app.innerHTML,/1문제 · 1과목/);
assert.doesNotMatch(s.app.innerHTML,/상선 \/ 어선/);
assert.doesNotMatch(s.app.innerHTML,/setPastRunnerVariant\('어선'\)/);
console.log('PASS navi2 merchant-only counts, screen filters and navi3 variant compatibility');
