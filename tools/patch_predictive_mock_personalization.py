from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='predictive-personalization-v2'

if MARKER not in text:
    old="""  const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v1';
  function ppLoadPredictiveHistory(){
    try{const raw=localStorage.getItem(PREDICTIVE_HISTORY_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v.slice(0,2):[]}catch(e){return []}
  }
  function ppSavePredictiveHistory(keys){
    const history=ppLoadPredictiveHistory();
    const next=[Array.isArray(keys)?keys.slice():[],...history].slice(0,2);
    safeStorageSet(PREDICTIVE_HISTORY_KEY,JSON.stringify(next),'실전예측 모의 이력');
  }
"""
    new="""  const PREDICTIVE_HISTORY_KEY='md_predictive_mock_history_v2'; // predictive-personalization-v2
  const PREDICTIVE_HISTORY_LEGACY_KEY='md_predictive_mock_history_v1';
  function ppNormalizePredictiveHistoryStore(value){
    const out={navi2:[],navi3:[]};
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      PLAN_GRADES.forEach(g=>{if(Array.isArray(value[g]))out[g]=value[g].filter(Array.isArray).slice(0,2).map(run=>run.map(String))});
    }
    return out;
  }
  function ppLoadPredictiveHistoryStore(){
    try{
      const raw=localStorage.getItem(PREDICTIVE_HISTORY_KEY);
      if(raw)return ppNormalizePredictiveHistoryStore(JSON.parse(raw));
    }catch(e){}
    const migrated={navi2:[],navi3:[]};
    try{
      const raw=localStorage.getItem(PREDICTIVE_HISTORY_LEGACY_KEY),legacy=raw?JSON.parse(raw):[];
      if(Array.isArray(legacy)){
        PLAN_GRADES.forEach(g=>{
          migrated[g]=legacy.filter(Array.isArray).map(run=>run.map(String).filter(key=>key.startsWith(`${g}|`))).filter(run=>run.length).slice(0,2);
        });
      }
    }catch(e){}
    return migrated;
  }
  function ppLoadPredictiveHistory(gradeId){
    const store=ppLoadPredictiveHistoryStore();
    return PLAN_GRADES.includes(gradeId)?(store[gradeId]||[]):[];
  }
  function ppSavePredictiveHistory(gradeId,keys){
    if(!PLAN_GRADES.includes(gradeId)||!Array.isArray(keys)||!keys.length)return;
    const clean=keys.map(String).filter(key=>key.startsWith(`${gradeId}|`));
    if(!clean.length)return;
    const store=ppLoadPredictiveHistoryStore(),history=store[gradeId]||[];
    const sig=run=>JSON.stringify((run||[]).map(String).slice().sort());
    if(history.length&&sig(history[0])===sig(clean))return;
    store[gradeId]=[clean.slice(),...history].slice(0,2);
    safeStorageSet(PREDICTIVE_HISTORY_KEY,JSON.stringify(store),'실전예측 모의 이력');
  }
"""
    if old not in text:
        raise SystemExit('predictive history helper anchor not found')
    text=text.replace(old,new,1)

    old="""  function ppPredictiveWeight(item,history){
    const hits=item.hits||[],years=new Set(hits.map(h=>Number(h.year)));
    const count=hits.length;
    let weight=1+Math.min(5,count)*0.72;
    if(count>=2)weight+=0.8;
    if(count>=3)weight+=0.55;
    if(count>=4)weight+=0.35;
    if(years.has(2026))weight+=0.9;
    if(years.has(2025))weight+=0.6;
    if(years.has(2024))weight+=0.3;
    if(years.has(2026)&&hits.some(h=>Number(h.year)<2026))weight+=1.25;
    if(history[0]&&history[0].includes(item.key))weight*=0.45;
    else if(history[1]&&history[1].includes(item.key))weight*=0.75;
    return Math.max(0.12,weight);
  }
"""
    new="""  function ppPredictivePersonalMultiplier(item,progress){
    const rec=progress&&progress[item&&item.key];
    if(!rec)return 1;
    let mult=1;
    if(rec.status==='weak'||rec.lastOutcome==='wrong')mult*=1.20;
    const wrong=Math.max(0,Number(rec.wrong)||0);
    mult*=1+Math.min(0.15,wrong*0.03);
    if(rec.mastered)mult*=0.90;
    return Math.max(0.85,Math.min(1.45,mult));
  }
  function ppPredictiveWeight(item,history,progress){
    const hits=item.hits||[],years=new Set(hits.map(h=>Number(h.year)));
    const count=hits.length;
    let weight=1+Math.min(5,count)*0.72;
    if(count>=2)weight+=0.8;
    if(count>=3)weight+=0.55;
    if(count>=4)weight+=0.35;
    if(years.has(2026))weight+=0.9;
    if(years.has(2025))weight+=0.6;
    if(years.has(2024))weight+=0.3;
    if(years.has(2026)&&hits.some(h=>Number(h.year)<2026))weight+=1.25;
    if(history[0]&&history[0].includes(item.key))weight*=0.45;
    else if(history[1]&&history[1].includes(item.key))weight*=0.75;
    weight*=ppPredictivePersonalMultiplier(item,progress);
    return Math.max(0.12,weight);
  }
"""
    if old not in text:
        raise SystemExit('predictive weight anchor not found')
    text=text.replace(old,new,1)

    old='''  function ppPredictiveSample(items,data,count,history){'''
    new='''  function ppPredictiveSample(items,data,count,history,progress){'''
    if old not in text:
        raise SystemExit('predictive sample signature anchor not found')
    text=text.replace(old,new,1)
    text=text.replace('ppPredictiveWeight(item,history)', 'ppPredictiveWeight(item,history,progress)', 1)
    text=text.replace('ppPredictiveWeight(x,history)', 'ppPredictiveWeight(x,history,progress)', 1)

    old="""      const pool=planPools[gradeId]||[],history=ppLoadPredictiveHistory(),selected=[];
      for(const subject of subjects){
        const candidates=pool.filter(item=>item.subject===subject);
        const draw=ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history);
"""
    new="""      const pool=planPools[gradeId]||[],history=ppLoadPredictiveHistory(gradeId),progress=ppLoadProgress(),selected=[];
      for(const subject of subjects){
        const candidates=pool.filter(item=>item.subject===subject);
        const draw=ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress);
"""
    if old not in text:
        raise SystemExit('predictive start personalization anchor not found')
    text=text.replace(old,new,1)

    old="""      ppSavePredictiveHistory(keys);
      clearPastProgress();
"""
    new="""      clearPastProgress();
"""
    if old not in text:
        raise SystemExit('predictive premature history save anchor not found')
    text=text.replace(old,new,1)

    old="""  window.commitNavigatorPredictiveMockResult=function(queue,answers){
    const progress=ppLoadProgress(),today=ppDateKey(new Date());
    (queue||[]).forEach((q,i)=>{
      if(!q||!q._predictiveMock||!q._planKey)return;
      if(answers&&answers[i]===q['정답'])return;
      const r=ppProgressFor(progress,q._planKey);
      r.attempts=(r.attempts||0)+1;r.wrong=(r.wrong||0)+1;r.lastDate=today;r.lastOutcome='wrong';
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.dueDate=today;
    });
    ppSaveProgress(progress);
    const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);
  };
"""
    new="""  window.commitNavigatorPredictiveMockResult=function(queue,answers){
    const progress=ppLoadProgress(),today=ppDateKey(new Date()),rows=Array.isArray(queue)?queue:[];
    rows.forEach((q,i)=>{
      if(!q||!q._predictiveMock||!q._planKey)return;
      if(answers&&answers[i]===q['정답'])return;
      const r=ppProgressFor(progress,q._planKey);
      r.attempts=(r.attempts||0)+1;r.wrong=(r.wrong||0)+1;r.lastDate=today;r.lastOutcome='wrong';
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.dueDate=today;
    });
    const complete=rows.length>0&&Array.isArray(answers)&&answers.length>=rows.length&&rows.every((q,i)=>answers[i]!==null&&answers[i]!==undefined);
    if(complete){
      const first=rows.find(q=>q&&q._planKey),gradeId=first?String(first._planKey).split('|')[0]:'';
      const keys=rows.filter(q=>q&&q._predictiveMock&&q._planKey).map(q=>String(q._planKey));
      ppSavePredictiveHistory(gradeId,keys);
    }
    ppSaveProgress(progress);
    const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);
  };
"""
    if old not in text:
        raise SystemExit('predictive result completion anchor not found')
    text=text.replace(old,new,1)

    old='최근 5개년 빈출·최근성·2026 교차빈출 가중 · 최근 모의 중복 억제'
    new='최근 5개년 출제경향 중심 · 개인 취약도 보조 · 급수별 최근 완료 모의 중복 억제'
    if old not in text:
        raise SystemExit('predictive description anchor not found')
    text=text.replace(old,new,1)

if MARKER not in text:
    raise SystemExit('predictive personalization marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock personalization + per-grade completed history')
else:
    print('predictive mock personalization already patched')
