"""Keep navigator mock papers in exam subject order after legacy rebuilds."""
from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

helper = """// mock-subject-order: preserve random selection within contiguous subjects.
function orderNavigatorMockQuestions(questions,gradeId){
  if(!['navi2','navi3'].includes(baseFromShort(gradeId)))return questions;
  const groups=new Map();
  questions.forEach(q=>{
    const subject=q['과목']||'기타';
    if(!groups.has(subject))groups.set(subject,[]);
    groups.get(subject).push(q);
  });
  const subjects=[...new Set(['항해','운용','법규','영어','상선전문','어선전문',...groups.keys()])];
  return subjects.flatMap(subject=>groups.get(subject)||[]);
}

"""
anchor = 'function pastQuestionsMatch(a,b){'
if '// mock-subject-order:' not in text:
    if anchor not in text:
        raise RuntimeError('Missing mock subject-order helper anchor')
    text = text.replace(anchor, helper + anchor, 1)


def replace_in(start, end, old, new):
    global text
    a = text.index(start)
    b = text.index(end, a)
    block = text[a:b]
    if new in block:
        return
    if block.count(old) != 1:
        raise RuntimeError('Unexpected mock subject-order anchor: ' + start)
    text = text[:a] + block.replace(old, new, 1) + text[b:]


replace_in('async function startPastYearPickSession(mode){',
           'async function startPastAllYearsSession(mode){',
           'finalPool = shuffle(finalPool);',
           'finalPool = orderNavigatorMockQuestions(shuffle(finalPool),pastBaseShort);')
# Apply the existing unusable-question rule before sampling, as the other mock
# generators do, so the render guard cannot shrink a full subject block later.
replace_in('async function startPastYearPickSession(mode){',
           'async function startPastAllYearsSession(mode){',
           "pool.forEach(function(q){\n      var k = q['과목']||'기타';",
           "pool.forEach(function(q){\n      if(!mdQuestionUsable(q))return;\n      var k = q['과목']||'기타';")
for start, end in [
    ('async function startPastAllYearsSession(mode){', 'function renderPastSessionPick('),
    ('async function startPastSession(mode, subjFilter){', 'function mdQuestionContentIssue('),
]:
    replace_in(start, end,
               '    pool = shuffle(pool);\n  } else {',
               '    pool = orderNavigatorMockQuestions(shuffle(pool),pastBaseShort);\n  } else {')

replace_in('window.startNavigatorPredictiveMock=async function(gradeId){',
           'window.commitNavigatorPredictiveMockResult=function(queue,answers){',
           """      const queue=shuffle(questions.map(q=>{
        const item=itemMap.get(q._planKey);
        return {...q,_predictiveMock:true,_predictiveConcept:ppPredictiveConcept(item,data)};
      }));""",
           """      const queue=orderNavigatorMockQuestions(shuffle(questions.map(q=>{
        const item=itemMap.get(q._planKey);
        return {...q,_predictiveMock:true,_predictiveConcept:ppPredictiveConcept(item,data)};
      })),gradeId);""")

replace_in('async function startNavi3FrequencyPractice(', 'function n3a',
           'pastQueue=pool;pastIdx=0;',
           "pastQueue=safeMode==='mock'?orderNavigatorMockQuestions(pool,gradeId):pool;pastIdx=0;")

# Keep source question numbers intact for answer keys, bookmarks and resume IDs.
# Only the visible mock question number follows the paper's sequential numbering.
replace_in('function renderPastCard(){', 'function choosePastAnswer(i){',
           '<span class="tag" style="background:#F1F5F9;color:#475569;margin:0">Q${q[\'번호\']}</span>',
           '<span class="tag" style="background:#F1F5F9;color:#475569;margin:0" title="기출 원문 번호: ${q[\'번호\']}">Q${pastMode===\'mock\'&&[\'navi2\',\'navi3\'].includes(pastBaseShort)?pastIdx+1:q[\'번호\']}</span>')

p.write_text(text, encoding='utf-8')
print('navigator mock subject order applied')
