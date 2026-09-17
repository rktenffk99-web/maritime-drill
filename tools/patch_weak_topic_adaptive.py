from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='weak-topic-adaptive-v1'

# Base weak-topic helpers + predictive weighting are inserted once.
if MARKER not in text:
    anchor="""  function ppPredictivePersonalMultiplier(item,progress){
    const rec=progress&&progress[item&&item.key];
    if(!rec)return 1;
    let mult=1;
"""
    replacement="""  const WEAK_TOPIC_PROFILE_KEY='md_weak_topic_profile_v1'; // weak-topic-adaptive-v1
  function ppWeakTopicId(item){
    const subject=String(item&&item.subject||'기타');
    const t=String(item&&item.question||'').normalize('NFKC').toLowerCase();
    if(subject==='항해'){
      if(/자오선|천체|적위|정거|방위각|고도|latitude|declination|celestial/.test(t))return '천문항해';
      if(/레이더|radar|반사|측엽|거짓상/.test(t))return '레이더';
      if(/자기|자차|compass|flinders|magnet|나침반/.test(t))return '자기컴퍼스';
      if(/선속계|doppler|log|대지속력|대수속력/.test(t))return '항해계기';
      if(/중분위도|대권|항정|항법|mercator|rhumb/.test(t))return '항법계산';
      if(/해도|수로|chart|publication/.test(t))return '해도·항해도서';
      return '항해 일반';
    }
    if(subject==='법규'){
      if(/해상교통안전법|통항|분리수역|연안통항대|예인선열|거대선/.test(t))return '해상교통안전법';
      if(/상법|선하증권|운송인|감항|송하인|수하인|해상운송/.test(t))return '상법·해상운송';
      if(/선박직원법|승무기준|해기사/.test(t))return '선박직원법';
      if(/충돌|항법|등화|형상물|colreg/.test(t))return '충돌예방규칙';
      return '법규 일반';
    }
    if(subject==='영어'){
      if(/smcp|wheel order|starboard|port of you|steady|meet her/.test(t))return 'SMCP·표준해사영어';
      if(/charter|laytime|demurrage|dispatch|fio|berth|loading|discharg/.test(t))return '용선·하역 영어';
      if(/sar|rescue|distress|vhf|khz|mhz|frequency|coordinator/.test(t))return 'SAR·통신 영어';
      if(/fire|extinguisher|garbage|marpol|pollution/.test(t))return '안전·환경 영어';
      if(/how many|how much|preposition|translation|wrong explanation|fill the blank/.test(t))return '문법·어휘·번역';
      return '해사영어 일반';
    }
    return `${subject} 일반`;
  }
  function ppLoadWeakTopicProfile(){
    try{const raw=localStorage.getItem(WEAK_TOPIC_PROFILE_KEY),v=raw?JSON.parse(raw):null;return v&&v.topics&&typeof v.topics==='object'?v.topics:{}}catch(e){return {}}
  }
  function ppWeakTopicBoost(item,profile){
    const p=profile||ppLoadWeakTopicProfile(),key=`${item&&item.subject||'기타'}|${ppWeakTopicId(item)}`,row=p[key];
    if(!row||!(Number(row.wrong)>0))return 1;
    const share=Math.max(0,Math.min(100,Number(row.targetShare)||0));
    const err=Math.max(0,Math.min(100,Number(row.errorRate)||0));
    return Math.min(1.75,1+share/180+err/500);
  }
  function ppPredictivePersonalMultiplier(item,progress){
    const rec=progress&&progress[item&&item.key];
    let mult=1;
    if(!rec){mult*=ppWeakTopicBoost(item);return mult}
"""
    if anchor not in text:
        raise SystemExit('predictive personal multiplier anchor not found')
    text=text.replace(anchor,replacement,1)

    old="""    if(rec.mastered)mult*=0.90;
    return Math.max(0.85,Math.min(1.45,mult));
"""
    new="""    if(rec.mastered)mult*=0.90;
    mult*=ppWeakTopicBoost(item);
    return Math.max(0.85,Math.min(1.85,mult));
"""
    if old not in text:
        raise SystemExit('predictive personal multiplier return anchor not found')
    text=text.replace(old,new,1)

# The daily assignment builder is rewritten by later patches on every workflow run.
# Therefore restore the weak-topic sort every time it is missing, even if the
# helper marker already exists from a previous deployment.
weak_sort="""      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!selectedKeys.has(item.key));
      const weakProfile=ppLoadWeakTopicProfile();
      candidates.sort((a,b)=>ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)||(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
"""
if 'ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)' not in text:
    plain_sort="""      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!selectedKeys.has(item.key));
      candidates.sort((a,b)=>(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
"""
    if plain_sort not in text:
        raise SystemExit('daily new candidate sort anchor not found')
    text=text.replace(plain_sort,weak_sort,1)

if MARKER not in text:
    raise SystemExit('weak topic adaptive marker missing')
if 'ppWeakTopicBoost(b,weakProfile)-ppWeakTopicBoost(a,weakProfile)' not in text:
    raise SystemExit('weak topic daily sort missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched weak-topic adaptive weighting')
else:
    print('weak-topic adaptive weighting already patched')
