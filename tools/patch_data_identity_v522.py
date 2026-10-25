"""Integrate stable content identities without mutating the question bank or progress storage.
Run after legacy generators. --stdout supports read-only/scratch final-artifact tests.
"""
from pathlib import Path
import argparse,re,sys
parser=argparse.ArgumentParser();parser.add_argument('--stdout',action='store_true');parser.add_argument('--stdin',action='store_true');parser.add_argument('--file',default='index.html');args=parser.parse_args()
p=Path(args.file);text=sys.stdin.read() if args.stdin else p.read_text(encoding='utf-8-sig')
def section(start,end,replacement):
 global text
 a=text.index(start);b=text.index(end,a);text=text[:a]+replacement+text[b:]
# The external helper is versioned together with the final HTML.
if not re.search(r'''<script\b[^>]*\bsrc=["']data-identity\.js(?:\?[^"']*)?["']''',text,re.I):
 anchor='<script>\n// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제 ──'
 assert anchor in text
 text=text.replace(anchor,'<script src="data-identity.js?v=5.22"></script>\n\n'+anchor,1)
section('async function ensureNavi3FrequencyData(subjectId){','function n3aRangeYears(data,range){',"""async function ensureNavi3FrequencyData(subjectId){
  const gradeId=subjectId||naviAnalysisSubjectId;
  let data=n3aData(gradeId);
  if(!data){const loaded=await loadOptionalScript(`past-analysis-${gradeId}.js`);data=n3aData(gradeId);if(!loaded||!data)throw new Error(`${gradeId.replace('navi','')}급 항해사 분석 데이터를 불러오지 못했습니다.`)}
  if(['navi2','navi3'].includes(gradeId)&&window.__mdDataIdentity&&data.identityPolicy!==window.__mdDataIdentity.policy){
    if(!pastDataSubjectsLoaded.has(gradeId))await ensurePastDataForSubject(gradeId);
    if(window.__mdReportedContentFixes)window.__mdReportedContentFixes.patchKnownData();
    window.__mdDataIdentity.prepareFrequency(data,{gradeId,getExam:getPastExam,usable:mdQuestionUsable});
    delete n3aOriginIndexes[gradeId];
  }
  return data;
}
""")
text=text.replace("  if(!data){\n    renderPastLoading(`${naviAnalysisSubjectId.replace('navi','')}급 항해사 빈출 통계를 불러오는 중입니다`);", "  if(!data||(['navi2','navi3'].includes(naviAnalysisSubjectId)&&data.identityPolicy!=='content-identity-v2')){\n    renderPastLoading(`${naviAnalysisSubjectId.replace('navi','')}급 항해사 빈출 통계를 불러오는 중입니다`);")
text=text.replace("if(mode==='recent5')navi3AnalysisState.years=complete.slice(-5);","if(mode==='recent5')navi3AnalysisState.years=window.__mdDataIdentity.trainingYears(data);")
text=text.replace("if(range==='recent')return new Set(all.filter(year=>year>=2023));","if(range==='recent')return new Set(window.__mdDataIdentity.trainingYears(data));")
text=text.replace("  if(!q||Number(q._year)<2026)return null;","  if(!q||!Number(q._year))return null;")
text=text.replace("? `2020~2025년 동일 문항 ${origin.previousCount}회 · ${origin.previousYears.join('·')}년`", "? `보유 이전 연도 동일 문항 ${origin.previousCount}회 · ${origin.previousYears.join('·')}년`")
text=text.replace(": '2020~2025년 동일 문항 없음';", ": `${origin.year}년 이전 보유 자료에 동일 문항 없음`;")
section('  function ppTrainingYears(data){','  function ppItemKey(gradeId,groupId){',"""  function ppTrainingYears(data){return window.__mdDataIdentity.trainingYears(data)}
""")
text=re.sub(r"  function ppHas2026\(item\)\{[^\n]*\}","  function ppHas2026(item){return !!(item&&Array.isArray(item.hits)&&item.hits.some(h=>Number(h.year)===Number(item.maxYear)))}",text)
section('  async function ppBuildPools(plan){','  function ppProgressFor(progress,key){',"""  async function ppBuildPools(plan){
    await ppEnsureFrequency();const pools={};
    for(const gradeId of PLAN_GRADES){
      const data=n3aData(gradeId);if(!data){pools[gradeId]=[];continue}
      if(!pastDataSubjectsLoaded.has(gradeId))await ensurePastDataForSubject(gradeId);
      pools[gradeId]=window.__mdDataIdentity.buildPool(data,{gradeId,subjects:ppSelectedSubjects(plan,gradeId,data),years:ppTrainingYears(data),getExam:getPastExam,usable:mdQuestionUsable});
    }
    planPools=pools;ppDataIdentityClusters=window.__mdDataIdentity.clusterPools(pools);return pools;
  }
""")
text=text.replace('const PP_HOMEWORK_DEDUPE_POLICY="near-duplicate-v1";', 'const PP_HOMEWORK_DEDUPE_POLICY="content-identity-v2";')
for label in ['CLUSTER','MEMBERS','STATS']:
 text=re.sub(r'  const PP_HOMEWORK_DUPLICATE_'+label+r'=Object\.freeze\(\{[^\n]*\}\);\n','',text)
if 'let ppDataIdentityClusters=' not in text:
 text=text.replace('  function ppHomeworkClusterId(item){','  let ppDataIdentityClusters={clusterFor:{},members:{},stats:{}};\n  function ppHomeworkClusterId(item){',1)
text=re.sub(r'  function ppHomeworkClusterId\(item\)\{[^\n]*\}',"  function ppHomeworkClusterId(item){return ppDataIdentityClusters.clusterFor[item&&item.key]||(item&&item.key)||''}",text)
text=re.sub(r'  function ppHomeworkClusterMemberKeys\(item\)\{[^\n]*\}',"  function ppHomeworkClusterMemberKeys(item){return ppDataIdentityClusters.members[ppHomeworkClusterId(item)]||((item&&item.key)?[item.key]:[])}",text)
text=re.sub(r'  function ppHomeworkClusterStats\(item\)\{[^\n]*\}',"  function ppHomeworkClusterStats(item){return ppDataIdentityClusters.stats[ppHomeworkClusterId(item)]||null}",text)
section('  function ppFindQuestion(gradeId,item){','  async function ppHydrateKeys(keys){',"""  function ppFindQuestion(gradeId,item){
    const q=item&&item.canonicalQuestion;if(!q||!mdQuestionUsable(q))return null;
    return {...q,_planKey:item.key,_planGrade:gradeId,_planCount:item.count,_planGroupId:item.groupId};
  }
""")
# Do not require choices on lightweight analysis objects; real question objects are guarded.
anchor="function mdQuestionContentIssue(q){\n"
if "window.__mdDataIdentity.questionIssue(q)" not in text:
 assert anchor in text;text=text.replace(anchor,anchor+"  const identityIssue=window.__mdDataIdentity&&window.__mdDataIdentity.questionIssue(q);if(identityIssue)return identityIssue;\n",1)
# These are user-facing current-year labels; legacy function names remain compatible.
text=text.replace('2026/빈출 우선','최신 연도/빈출 우선')
# The signature must invalidate stale daily assignments, while session resume is handled separately.
text=text.replace("dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY", "dedupePolicy:PP_HOMEWORK_DEDUPE_POLICY")
if args.stdout:sys.stdout.write(text)
else:p.write_text(text,encoding='utf-8')
