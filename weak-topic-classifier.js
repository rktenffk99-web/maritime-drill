// Shared topic rules for result analytics and homework weighting.
// Classify the stem first; generic stems may use the answer choices as evidence.
(function(global){
  'use strict';
  const normalize=value=>String(value==null?'':value).normalize('NFKC').toLowerCase();
  function specific(subject,t){
    if(subject==='항해'){
      if(/자오선|천체|적위|정거|방위각|고도|\b(?:latitude|declination|celestial)\b/.test(t))return '천문항해';
      if(/레이더|반사|측엽|거짓상|\bradar\b/.test(t))return '레이더';
      if(/자기|자차|나침반|\b(?:compass|flinders|magnet(?:s|ic|ism)?)\b/.test(t))return '자기컴퍼스';
      if(/선속계|대지속력|대수속력|\b(?:doppler|logs?)\b/.test(t))return '항해계기';
      if(/중분위도|대권|항정|항법|\b(?:mercator|rhumb)\b/.test(t))return '항법계산';
      if(/해도|수로|\b(?:charts?|publications?)\b/.test(t))return '해도·항해도서';
    }
    if(subject==='법규'){
      if(/해상교통안전법|통항|분리수역|연안통항대|예인선열|거대선/.test(t))return '해상교통안전법';
      if(/상법|선하증권|운송인|감항|송하인|수하인|해상운송/.test(t))return '상법·해상운송';
      if(/선박직원법|승무기준|해기사/.test(t))return '선박직원법';
      if(/충돌|항법|등화|형상물|\bcolregs?\b/.test(t))return '충돌예방규칙';
    }
    if(subject==='영어'){
      if(/\b(?:smcp|wheel orders?|starboard|port of you|steady|meet her)\b/.test(t))return 'SMCP·표준해사영어';
      if(/\b(?:charter(?:s|er|ers|ing)?|laytime|demurrage|dispatch|fio|berths?|loading|discharg(?:e|ed|es|ing))\b/.test(t))return '용선·하역 영어';
      if(/\b(?:sar|rescue|distress|vhf|khz|mhz|frequenc(?:y|ies)|coordinators?)\b/.test(t))return 'SAR·통신 영어';
      if(/\b(?:fire(?:s|main|fighting)?|extinguishers?|garbage|marpol|pollution|lifeboats?|lifejackets?|abandon)\b/.test(t))return '안전·환경 영어';
      if(/\b(?:navigation|compass|radar|latitude|longitude|courses?|bearings?|buoys?|tides?|depth|draught|draft|anchors?)\b/.test(t))return '항해·운항 영어';
      if(/\b(?:insurance|underwriters?|indemnity|general average|bills? of lading|freight|consignees?)\b/.test(t))return '운송·보험 영어';
      if(/\b(?:how many|how much|prepositions?|translations?|wrong explanation|fill (?:in )?the blank|grammar|synonyms?|antonyms?|meaning|means|sentence|words?)\b/.test(t))return '문법·어휘·번역';
    }
    if(subject==='운용'){
      if(/복원|메타센터|경심|자유표면|횡경사|종경사|트림|흘수|선체강도|전단력|굽힘|호깅|새깅|\b(?:stability|metacentr\w*|trim|hogging|sagging|gm)\b/.test(t))return '복원성·선체강도';
      if(/화재|소화|구명|퇴선|수색|구조정|응급|심폐|비상|\b(?:fire|lifeboat|rescue|iamsar|cpr)\b/.test(t))return '비상·소화·구명';
      if(/기상|태풍|기압|전선|풍향|풍속|습도|구름|안개|해류|조류|파랑|조석|\b(?:weather|typhoon|pressure|humidity)\b/.test(t))return '기상·해양';
      if(/기관|추진|디젤|행정|기통|연료|발전|보일러|냉각|윤활|펌프|\b(?:engine|diesel|boiler|pump|propeller)\b/.test(t))return '기관·설비';
      if(/조종|조타|선회|타각|정지거리|묘박|투묘|양묘|묘쇄|닻|접안|이안|예인|천수|\b(?:rudder|anchor|squat|manoeuv\w*)\b/.test(t))return '선박조종·묘박';
      if(/당직|선교|안전관리|보안|선원|\b(?:ism|isps|stcw|psc|watchkeeping)\b/.test(t))return '안전관리·당직';
    }
    if(subject==='상선전문'){
      if(/보험|해손|손해|보상|\b(?:insurance|indemnity|underwriter|average)\b/.test(t))return '해상보험·손해';
      if(/위험물|유해액체|독성|액화|불활성|인화|탱커|유조선|원유|\b(?:imdg|ibc|igc|lng|lpg|inert|flammab\w*)\b/.test(t))return '위험물·액체화물';
      if(/용선|운송|운임|선하증권|상법|송하인|수하인|\b(?:charter\w*|freight|laytime|demurrage|lading)\b/.test(t))return '해상운송·용선';
      if(/선박법|국적증서|톤수|선적항|선박등록/.test(t))return '선박법·톤수·증서';
      if(/오염|폐기물|기름기록|평형수|황함유|배출|\b(?:marpol|ballast water|pollution|garbage)\b/.test(t))return '오염방지·환경';
      if(/하역|적재|양하|선적|고박|크레인|활차|하중|검재|화물|\b(?:cargo|tackle|sheave|brereton|loading|discharg\w*)\b/.test(t))return '화물적재·양하';
      if(/\b(?:solas|ism|isps|imo)\b|국제협약|안전관리|보안|검사|증서/.test(t))return '국제협약·안전관리';
    }
    return '';
  }
  function classify(subject,text,choices){
    const stem=specific(subject,normalize(text));if(stem)return stem;
    const fallback=Array.isArray(choices)?specific(subject,choices.map(normalize).join(' ')):'';
    return fallback||(subject==='영어'?'해사영어 일반':`${subject||'기타'} 일반`);
  }
  global.__mdWeakTopicClassifier={classify};
})(window);
