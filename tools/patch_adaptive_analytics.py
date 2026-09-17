from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

# Load the adaptive analytics helper after the main application script.
tag='<script src="adaptive-analytics.js"></script>'
if tag not in text:
    marker='</body>'
    if marker not in text:
        raise SystemExit('adaptive analytics body anchor missing')
    text=text.replace(marker,tag+'\n'+marker,1)

# Future predictive mocks receive a bounded concept-level multiplier in addition
# to the existing per-question personal multiplier.
old="""    weight*=ppPredictivePersonalMultiplier(item,progress);
    return Math.max(0.12,weight);"""
new="""    weight*=ppPredictivePersonalMultiplier(item,progress);
    if(window.mdPredictiveWeaknessMultiplier){
      try{weight*=window.mdPredictiveWeaknessMultiplier(item,n3aData(item.gradeId))}catch(e){}
    }
    return Math.max(0.12,weight);"""
if new not in text:
    if old not in text:
        raise SystemExit('predictive concept-weight anchor missing')
    text=text.replace(old,new,1)

# Keep coverage/deadline quotas intact, but reorder up to 35% of NEW-question
# slots toward weak concepts. Review-due questions are still selected first.
old="""        for(const item of sortedNewCandidates(g).slice(0,quotas[g]))takeNew(item);"""
new="""        const newCandidates=sortedNewCandidates(g);
        const adaptiveCandidates=window.mdAdaptiveStudyOrder?window.mdAdaptiveStudyOrder(newCandidates,n3aData(g),progress,quotas[g]):newCandidates;
        for(const item of adaptiveCandidates.slice(0,quotas[g]))takeNew(item);"""
if new not in text:
    if old not in text:
        raise SystemExit('auto adaptive-new anchor missing')
    text=text.replace(old,new,1)

old="""          for(const item of sortedNewCandidates(g)){
            if(used[g]>=target)break;"""
new="""          const newCandidates=sortedNewCandidates(g),remainingNewSlots=Math.max(0,target-used[g]);
          const adaptiveCandidates=window.mdAdaptiveStudyOrder?window.mdAdaptiveStudyOrder(newCandidates,n3aData(g),progress,remainingNewSlots):newCandidates;
          for(const item of adaptiveCandidates){
            if(used[g]>=target)break;"""
if new not in text:
    if old not in text:
        raise SystemExit('manual adaptive-new anchor missing')
    text=text.replace(old,new,1)

# Give the focused weak-topic session its own visible label.
old="""    if(planSessionKind==='today-wrong')return '오늘 오답';
    if(planSessionKind==='frequent-wrong')return '자주 틀리는 문제';
    return '오늘의 숙제';"""
new="""    if(planSessionKind==='today-wrong')return '오늘 오답';
    if(planSessionKind==='frequent-wrong')return '자주 틀리는 문제';
    if(planSessionKind==='concept-weak')return '취약 파트 보강';
    return '오늘의 숙제';"""
if new not in text:
    if old not in text:
        raise SystemExit('weak concept session-label anchor missing')
    text=text.replace(old,new,1)

old_desc='최근 5개년 출제경향 중심 · 개인 취약도 보조 · 급수별 최근 완료 모의 중복 억제'
new_desc='최근 5개년 출제경향 + 파트별 취약도 자동가중 · 급수별 최근 완료 모의 중복 억제'
if old_desc in text:
    text=text.replace(old_desc,new_desc,1)
elif new_desc not in text:
    raise SystemExit('predictive description anchor missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched adaptive result analytics and weak-topic weighting')
else:
    print('adaptive result analytics already patched')
