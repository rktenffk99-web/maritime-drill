"""Keep evaluation isolated and learning completion consistent after legacy generators."""
from pathlib import Path
import argparse
import sys


def patch_html(text: str) -> str:
    def replace_once(old: str, new: str) -> None:
        nonlocal text
        if new in text:
            return
        if text.count(old) != 1:
            raise RuntimeError('missing or ambiguous learning audit anchor: ' + old[:100])
        text = text.replace(old, new, 1)

    # A source tuple must resolve to one question before it is used for a saved answer.
    source_guard = '''function mdQuestionContentIssue(q){
  const issue=window.__mdLearningIntegrity.contentIssue(q);if(issue)return issue;
  const short=q&&(q._short||q._gradeShort),year=q&&q._year,session=q&&(q._session||q['회차']);
  const exam=short&&year&&session&&typeof getPastExam==='function'?getPastExam(short,year,session):null;
  return mdSourceQuestionContentIssue(exam,q);
}
function mdSourceQuestionContentIssue(exam,q){
  if(!exam||!Array.isArray(exam.questions)||!q)return '';
  const matches=exam.questions.filter(row=>row['과목']===q['과목']&&Number(row['번호'])===Number(q['번호']));
  return matches.length>1?'원문 문항 번호 확인 필요':'';
}
function mdSourceQuestionUsable(exam,q){return mdQuestionUsable(q)&&!mdSourceQuestionContentIssue(exam,q)}
'''
    if 'function mdSourceQuestionContentIssue(exam,q)' not in text:
        replace_once('function mdQuestionContentIssue(q){return window.__mdLearningIntegrity.contentIssue(q)}\n', source_guard)
    replace_once(
        "      if(q&&mdQuestionUsable(q))return {...q,_year:hit.year",
        "      if(q&&!mdSourceQuestionUsable(exam,q))continue;\n"
        "      if(q&&mdQuestionUsable(q))return {...q,_year:hit.year",
    )
    replace_once(
        '그림·밑줄 원문 확인이 필요한 ${removed}문항은 출제와 채점에서 제외했습니다.',
        '그림·밑줄 또는 문항 번호의 원문 확인이 필요한 ${removed}문항은 출제와 채점에서 제외했습니다.',
    )
    replace_once(
        '그림 또는 밑줄 정보가 없어 풀이와 채점에서 제외했습니다.',
        '그림·밑줄 또는 문항 번호를 확인할 수 없어 풀이와 채점에서 제외했습니다.',
    )

    replace_once(
        '  wrongs.forEach(({q,ans}) => addPastWrong(q, ans));',
        '  wrongs.forEach(({q,ans}) => {if(!q._evaluationMock)addPastWrong(q, ans)});',
    )
    replace_once(
        '  window.commitNavigatorPredictiveMockResult=function(queue,answers){\n'
        '    const rows=Array.isArray(queue)?queue:[];\n'
        '    const progress=ppLoadProgress(),today=ppDateKey(new Date());',
        '  window.commitNavigatorPredictiveMockResult=function(queue,answers){\n'
        '    const rows=Array.isArray(queue)?queue:[];\n'
        '    // Evaluation, review and unanswered papers do not change homework or training history.\n'
        '    const hasLearningOutcome=rows.some((q,i)=>q&&q._predictiveMock&&!q._predictiveReview&&!q._evaluationMock&&q._planKey&&answers&&answers[i]!==null&&answers[i]!==undefined);\n'
        '    if(!hasLearningOutcome)return;\n'
        '    const progress=ppLoadProgress(),today=ppDateKey(new Date());',
    )

    # Count the same clusters that the assignment treats as one learning item.
    stats = '''  function ppProgressStats(plan,gradeId,pool,progress,today){
    // learning-audit-cluster-stats-v1
    const clusters=new Map();
    pool.forEach(item=>{
      const id=ppHomeworkClusterId(item);
      if(!clusters.has(id))clusters.set(id,[]);
      clusters.get(id).push(item);
    });
    const selected=clusters.size;
    let passed=0,mastered=0,due=0,weak=0,freqTotal=0,freqPassed=0;
    for(const members of clusters.values()){
      const item=members[0],seen=ppHomeworkClusterSeen(item,progress);
      const records=members.map(row=>ppProgressFor(progress,row.key));
      if(ppHomeworkImportanceCount(item)>=2){freqTotal++;if(seen)freqPassed++}
      if(seen)passed++;
      if(ppHomeworkClusterMastered(item,progress))mastered++;
      if(records.some(r=>ppIsDue(r,today)))due++;
      if(records.some(r=>r.status==='weak'))weak++;
    }
    const phase=ppPhaseForGrade(plan,gradeId,pool,progress,today);
    return {selected,passed,mastered,due,weak,freqTotal,freqPassed,phase};
  }
'''
    if '// learning-audit-cluster-stats-v1' not in text:
        start = text.index('  function ppProgressStats(')
        end = text.index('  function ppSubjectChecks(', start)
        text = text[:start] + stats + text[end:]

    # Exclude incomplete source questions before frequency-practice quotas are drawn.
    replace_once(
        "  entries.sort((a,b)=>{\n"
        "    if(navi3AnalysisState.sort==='count')return b.count-a.count||b.score-a.score||b.latest-a.latest;",
        "  entries=entries.filter(entry=>mdQuestionUsable({question:entry.question}));\n"
        "  entries.sort((a,b)=>{\n"
        "    if(navi3AnalysisState.sort==='count')return b.count-a.count||b.score-a.score||b.latest-a.latest;",
    )
    # Accept both the legacy selector and the first audit's content-only guard.
    for old in [
        "  return exam&&exam.questions.find(item=>item['과목']===group.subject&&Number(item['번호'])===Number(hit.number)&&n3aNormalizeQuestion(item['문제'])===group.normalized);",
        "    const question=exam&&group&&exam.questions.find(item=>item['과목']===group.subject&&Number(item['번호'])===Number(number)&&n3aNormalizeQuestion(item['문제'])===group.normalized);",
    ]:
        intermediate = old.replace('===group.normalized);', '===group.normalized&&mdQuestionUsable(item));')
        new = old.replace('===group.normalized);', '===group.normalized&&mdSourceQuestionUsable(exam,item));')
        if new not in text:
            replace_once(intermediate if intermediate in text else old, new)
    return text


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stdout', action='store_true', help='emit generated HTML without changing files')
    parser.add_argument('--stdin', action='store_true', help='read HTML from stdin instead of index.html')
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[1] / 'index.html'
    original = sys.stdin.read() if args.stdin else path.read_text(encoding='utf-8-sig')
    patched = patch_html(original)
    if args.stdout:
        sys.stdout.write(patched)
    else:
        if args.stdin:
            parser.error('--stdin requires --stdout')
        if patched != original:
            path.write_text(patched, encoding='utf-8')
        print('learning audit patch applied')


if __name__ == '__main__':
    main()
