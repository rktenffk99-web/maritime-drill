// Shared topic rules for result analytics and homework weighting.
// Keep Latin keywords at word boundaries: "necessary" is not "SAR".
(function(global){
  'use strict';
  function classify(subject,text){
    const t=String(text==null?'':text).normalize('NFKC').toLowerCase();
    if(subject==='항해'){
      if(/자오선|천체|적위|정거|방위각|고도|\b(?:latitude|declination|celestial)\b/.test(t))return '천문항해';
      if(/레이더|반사|측엽|거짓상|\bradar\b/.test(t))return '레이더';
      if(/자기|자차|나침반|\b(?:compass|flinders|magnet(?:s|ic|ism)?)\b/.test(t))return '자기컴퍼스';
      if(/선속계|대지속력|대수속력|\b(?:doppler|logs?)\b/.test(t))return '항해계기';
      if(/중분위도|대권|항정|항법|\b(?:mercator|rhumb)\b/.test(t))return '항법계산';
      if(/해도|수로|\b(?:charts?|publications?)\b/.test(t))return '해도·항해도서';
      return '항해 일반';
    }
    if(subject==='법규'){
      if(/해상교통안전법|통항|분리수역|연안통항대|예인선열|거대선/.test(t))return '해상교통안전법';
      if(/상법|선하증권|운송인|감항|송하인|수하인|해상운송/.test(t))return '상법·해상운송';
      if(/선박직원법|승무기준|해기사/.test(t))return '선박직원법';
      if(/충돌|항법|등화|형상물|\bcolregs?\b/.test(t))return '충돌예방규칙';
      return '법규 일반';
    }
    if(subject==='영어'){
      if(/\b(?:smcp|wheel orders?|starboard|port of you|steady|meet her)\b/.test(t))return 'SMCP·표준해사영어';
      if(/\b(?:charter(?:s|er|ers|ing)?|laytime|demurrage|dispatch|fio|berths?|loading|discharg(?:e|ed|es|ing))\b/.test(t))return '용선·하역 영어';
      if(/\b(?:sar|rescue|distress|vhf|khz|mhz|frequenc(?:y|ies)|coordinators?)\b/.test(t))return 'SAR·통신 영어';
      if(/\b(?:fire(?:s|main|fighting)?|extinguishers?|garbage|marpol|pollution)\b/.test(t))return '안전·환경 영어';
      if(/\b(?:how many|how much|prepositions?|translations?|wrong explanation|fill (?:in )?the blank)\b/.test(t))return '문법·어휘·번역';
      return '해사영어 일반';
    }
    return `${subject||'기타'} 일반`;
  }
  global.__mdWeakTopicClassifier={classify};
})(window);
