from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='predictive-history-fingerprint-v1'

if MARKER not in text:
    anchor="""  function ppPredictiveWeight(item,history,progress){"""
    helper="""  const PREDICTIVE_FP_HISTORY_KEY='md_predictive_mock_fingerprint_history_v1'; // predictive-history-fingerprint-v1
  function ppPredictiveHistoryFingerprint(item){
    return String(item&&(item.question||item['문제'])||'').normalize('NFKC').toLowerCase().replace(/\\s+/g,' ').trim();
  }
  function ppNormalizePredictiveFingerprintHistory(value){
    const out={navi2:[],navi3:[]};
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      PLAN_GRADES.forEach(g=>{
        if(Array.isArray(value[g])){
          out[g]=value[g].filter(Array.isArray).slice(0,2).map(run=>[...new Set(run.map(String).filter(Boolean))]);
        }
      });
    }
    return out;
  }
  function ppLoadPredictiveFingerprintHistoryStore(){
    try{
      const raw=localStorage.getItem(PREDICTIVE_FP_HISTORY_KEY);
      return raw?ppNormalizePredictiveFingerprintHistory(JSON.parse(raw)):ppNormalizePredictiveFingerprintHistory(null);
    }catch(e){return ppNormalizePredictiveFingerprintHistory(null)}
  }
  function ppLoadPredictiveFingerprintHistory(gradeId){
    const store=ppLoadPredictiveFingerprintHistoryStore();
    return PLAN_GRADES.includes(gradeId)?(store[gradeId]||[]):[];
  }
  function ppSavePredictiveFingerprintHistory(gradeId,rows){
    if(!PLAN_GRADES.includes(gradeId)||!Array.isArray(rows)||!rows.length)return;
    const fps=[...new Set(rows.filter(q=>q&&q._predictiveMock).map(ppPredictiveHistoryFingerprint).filter(Boolean))];
    if(!fps.length)return;
    const store=ppLoadPredictiveFingerprintHistoryStore(),history=store[gradeId]||[];
    const sig=run=>JSON.stringify((run||[]).map(String).slice().sort());
    if(history.length&&sig(history[0])===sig(fps))return;
    store[gradeId]=[fps,...history].slice(0,2);
    safeStorageSet(PREDICTIVE_FP_HISTORY_KEY,JSON.stringify(store),'실전예측 모의 문항 이력');
  }
  function ppPredictiveRecentLevel(item,keyHistory){
    const key=String(item&&item.key||'');
    if(keyHistory&&keyHistory[0]&&keyHistory[0].includes(key))return 0;
    if(keyHistory&&keyHistory[1]&&keyHistory[1].includes(key))return 1;
    const gradeId=key.split('|')[0],fp=ppPredictiveHistoryFingerprint(item);
    if(!PLAN_GRADES.includes(gradeId)||!fp)return -1;
    const fpHistory=ppLoadPredictiveFingerprintHistory(gradeId);
    if(fpHistory[0]&&fpHistory[0].includes(fp))return 0;
    if(fpHistory[1]&&fpHistory[1].includes(fp))return 1;
    return -1;
  }
"""+anchor
    if anchor not in text:
        raise SystemExit('predictive weight anchor not found')
    text=text.replace(anchor,helper,1)

    old="""    if(history[0]&&history[0].includes(item.key))weight*=0.45;
    else if(history[1]&&history[1].includes(item.key))weight*=0.75;
    weight*=ppPredictivePersonalMultiplier(item,progress);"""
    new="""    const recentLevel=ppPredictiveRecentLevel(item,history);
    if(recentLevel===0)weight*=0.45;
    else if(recentLevel===1)weight*=0.75;
    weight*=ppPredictivePersonalMultiplier(item,progress);"""
    if old not in text:
        raise SystemExit('predictive recent-history weight anchor not found')
    text=text.replace(old,new,1)

    old="""      ppSavePredictiveHistory(gradeId,keys);"""
    new="""      ppSavePredictiveHistory(gradeId,keys);
      ppSavePredictiveFingerprintHistory(gradeId,rows);"""
    if old not in text:
        raise SystemExit('predictive completed-history save anchor not found')
    text=text.replace(old,new,1)

for needle in [
    MARKER,
    "const PREDICTIVE_FP_HISTORY_KEY='md_predictive_mock_fingerprint_history_v1'",
    'function ppPredictiveHistoryFingerprint(item)',
    'function ppPredictiveRecentLevel(item,keyHistory)',
    'const recentLevel=ppPredictiveRecentLevel(item,history);',
    'ppSavePredictiveFingerprintHistory(gradeId,rows);',
]:
    if needle not in text:
        raise SystemExit(f'missing predictive fingerprint-history marker: {needle}')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock recent-history fingerprint matching')
else:
    print('predictive fingerprint history already patched')
