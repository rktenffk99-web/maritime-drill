const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('reported-content-fixes.js','utf8');
const law25={
  '번호':25,
  '과목':'법규',
  '문제':'( )에 순서대로 적합한 것은? "국제해상충돌방지규칙상 길이 ( ) 이상의 선박은기적 1개와 호종 1개를 갖추어 두어야 하며, 길이 ( ) 이상의 선박은 이에 덧붙여 호종과 혼동되지아니하는 음조와 소리를 가진 징을 갖추어 두어야한다."',
  '선택지':['12미터, 50미터','12미터, 100미터','20미터, 50미터','20미터, 100미터'],
  '정답':3
};
const context={
  window:{
    MD_NAVI_FREQUENCY:{navi3:{
      q1:'유지선은원칙적으로 자기 선박의 침로와 속력을 유지하고 위하여침로를 변경하지 않는다.',
      q2:'IAMSAR manual상 항공기로부터 조난선박에 투하하는보급품 컨테이너',
      q3:'개품운송계약에 의해 화물의 선적이 이루어지는 경우에 관한 설명으로 옳지 않은 것은?',
      q4:'다음 중 가장 정확한 위치선은?',
      q5:'해상교통안전법상 용어의 정의에 관한 설명으로 옳지않은 것은? 예인선열이란 길이 200미터 이상이 되게 다른선박을 끌거나 밀어 항행하는 것을 말한다. 통항로란 선박의 항행안전을 확보하기 위하여한쪽 방향으로 항해할 수 있도록 되어 있는 일정한 범위의 수역을 말한다.',
      q6:'• ㉴ Garbage recycling on board / • ㉵ Discharge to a port reception facility',
      q7:'garbage record book → MARPOL Annex V에 따라 모든 선박이 비치해야 하는 법정 장부. 쓰레기 처리 내역을 기재.'
    }},
    MD_DATA:{navi2:{q5:'Stockless anchor의 적절한묘쇄 신출량은 수심의 몇 배인가?'}},
    MD_PAST:{
      '2025-navi2-1':{questions:[law25]},
      '2022-navi2-3':{questions:[{
        '번호':47,
        '과목':'운용',
        '문제':'선저여유수심이 충분한 해역에서 스쿼팅(Squatting) 현상에 의한 선체 침하량을 구하는 식을 옳게 표현한 것은?[단, S: 침하량(m), C: 방형계수, V: 선속(kn)] b',
        '선택지':['\uE012 \uE047 \uE002\uE0E6 × \uE015 \uE054\uE034\uE03D\uE03D \uE035','\uE012 \uE047 \uE002\uE0E6 × \uE015\uE054\uE034\uE03D\uE03D','\uE012 \uE047 \uE002\uE0E6\uE035 × \uE015 \uE035\uE054\uE034\uE03D','\uE012 \uE047 \uE002\uE0E6\uE035 × \uE015\uE054\uE034\uE03D'],
        '정답':0
      }]}
    },
    getPastExam(){return this.MD_PAST['2025-navi2-1'];}
  },
  document:{readyState:'loading',addEventListener(){},getElementById(){return null},body:null},
  WeakSet,Object,String,console
};
context.getPastExam=context.window.getPastExam.bind(context.window);

vm.createContext(context);
vm.runInContext(source,context);

const navi3=context.window.MD_NAVI_FREQUENCY.navi3;
assert(navi3.q1.includes('유지선은 원칙적으로'));
assert(navi3.q1.includes('위하여 침로를'));
assert(navi3.q2.includes('투하하는 보급품'));
assert.strictEqual(navi3.q3,'개품운송계약에 의해 화물의 선적이 이루어지는 경우에 관한 설명으로 옳지 않은 것은?');
assert.strictEqual(navi3.q4,'다음 중 가장 정확한 위치선은?');
assert(navi3.q5.includes('옳지 않은'));
assert(navi3.q5.includes('다른 선박'));
assert(navi3.q5.includes('위하여 한쪽'));
assert(navi3.q6.includes('㉰ Garbage recycling on board'));
assert(navi3.q6.includes('㉱ Discharge to a port reception facility'));
assert(!navi3.q6.includes('㉴'));
assert(!navi3.q6.includes('㉵'));
assert(navi3.q7.includes('총톤수 100톤 이상'));
assert(!navi3.q7.includes('모든 선박이 비치해야'));
assert(context.window.MD_DATA.navi2.q5.includes('적절한 묘쇄'));

const fixedLaw25=context.window.getPastExam().questions[0];
assert(fixedLaw25['문제'].includes('선박은 기적'));
assert(fixedLaw25['문제'].includes('혼동되지 아니하는'));
assert(fixedLaw25['문제'].includes('두어야 한다'));
assert.strictEqual(fixedLaw25['정답'],3);
assert.strictEqual(fixedLaw25['선택지'][3],'20미터, 100미터');

const squat=context.window.MD_PAST['2022-navi2-3'].questions[0];
assert(squat['문제'].includes('Cb: 방형계수'));
assert(!squat['문제'].endsWith(' b'));
assert.deepStrictEqual(
  Array.from(squat['선택지']),
  ['S = Cb × V² / 100','S = Cb × V / 100','S = Cb² × V² / 10','S = Cb² × V / 10']
);
assert.strictEqual(squat['정답'],0);
assert.strictEqual(context.window.__mdReportedContentFixes.fixString('\uE012 \uE047 \uE002\uE0E6'),'S = Cb');
const grainClean='탱크 내의 Free surface effects를 수정한 후의 메타센터높이(G₀M)는 0.15m 이상일 것';
assert.strictEqual(
  context.window.__mdReportedContentFixes.fixString('탱크 내의 Free surface effects를 수정한 후 □ 의 메타센터높이(□□)는 0.15m 이상일 것 □'),
  grainClean
);
assert.strictEqual(
  context.window.__mdReportedContentFixes.fixString('탱크 내의 Free surface effects를 수정한 후 \uE06D 의 메타센터높이(\uE006\uE00C)는 0.15m 이상일 것 \uE0F3'),
  grainClean
);
const audit=context.window.__mdReportedContentFixes.auditKnownData();
assert.strictEqual(audit.navi2.length,0);

console.log('reported-content-fixes tests: PASS');
