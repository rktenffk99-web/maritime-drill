'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),file=path.join(root,'index.html');
const bundled=path.join(process.env.USERPROFILE||'', '.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe');
const python=process.env.PYTHON||(fs.existsSync(bundled)?bundled:'python');
const original=fs.readFileSync(file,'utf8');
const args=[path.join(__dirname,'patch_safe_learning_render.py'),'--stdout'];
const html=execFileSync(python,args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});
if(process.argv.includes('--final'))assert.ok(html.replace(/\r\n/g,'\n')===original.replace(/\r\n/g,'\n'),'safe rendering patch must be present in final index');
const again=execFileSync(python,[...args,'--stdin'],{cwd:root,input:html,encoding:'utf8',maxBuffer:32*1024*1024});
assert.equal(html,again,'final safety patch must be idempotent');
assert.equal(fs.readFileSync(file,'utf8'),original,'in-memory patch test must not modify generated index');
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,'missing test section '+start);return html.slice(a,b)}
const s={console,SM2_DEFAULT_EF:2.5,FOCUS_TARGET:2};vm.createContext(s);
vm.runInContext(section('// imported-learning-values-v1:', '// v4.84: 처음 접한 날짜'),s);
vm.runInContext(section('function migrateBoxesForTyping(boxes)', 'function createTypedSession('),s);
vm.runInContext(section('function escHtmlV452(s)', '// ─── S3: 타이핑 UI'),s);
vm.runInContext(section('const VERIFIED_GAP_MS', '// ─── S8: UI 위젯'),s);
vm.runInContext(section('function escapeHTML(s)', 'function renderConceptText('),s);
vm.runInContext(section('function renderCard(){', 'function renderHintAction(){'),s);
vm.runInContext(section('function mdNormalizeFocusHistory(', 'function saveFocusHistory('),s);
vm.runInContext(section('function fmtFocusHistoryDate(', '\n\nfunction save(){'),s);
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const punctuation='3 < 5 & 8 > 6 "확인"'; // Benign literal text, used as malformed numeric data.
const plain=v=>JSON.parse(JSON.stringify(v));
test('import migration preserves valid history and normalizes numeric strings',()=>{
  const boxes={12:{box:'2',correct:'7',wrong:'3',recoveryStreak:'1',ef:'2.7',interval:'6',reps:'2',lastStudied:'2026-09-01',
    typedStats:{attempts:'3',verifiedAttempts:'2',avgScore:'70',avgScoreVerified:'60',bestScore:'95',trend:'-12',rubricVersionAtLast:'1',chronicMisses:['f1']},
    typedAttempts:[{date:'2026-09-01T00:00:00Z',score:'70',rubricVersion:'1',userAnswer:punctuation,missedFactIds:['f1']} ]}};
  s.migrateBoxes(boxes);s.migrateBoxesForTyping(boxes);
  const b=boxes[12];assert.equal(b.box,2);assert.equal(b.correct,7);assert.equal(b.wrong,3);assert.equal(b.recoveryStreak,1);assert.equal(b.ef,2.7);assert.equal(b.interval,6);assert.equal(b.reps,2);
  assert.equal(b.lastStudied,'2026-09-01');assert.equal(b.typedAttempts[0].userAnswer,punctuation);assert.equal(b.typedAttempts[0].score,70);
  assert.equal(b.typedStats.attempts,3);assert.equal(b.typedStats.trend,-12);
  const out=s.renderTypingStatsForCard(b,1);assert.match(out,/3회/);assert.match(out,/60점/);assert.match(out,/95점/);assert.match(out,/하락 -12/);assert.match(out,/반복 누락: 1개/);
});
test('malformed box records and counters cannot crash migration or become markup',()=>{
  const boxes={bad:null,primitive:9,data:{box:punctuation,correct:punctuation,wrong:punctuation,recoveryStreak:punctuation,ef:Infinity,interval:-2,reps:NaN,
    typedStats:['unexpected'],typedAttempts:[null,5,{score:punctuation,durationSec:punctuation,rubricVersion:punctuation,missedFactIds:{length:punctuation}}]}};
  s.migrateBoxes(boxes);s.migrateBoxesForTyping(boxes);
  for(const key of ['bad','primitive','data']){const b=boxes[key];assert.equal(b.box,1);assert.equal(b.correct,0);assert.equal(b.wrong,0);assert.equal(b.recoveryStreak,0);assert.equal(b.ef,2.5);assert.equal(b.interval,0);assert.equal(b.reps,0);assert.equal(b.typedStats,null)}
  assert.equal(boxes.data.typedAttempts.length,1);assert.equal(boxes.data.typedAttempts[0].score,0);assert.equal(boxes.data.typedAttempts[0].durationSec,0);
  assert.deepEqual(plain(boxes.data.typedAttempts[0].missedFactIds),[]);
});
test('renderer normalizes untrusted cached stats even if migration was skipped',()=>{
  const out=s.renderTypingStatsForCard({typedStats:{attempts:'2',verifiedAttempts:punctuation,avgScore:punctuation,avgScoreVerified:punctuation,bestScore:punctuation,trend:punctuation,rubricVersionAtLast:1,chronicMisses:{length:punctuation}}},1);
  assert.match(out,/2회/);assert.match(out,/0점/);assert.match(out,/유지 0/);assert.ok(!out.includes(punctuation));assert.ok(!out.includes('반복 누락:'));
  assert.equal(s.renderTypingStatsForCard({typedStats:{attempts:punctuation,rubricVersionAtLast:1}},1),'');
  assert.equal(s.renderTypingStatsForCard({typedStats:[]},1),'');
});
test('count and score bounds reject non-numeric types and non-finite data',()=>{
  const normalized=s.mdNormalizeTypedStats({attempts:-10,verifiedAttempts:1.8,avgScore:999,avgScoreVerified:-4,bestScore:'101',trend:'-101',rubricVersionAtLast:0});
  assert.equal(normalized.attempts,0);assert.equal(normalized.verifiedAttempts,1);assert.equal(normalized.avgScore,100);assert.equal(normalized.avgScoreVerified,0);assert.equal(normalized.bestScore,100);assert.equal(normalized.trend,-100);assert.equal(normalized.rubricVersionAtLast,1);
  for(const value of [Infinity,NaN,'Infinity','',true,[],{},'0x10',punctuation])assert.equal(s.mdLearningNumber(value,17),17);
});
test('zero verified average remains zero when overall average is higher',()=>{
  const out=s.renderTypingStatsForCard({typedStats:{attempts:3,verifiedAttempts:2,avgScore:70,avgScoreVerified:0,bestScore:90,trend:0,rubricVersionAtLast:1}},1);
  assert.match(out,/평균 0점/);assert.ok(!out.includes('평균 70점'));
});
test('typed attempt analysis calculates imported numeric scores as numbers',()=>{
  const b=s.mdNormalizeLearningBox({typedAttempts:[{date:'2026-09-01T00:00:00Z',score:'30',rubricVersion:1},{date:'2026-09-02T00:00:00Z',score:'70',rubricVersion:1}]});
  s.enrichTypedStats(b,1);assert.equal(b.typedStats.avgScore,50);assert.equal(b.typedStats.avgScoreVerified,50);assert.equal(b.typedStats.bestScore,70);assert.equal(b.typedStats.verifiedAttempts,2);
});
test('summary escapes benign text IDs and formats malformed score data numerically',()=>{
  const out=s.renderSessionTypedSummary([{qid:punctuation,score:punctuation},{qid:'Q2',score:'80'},null,7]);
  assert.match(out,/3 &lt; 5 &amp; 8 &gt; 6 &quot;확인&quot;/);assert.match(out,/0점/);assert.match(out,/80점/);assert.match(out,/>40<\/div>/);assert.ok(!out.includes(punctuation));
});
test('study card renders imported box, recovery and focus counters safely',()=>{
  const q={id:punctuation,category:'항해',q:'기본 문제'};
  Object.assign(s,{queue:[q],currentIdx:0,currentMode:'focus',boxes:{[q.id]:{box:punctuation,recoveryStreak:punctuation,needsRetry:true}},window:{},focusQueueIds:[q.id],focusProgress:{[q.id]:punctuation},activeFocusTarget:punctuation,app:{innerHTML:''},
    saveSession(){},getImp:()=>3,icon:()=>'',getShipCards:()=>'',impTag:()=>'',stars:()=>'',boxTag:()=>'',shouldShowTypingBadge:()=>false,renderNavi3OralLink:()=>'',renderHintAction(){},numToSino:()=>'',speak(){}});
  s.renderCard();const out=s.app.innerHTML;
  assert.match(out,/연습 1\/3/);assert.match(out,/오답 회복 0\/2/);assert.match(out,/확실 0\/2/);assert.match(out,/#3 &lt; 5 &amp; 8 &gt; 6 &quot;확인&quot;/);assert.ok(!out.includes(punctuation));
});
test('focus history load and rendering normalize numeric data and preserve valid identities',()=>{
  const valid={ts:'1790985600000',ids:[1],dayNum:'3',replayCount:'2',sessionId:'unchanged',label:punctuation};
  const invalid={ts:punctuation,ids:[1],dayNum:punctuation,replayCount:punctuation};
  const rows=s.mdNormalizeFocusHistory([valid,invalid,null,{ids:'unexpected'}]);
  assert.equal(rows.length,2);assert.equal(rows[0].ts,1790985600000);assert.equal(rows[0].dayNum,3);assert.equal(rows[0].replayCount,2);
  assert.equal(rows[0].sessionId,'unchanged');assert.equal(rows[0].label,punctuation);assert.equal(rows[1].ts,0);assert.equal(rows[1].dayNum,0);assert.equal(rows[1].replayCount,0);
  Object.assign(s,{focusHistoryKey:()=> 'md_focus_history_navi3',localStorage:{getItem:()=>JSON.stringify([valid])},saveFocusHistory(){},QUESTIONS:[{id:1,category:'항해'}],FOCUS_HISTORY_MAX:100,icon:()=>''});
  const loaded=s.getFocusHistory();assert.equal(loaded[0].ts,1790985600000);assert.equal(loaded[0].dayNum,3);
  s.getFocusHistory=()=>[valid,invalid];const out=s.renderFocusHistorySection();
  assert.ok(!out.includes(punctuation));assert.match(out,/startFocusFromHistory\(1790985600000\)/);assert.match(out,/startFocusFromHistory\(0\)/);assert.match(out,/>↻2<\/span>/);
});
console.log(`safe learning render regressions passed (${passed} cases; idempotent in-memory patch)`);
