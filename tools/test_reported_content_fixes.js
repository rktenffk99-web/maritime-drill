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
    MD_PAST:{'2025-navi2-1':{questions:[law25]}},
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

const fixedLaw25=context.window.MD_PAST['2025-navi2-1'].questions[0];
assert(fixedLaw25['문제'].includes('선박은 기적'));
assert(fixedLaw25['문제'].includes('혼동되지 아니하는'));
assert(fixedLaw25['문제'].includes('두어야 한다'));
assert.strictEqual(fixedLaw25['정답'],3);
assert.strictEqual(fixedLaw25['선택지'][3],'20미터, 100미터');

console.log('reported-content-fixes tests: PASS');
