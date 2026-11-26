'use strict';
// v5.43: IPA-only pronunciations also show a Hangul learning reading.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c={console,document:{createElement(){let v='';return {set innerHTML(s){v=s},get value(){return v}}}}};c.window=c;vm.createContext(c);
for(const f of ['english-study-glossary.js','english-word-study.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const d=c.MDEnglishWordStudyData,hangul=d.hangulReadings;
const ipaOnly=Object.entries(d.lexicon).filter(([,v])=>String(v[1]).startsWith('/')).map(([w])=>w);
assert.ok(ipaOnly.length>2000);
const missing=ipaOnly.filter(w=>!hangul[w]);
assert.deepEqual(JSON.parse(JSON.stringify(missing)),["var'ly"],'every IPA-only word except the unclear abbreviation has Hangul');
for(const [w,h] of Object.entries(hangul))assert.match(h,/^[가-힣]+$/,w);
const expected={blank:'블랭크',detected:'디텍티드',quality:'퀄리티',upward:'업워드',season:'시즌',incheon:'인천',alfa:'알파',length:'렝스',visual:'비주얼'};
for(const [w,h] of Object.entries(expected))if(hangul[w])assert.equal(hangul[w],h,w);
const q={_year:2023,_short:'navi3',_session:3,'회차':3,'과목':'영어','번호':14,'문제':'Select the correct one for the blank.','선택지':['Sighted','Detected','Discovered','Observed']};
const html=c.MDEnglishWordStudy.supplement(q);
assert.match(html,/발음: 블랭크 \/ˈblæŋk\//);
// Existing Hangul readings and regression expectations stay as they were.
assert.equal(d.lexicon.the[1],'더 / 디');assert.equal(d.lexicon.sailing[1],'/ˈseɪlɪŋ/');
console.log(`hangul readings: ${Object.keys(hangul).length} words`);
