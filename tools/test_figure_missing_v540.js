'use strict';
// v5.40: questions whose picture was lost in PDF extraction are excluded from
// homework, mocks and grading; an open saved paper containing one stays resumable.
const fs=require('fs'),path=require('path'),vm=require('vm'),zlib=require('zlib'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
process.chdir(root);
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}

function integrity(){
  const s={localStorage:{getItem(){return null},setItem(){}}};s.window=s;vm.createContext(s);
  vm.runInContext(fs.readFileSync(path.join(root,'learning-integrity.js'),'utf8'),s);
  return s.__mdLearningIntegrity;
}
const api=integrity();
const issue=text=>api.contentIssue({'문제':text,'선택지':['a','b','c','d'],'정답':0});

function bundledExam(id){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const m=html.match(new RegExp(`<script type="application/gzip" id="md-bundle-past-${id}_js">([^<]+)</script>`));
  assert.ok(m,'bundle '+id);
  const code=zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8');
  const s={MD_PAST:{}};s.window=s;vm.createContext(s);vm.runInContext(code,s);
  return Object.values(s.MD_PAST)[0];
}

(async()=>{
  await test('reported question: <보기> chart symbol missing is excluded',()=>{
    const exam=bundledExam('2024-navi3-4');
    const q=exam.questions.find(row=>row['과목']==='항해'&&row['문제'].startsWith('종이해도에서 <보기>의 해도도식의 의미는?'));
    assert.ok(q);assert.equal(api.contentIssue(q),'그림 원문 확인 필요');
  });
  await test('other missing chart symbols, shapes, radar images, circuits and graphs are excluded',()=>{
    for(const text of [
      '<보기>에서 해도도식의 의미는? <보기>',
      '종이해도에서 <보기>의 해도도식의 의미는? 〈보기〉',
      '해도도식 중  의 의미는?',
      '다음 해도 도식의 의미로 옳은 것은?',
      '종이해도에서 해도도식 의 의미는?',
      '해도상 아래 해도도식의 의미는?',
      '국제해상충돌방지규칙상 주간에 아래와 같은 형상물을표시해야 하는 선박은?',
      '레이더의 화면에서 자기 선박 주위에 선박이 존재하지않을 때 다음과 같은 영상이 나타나는 이유는?',
      '다음과 같은 회로에서 6[Ω]의 저항에 흐르는 전류는몇 [A]인가?',
      '다음 블록선도의 전달함수는?',
      '다음 그래프의 시간함수에 대한 라플라스 변환은?',
      '다음과 같은 디젤기관의 부하선도에서 기관의 운전점이 Ⓞ일 때 이상적인 이동 방향은?',
      '다음과 같은 선도의 명칭은?',
      '다음과 같은 기호의 소자 명칭은?'
    ])assert.equal(issue(text),'그림 원문 확인 필요',text);
  });
  await test('text-only questions that mention symbols, diagrams or freshness stay usable',()=>{
    for(const text of [
      '대조평균고조면을 의미하는 해도도식은?',
      '해도도식에서 암암(暗岩)이 의미하는 것은?',
      '해도에서 여러 사항들을 표시하기 위해서 사용되는 특수한 기호와 약어는?',
      '수선면(Water plane)에 나타난 반쪽 형상만을 그린 그림은?',
      '다음 중 어패류의 선도 판정법이 아닌 것은?',
      '다음 중 관능적으로 어획물의 선도를 판정할 때 선도가가장 낮은 것은?',
      '다음 [보기]에서 전기회로에 연결하는 전압계, 전류계및 전력계에 대한 설명으로 옳은 것을 모두 고른 것은? [보기] ① 전류계는 부하와 병렬로 연결한다.',
      '다음과 같은 회로시험기로 소형선박의 기관 시동용 배터리 전압을 측정할 때 선택스위치를 어디에 두고 측정하여야 하는가?',
      '<보기>에서 형상표지(주간표지)를 모두 고른 것은? <보 기> ㄱ. 입표 ㄴ. 도표 ㄷ. 등부표 ㄹ. 레이콘',
      '국제해상충돌방지규칙상 원통형의 형상물 1개를 표시하는 선박은?'
    ])assert.equal(issue(text),'',text);
  });
  await test('an attached picture or written figure description makes the question usable again',()=>{
    const q={'문제':'종이해도에서 <보기>의 해도도식의 의미는? <보기>','선택지':['a','b','c','d'],'정답':1};
    assert.equal(api.contentIssue({...q,_figureImage:'data:image/png;base64,AA=='}),'');
    assert.equal(api.contentIssue({...q,_figureText:'자홍색 원 안의 도선 표시'}),'');
  });
  await test('a saved paper with a newly excluded question resumes without it and is not duplicated',async()=>{
    const {harness}=require('./test_exam_sessions_v530.js');
    const a=harness();a.s.savePastProgress();const id=a.s.pastProgressId;
    for(let i=0;i<10;i++){a.s.pastIdx=i;a.s.pastAnswers[i]=i%4;a.s.savePastProgress();}
    const saved=a.s.getPastProgress(id),bad=a.s.pastQueue[3]['번호'];
    const b=harness(new Map(a.data));b.s.currentMode='home';
    let toast='';b.s.showToast=m=>{toast=m};
    b.s.mdQuestionUsable=q=>Number(q['번호'])!==bad;
    // The shared guard as it exists in index.html.
    vm.runInContext(`function mdGuardPastQueue(){
      const kept=[],answers=[];let removed=0,before=0;
      pastQueue.forEach((q,i)=>{if(mdQuestionUsable(q)){kept.push(q);answers.push(pastAnswers[i]===undefined?null:pastAnswers[i])}else{removed++;if(i<pastIdx)before++}});
      if(!removed)return true;
      pastQueue=kept;pastAnswers=answers;pastIdx=Math.max(0,Math.min(pastIdx-before,kept.length-1));
      showToast('그림 원문 확인이 필요한 '+removed+'문항은 출제와 채점에서 제외했습니다.');
      return kept.length>0;
    }`,b.s);
    // Re-run so the wrapper sees the guard (exam-sessions.js loads after the app).
    vm.runInContext(fs.readFileSync('exam-sessions.js','utf8'),b.s);
    b.s.renderPastCard=()=>{if(b.s.mdGuardPastQueue())b.s.savePastProgress()};
    await b.s.resumePastProgress(id,saved.headId);
    assert.equal(b.s.currentMode,'past');
    assert.equal(b.s.pastQueue.length,124);
    assert.ok(b.s.pastQueue.every(q=>q['번호']!==bad));
    assert.match(toast,/1문항/);
    assert.deepEqual(JSON.parse(JSON.stringify(b.s.pastAnswers.slice(0,9))),[0,1,2,0,1,2,3,0,1]);
    const open=b.s.__mdExamSessions.list();
    assert.equal(open.length,1,'old paper retired, one resumable paper remains');
    assert.notEqual(open[0].meta.id,id);
    assert.equal(open[0].meta.refs.length,124);
  });
  console.log(`${passed} figure-missing checks passed`);
})().catch(error=>{console.error(error);process.exit(1)});
