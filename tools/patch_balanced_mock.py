"""Replace the fixed latest-paper shortcut with a rotating, balanced practice exam."""
from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

def replace(old, new):
    global text
    if new in text:
        return
    if old not in text:
        raise RuntimeError('Missing balanced-mock anchor: ' + old[:100])
    text = text.replace(old, new)

start = text.index('  window.startNavigatorPassPlanMock=async function(gradeId){')
end = text.index('  function ppChoiceOrder(q){', start)
text = text[:start] + '''  window.startNavigatorPassPlanMock=async function(gradeId){
    if(!PLAN_GRADES.includes(gradeId)||window.__mdBalancedMockCreating)return;
    window.__mdBalancedMockCreating=true;
    const EXPOSURE_KEY='md_mock_exposure_v1',engine=window.__mdBalancedMock;
    const plan=ppLoadPlan();
    renderPastLoading(`${GRADE_LABELS[gradeId]} 새 실전 모의고사를 구성하는 중입니다`);
    try{
      await ppBuildPools(plan);
      const data=n3aData(gradeId),subjects=ppSelectedSubjects(plan,gradeId,data);
      if(!subjects.length)throw new Error('응시 과목을 1개 이상 선택하세요.');
      const identity=item=>PP_HOMEWORK_DUPLICATE_CLUSTER[item.key]||item.key;
      let raw=window.__mdBalancedMockExposureFallback||safeStorageGetJSON(EXPOSURE_KEY,null,'모의고사 출제 이력');
      let exposure=engine.normalize(raw);
      if(!exposure.grades[gradeId].sequence){
        const byKey=new Map((planPools[gradeId]||[]).map(item=>[item.key,item]));
        for(const oldRun of ppLoadPredictiveHistory(gradeId).slice().reverse()){
          exposure=engine.record(exposure,gradeId,oldRun.map(key=>byKey.has(key)?identity(byKey.get(key)):key));
        }
      }
      const selected=[],identities=[],fingerprints=new Set();
      for(const subject of subjects){
        const candidates=(planPools[gradeId]||[]).filter(item=>item.subject===subject).map(item=>{
          const q=ppFindQuestion(gradeId,item);
          return q?{...item,choices:q['선택지']}:null;
        }).filter(item=>item&&!fingerprints.has(ppPredictiveQuestionFingerprint(item)));
        const draw=engine.select(candidates,{gradeId,data,state:exposure,identity,count:PAST_MOCK_PER_SUBJECT});
        if(draw.items.length!==PAST_MOCK_PER_SUBJECT)throw new Error(`${subject}의 사용 가능한 서로 다른 문항이 ${PAST_MOCK_PER_SUBJECT}개보다 적습니다.`);
        for(const item of draw.items){selected.push(item);fingerprints.add(ppPredictiveQuestionFingerprint(item));}
        identities.push(...draw.identities);
      }
      const questions=await ppHydrateKeys(selected.map(item=>item.key));
      if(questions.length!==selected.length||questions.some(q=>!mdQuestionUsable(q)))throw new Error('일부 기출 원문을 확인할 수 없습니다.');
      const itemMap=new Map(selected.map(item=>[item.key,item]));
      const queue=orderNavigatorMockQuestions(shuffle(questions.map(q=>({...q,_predictiveMock:true,_balancedMock:true,
        _predictiveConcept:engine.topic(itemMap.get(q._planKey),data)}))),gradeId);
      // Record paper assembly once, even if later abandoned or submitted with blanks.
      // Resume, answer edits, grading and wrong-answer review never call record().
      const nextExposure=engine.record(exposure,gradeId,identities);
      const saved=safeStorageSet(EXPOSURE_KEY,JSON.stringify(nextExposure),'모의고사 출제 이력');
      window.__mdBalancedMockExposureFallback=saved?null:nextExposure;
      clearPastProgress();
      pastSubjectId=gradeId;pastBaseShort=gradeId;pastYear=null;pastSession=null;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock';
      pastQueue=queue;pastIdx=0;pastAnswers=new Array(queue.length).fill(null);pastMode='mock';pastStartedAt=Date.now();currentMode='past';
      renderPastCard();
    }catch(e){
      app.innerHTML=`<div class="card" style="margin-top:30px"><b>실전 모의고사를 시작하지 못했습니다.</b><div style="font-size:12px;margin-top:7px">${escapeHtml(e.message||String(e))}</div><button class="btn btn-outline" style="margin-top:12px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">합격 플랜으로 돌아가기</button></div>`;
    }finally{window.__mdBalancedMockCreating=false;}
  };

''' + text[end:]

# Both formats are available before the final-days phase. Put the new exam first.
old_start = text.index("        ${cfg.enabled&&cfg.examDate?`<button", text.index('const gradeCards=PLAN_GRADES.map'))
old_end = text.index('\n      </div>`;', old_start)
old_buttons = text[old_start:old_end]
predictive = next(line for line in old_buttons.splitlines() if 'onclick="startNavigatorPredictiveMock(' in line)
predictive = predictive.replace('class="btn btn-accent"', 'class="btn btn-outline"').replace("background:${g==='navi2'?'#2563EB':'#059669'};", '')
balanced = '''        ${cfg.enabled&&cfg.examDate?`<button class="btn btn-accent" style="width:100%;margin-top:9px;background:${g==='navi2'?'#2563EB':'#059669'};border-color:${g==='navi2'?'#2563EB':'#059669'}" onclick="startNavigatorPassPlanMock('${g}')">실전 모의고사 · 매회 새 출제</button><div class="md-mock-note" style="font-size:11px;color:var(--textDim);line-height:1.6;margin-top:6px">선택 과목당 25문항 · 최근 5개년 기출 · 유형 균형 배분<br>최근 출제 문항 중복 억제 · 미출제·적게 출제한 문제 우선</div>`:''}'''
text = text[:old_start] + balanced + '\n' + predictive + text[old_end:]

# A paper has one format. Store it on its metadata without changing legacy
# per-question references, which earlier rebuild steps recognize verbatim.
text = text.replace("predictive:q._predictiveMock===true,balanced:q._balancedMock===true,predictiveReview:", "predictive:q._predictiveMock===true,predictiveReview:")
text = text.replace("_predictiveMock:r.predictive===true,_balancedMock:r.balanced===true,_predictiveReview:", "_predictiveMock:r.predictive===true,_predictiveReview:")
replace('const meta={version:1,id:pastProgressId,refs,subjectId:', 'const meta={version:1,id:pastProgressId,balanced:pastQueue.every(q=>q._balancedMock===true),refs,subjectId:')
replace('    pastQueue=restored;pastAnswers=state.answers;', '    if(meta.balanced)restored.forEach(q=>{q._balancedMock=true});\n    pastQueue=restored;pastAnswers=state.answers;')
replace("${q._predictiveMock?'실전예측 ':pastMode==='mock'?'모의 ':''}", "${q._balancedMock?'실전 ':q._predictiveMock?'실전예측 ':pastMode==='mock'?'모의 ':''}")
replace("  const predictiveGrade = (pastQueue.find", "  const isBalancedMock = pastQueue.some(q=>q&&q._balancedMock);\n  const predictiveGrade = (pastQueue.find")
replace("${isPredictiveMock?'실전예측 모의 결과':", "${isBalancedMock?'실전 모의고사 결과':isPredictiveMock?'실전예측 모의 결과':")
replace("onclick=\"startNavigatorPredictiveMock('${predictiveGrade}')\">새 예측 모의</button>", "onclick=\"${isBalancedMock?'startNavigatorPassPlanMock':'startNavigatorPredictiveMock'}('${predictiveGrade}')\">${isBalancedMock?'새 실전 모의':'새 예측 모의'}</button>")

text = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.17';", text, count=1)
text = re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>', '<title>Maritime Drill v5.17 · Android</title>', text, count=1)
text = re.sub(r'<script src="(keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>', lambda m:f'<script src="{m[1]}.js?v=5.17"></script>', text)
p.write_text(text, encoding='utf-8')
print('balanced rotating mock exam v5.17 applied')
