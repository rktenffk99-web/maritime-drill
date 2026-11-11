'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{randomUUID}=require('crypto');
const source=fs.readFileSync('exam-sessions.js','utf8');
function harness(data=new Map()){
 const events={};
 const rows=Array.from({length:125},(_,i)=>({'과목':'법규','번호':i+1,'문제':'question '+i,'선택지':['a','b','c','d'],'정답':i%4}));
 const s={console,Date,Math,JSON,Map,Set,crypto:{randomUUID},currentMode:'past',pastQueue:rows.map(q=>({...q,_short:'navi2',_year:2026,'회차':1})),pastAnswers:Array(125).fill(null),pastIdx:0,pastMode:'mock',pastStartedAt:Date.now(),pastSubjectId:'navi2',pastBaseShort:'navi2',pastYear:2026,pastSession:1,pastVariant:'상선',pastAllYears:false,pastReturnView:null,naviAnalysisSubjectId:'navi2',navi3AnalysisDetail:null,navi3PracticeReturn:null,navi3PracticeLabel:null,pastProgressId:null,pastProgressMeta:null,pastSavedAnswers:null,app:{innerHTML:''},SUBJECTS:[{id:'navi2',name:'2급'}],
 savePastProgress(){},getPastProgress(){},confirmPastProgressReplacement(){},clearPastProgress(){},renderPastResumeCard(){},resumePastProgress(){},
 safeStorageSet(k,v){data.set(k,v);return true},showStorageWarning(){},showToast(){},escapeHtml:String,backupDateLabel:String,renderPastLoading(){},ensurePastDataForSubject:async()=>{},ensurePastExplainForYears:async()=>{},ensureNavi3FrequencyData:async()=>{},n3aActivateGrade(){},mdQuestionUsable:()=>true,baseFromShort:x=>x,getPastExam:()=>({questions:rows}),pqid:q=>[q._year,q._short,q['회차'],q['과목'],q['번호']].join('|'),
 localStorage:{get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},addEventListener(name,handler){events[name]=handler}};
 s.capturePastProgressState=()=>({id:s.pastProgressId,idx:s.pastIdx,answers:s.pastAnswers,mode:s.pastMode,startedAt:s.pastStartedAt,savedAt:Date.now(),hintedIndices:s.pastQueue.flatMap((q,i)=>q._mockHintViewed?[i]:[])});
 s.renderPastCard=()=>s.savePastProgress();s.window=s;vm.createContext(s);vm.runInContext(source,s);return {s,data,rows,events};
}
const plain=x=>JSON.parse(JSON.stringify(x));
if(require.main===module)(async()=>{
 const a=harness();a.s.savePastProgress();const id=a.s.pastProgressId;
 for(let i=0;i<50;i++){a.s.pastIdx=i;a.s.pastAnswers[i]=i%4;a.s.savePastProgress();}a.s.pastIdx=50;a.s.savePastProgress();
 const expected=plain(a.s.getPastProgress(id)),baseData=new Map(a.data);
 const reload=harness(a.data);reload.s.currentMode='home';await reload.s.resumePastProgress(id,expected.headId);
 assert.equal(reload.s.pastIdx,50);assert.deepEqual(plain(reload.s.pastAnswers),expected.state.answers);assert.deepEqual(plain(reload.s.pastQueue.map(reload.s.pqid)),expected.meta.refs.map(r=>r.id));
 console.log('PASS 50 answers, exact question/choice order and cursor after fresh runtime');
 await reload.s.confirmPastProgressReplacement();reload.s.clearPastProgress();reload.s.pastAnswers=Array(125).fill(null);reload.s.pastQueue=reload.s.pastQueue.slice().reverse();reload.s.pastIdx=0;reload.s.savePastProgress();const second=reload.s.pastProgressId;
 assert.notEqual(second,id);assert.equal(reload.s.__mdExamSessions.list().length,2);assert.equal(reload.s.getPastProgress(id).state.idx,50);
 await reload.s.resumePastProgress(id);assert.equal(reload.s.pastIdx,50);assert.equal(reload.s.pastQueue[0]['번호'],1);
 reload.s.clearPastProgress();assert.equal(reload.s.getPastProgress(id),null);assert.ok(reload.s.getPastProgress(second));
 console.log('PASS independent exam switch, explicit resume, completing only current exam');
 const prefix=a.s.__mdExamSessions.PREFIX,key=prefix+id,base=JSON.parse(baseData.get(key));
 const b=harness(new Map(baseData)),c=harness(new Map(baseData));b.s.currentMode=c.s.currentMode='home';await b.s.resumePastProgress(id);await c.s.resumePastProgress(id);
 b.s.pastAnswers[50]=0;b.s.pastIdx=51;b.s.savePastProgress();c.s.pastAnswers[50]=3;c.s.pastIdx=52;c.s.savePastProgress();
 const left=JSON.parse(b.data.get(key)),right=JSON.parse(c.data.get(key)),merged=b.s.__mdExamSessions.merge(left,right);
 assert.equal(Object.keys(merged.heads).length,2);assert.deepEqual(plain(merged),plain(b.s.__mdExamSessions.merge(right,left)));assert.deepEqual(plain(merged),plain(b.s.__mdExamSessions.merge(merged,base)));
 assert.deepEqual(Object.values(merged.heads).map(h=>h.state.answers[50]).sort(),[0,3]);
 b.data.set(key,JSON.stringify(merged));assert.equal(b.s.__mdExamSessions.list().length,2);
 b.s.clearPastProgress();assert.equal(b.s.__mdExamSessions.list().length,1);
 console.log('PASS concurrent conflicting edits preserve both atomic answer versions; stale sync cannot resurrect completed branch');
 const wrong=plain(right);wrong.meta.refs.reverse();assert.throws(()=>b.s.__mdExamSessions.merge(left,wrong));
 const before=reload.s.pastProgressId;await reload.s.resumePastProgress('nonexistent');assert.equal(reload.s.pastProgressId,before);
 const corrupt=harness(new Map(baseData));corrupt.rows[0]['정답']=3;corrupt.s.currentMode='home';await corrupt.s.resumePastProgress(id);assert.equal(corrupt.s.currentMode,'past-resume-error');assert.ok(corrupt.s.getPastProgress(id));
 console.log('PASS mismatched paper/content or missing selected version never substitutes another exam');
 const oldPaper=harness();
 oldPaper.s.pastQueue=oldPaper.s.pastQueue.slice(0,122).reverse();
 Object.assign(oldPaper.s.pastQueue[4],{'문제':'확인하는 대상으로옳지 않은 것은?','선택지':['a','b','c','분리 밸러스트 탱크의 밸브 10 - 2025년'],'정답':3});
 oldPaper.s.pastAnswers=Array.from({length:122},(_,i)=>i<103?i%4:null);oldPaper.s.pastIdx=103;
 assert.equal(oldPaper.s.savePastProgress(),true);
 const oldId=oldPaper.s.pastProgressId,oldKey=prefix+oldId,oldRaw=oldPaper.data.get(oldKey);
 const corrected=harness(new Map(oldPaper.data));corrected.s.currentMode='home';
 vm.runInContext(fs.readFileSync('reported-content-fixes.js','utf8'),corrected.s);
 const correctedRow=corrected.rows.find(row=>row['번호']===oldPaper.s.pastQueue[4]['번호']);
 Object.assign(correctedRow,{'문제':'확인하는 대상으로 옳지 않은 것은?','선택지':['a','b','c','분리 밸러스트 탱크의 밸브'],'정답':3});
 await corrected.s.resumePastProgress(oldId);
 assert.equal(corrected.s.currentMode,'past');assert.equal(corrected.s.pastIdx,103);
 assert.deepEqual(plain(corrected.s.pastAnswers),oldPaper.s.pastAnswers);
 assert.deepEqual(plain(corrected.s.pastQueue.map(corrected.s.pqid)),oldPaper.s.pastQueue.map(oldPaper.s.pqid));
 assert.equal(corrected.s.pastQueue[4]['선택지'][3],correctedRow['선택지'][3]);
 assert.equal(corrected.data.get(oldKey),oldRaw);
 for(const mutation of [{'정답':2},{'선택지':['b','a','c',correctedRow['선택지'][3]]},{'이미지':'different.png'},{'문제':'다른 문제'}]){
  const original={...correctedRow};Object.assign(correctedRow,mutation);
  corrected.s.currentMode='home';await corrected.s.resumePastProgress(oldId);
  assert.equal(corrected.s.currentMode,'past-resume-error');assert.equal(corrected.data.get(oldKey),oldRaw);
  for(const field of Object.keys(mutation))delete correctedRow[field];
  Object.assign(correctedRow,original);
 }
 console.log('PASS verified text repairs restore 103/122 answers at question 104; grading, choice order, images and unrelated wording still require an exact match');
 const quota=harness(new Map(baseData));quota.s.currentMode='home';await quota.s.resumePastProgress(id);const prior=quota.data.get(key);quota.s.pastAnswers[50]=2;quota.s.safeStorageSet=()=>false;assert.equal(quota.s.savePastProgress(),false);assert.equal(quota.data.get(key),prior);const live=JSON.parse(quota.s.__mdExamSessions.liveItems()[key]);assert.equal(Object.values(live.heads)[0].state.answers[50],2);
 console.log('PASS quota failure preserves durable snapshot and exports unsaved live answer');
 const legacy=harness(new Map([['md_past_checkpoint_v2',JSON.stringify({meta:expected.meta,state:expected.state})]]));assert.equal(legacy.s.getPastProgress(),null);
 console.log('PASS v5.29 singleton storage never reappears in v5.30 resume list');
 // Actual Drive merger must call the exam protocol, regardless of timestamps.
 const sync=fs.readFileSync('drive-sync-v2.js','utf8');Object.assign(b.s,{driveSyncOnce(){},driveSyncLoadState(){return {}},isManagedStorageKey:k=>k.startsWith('md_')});vm.runInContext(sync,b.s);
 const output=b.s.__mdDriveSyncV2.mergeSnapshots({[key]:JSON.stringify(left)},{[key]:JSON.stringify(right)},{},{},'2099-01-01','2000-01-01');assert.equal(Object.keys(JSON.parse(output.items[key]).heads).length,2);
 console.log('PASS production Drive merge preserves concurrent versions despite clock skew');
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={harness};
