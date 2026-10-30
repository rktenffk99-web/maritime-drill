// Offline lexical supplement. Does not change questions, answers, identity or learning state.
(function(global){
  'use strict';
  const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MARKS=['㉮','㉯','㉰','㉱'];
  function text(value){
    // Decode entities before removing markup, including the encoded first letters reported
    // by the user. This parser is detached; source HTML is never inserted into the live DOM.
    const decoder=document.createElement('textarea');
    decoder.innerHTML=String(value??'');
    return decoder.value.replace(/<[^>]*>/g,' ').replace(/’/g,"'");
  }
  function tokens(value){return text(value).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[];}
  function eligible(q){
    return q && q['과목']==='영어' && /^(navi2|navi3)$/.test(q._short||q._gradeShort||'');
  }
  function key(q){return `${q._year}|${q._short||q._gradeShort}|${q._session||q['회차']}|영어|${q['번호']}`;}
  function wordSection(label,value,local){
    const data=global.MDEnglishWordStudyData;
    const ts=tokens(value),seen=new Map();
    ts.forEach((word,i)=>{
      const normalized=word.toLowerCase();
      if(!seen.has(normalized))seen.set(normalized,{word,positions:[]});
      seen.get(normalized).positions.push(i+1);
    });
    if(!ts.length)return '';
    let result=`<p><b>${H(label)}</b><br>${H(text(value))}</p>`;
    result+='<table style="width:100%;table-layout:fixed;border:1px solid #BAE6FD;font-size:0.92em"><thead><tr><th style="text-align:left;padding:6px;width:28%">단어·원문 순서</th><th style="text-align:left;padding:6px">기본 뜻·형태 / 발음</th></tr></thead><tbody>';
    for(const [word,item] of seen){
      const entry=data.lexicon[word];
      // A future imported question may contain a new token. Expose it, never silently skip it.
      const definition=local[word]||entry?.[0]||'단어 뜻 미등록 — 보강 필요';
      const pronunciation=entry?.[1]||'발음 미등록';
      result+=`<tr><td style="vertical-align:top;padding:6px;overflow-wrap:anywhere;border-top:1px solid #DBEAFE"><b>${H(item.word)}</b><br><span style="color:#64748B;font-size:0.85em">${item.positions.join(', ')}번${item.positions.length>1?' · 반복':''}</span></td><td style="vertical-align:top;padding:6px;overflow-wrap:anywhere;border-top:1px solid #DBEAFE">${H(definition)}<br><span style="color:#64748B">발음: ${H(pronunciation)}</span></td></tr>`;
    }
    return result+'</tbody></table>';
  }
  function supplement(q){
    if(!eligible(q)||!global.MDEnglishWordStudyData)return '';
    const local=global.MDEnglishWordStudyData.local[key(q)]||{};
    let html='━━ 단어별 기본 뜻·형태 ━━<p>지문과 네 보기의 영어 단어를 원문 순서로 확인합니다. 같은 철자가 반복되면 한 행에 위치를 모두 표시합니다. 여러 뜻이 있는 단어의 이 문장 해석과 구·절의 연결은 위의 지문 독해·보기 해석을 함께 보십시오.</p>';
    html+=wordSection('지문',q['문제'],local);
    (q['선택지']||[]).forEach((choice,i)=>{html+=wordSection(`보기 ${MARKS[i]||i+1}`,choice,local);});
    return html;
  }
  function isWatchQuestion(q){
    const stem=text(q['문제']).toLowerCase();
    const options=(q['선택지']||[]).map(x=>text(x).toLowerCase());
    return /officer in charge of the watch/.test(stem)&&/wrong/.test(stem)&&options.length===4&&
      options[0].startsWith('notify the master')&&options[1].startsWith('keep his watch')&&
      options[2].startsWith('hand over the watch')&&options[3].startsWith('continue to be responsible');
  }
  const chunk=(en,ko,structure)=>`<p><span style="color:#0EA5E9;font-weight:bold">${H(en)}</span><br>→ ${H(ko)}<br><span style="color:#64748B">${H(structure)}</span></p>`;
  function watchDetail(){
    let html='━━ 지문 독해 ━━';
    html+=chunk('Choose the wrong one.','틀린 것을 하나 고르시오.','Choose: 주어 you가 생략된 명령문 동사 / the wrong one: 목적어. one은 보기 하나를 대신하는 대명사이며 wrong이 수식합니다.');
    html+=chunk('The officer / in charge of the watch / shall:','당직을 담당하는 항해사는 다음과 같이 해야 한다.','주어(S): The officer in charge of the watch / 조동사: shall / 각 보기 첫 동사 Notify·Keep·Hand·Continue가 shall 뒤의 동사원형(V)입니다. in charge of the watch가 officer를 뒤에서 수식합니다.');
    html+='━━ 보기 해석 ━━';
    html+='<p><b>㉮ 안전을 위한 조치에 의문이 있으면 선장에게 통보 — 옳음</b></p>';
    html+=chunk('Notify the master / when in any doubt / as to what action to take / in the interest of safety.','안전을 위해 어떤 조치를 취해야 할지 조금이라도 의문이 생기면 선장에게 통보해야 한다.','Notify: 통보하다 / the master: 통보받는 대상(선장). when in any doubt는 when (he is) in any doubt의 주어·be동사 생략. any는 의문의 범위가 조금이라도 있음을 강조합니다.');
    html+=chunk('as to / what action to take / in the interest of safety','~에 관하여 / 어떤 조치를 취할지 / 안전을 위하여','as to는 두 단어가 함께 전치사처럼 기능합니다. what은 action을 꾸미는 의문한정사. what action to take는 의문사구+to부정사(무슨 조치를 취할지). take action은 조치를 취하다. in the interest of는 ~을 위하여라는 관용구이며 safety가 그 목적입니다.');
    html+='<p><b>㉯ 적절한 교대 전 선교 이탈 금지 — 옳음</b></p>';
    html+=chunk('Keep his watch on the bridge / which he shall in no circumstances leave / until properly relieved.','적절하게 교대받을 때까지 어떠한 경우에도 선교를 떠나지 않고 선교에서 당직을 유지해야 한다.','Keep: 유지하다 / his watch: 목적어(자신의 당직) / on the bridge: 장소. which는 bridge를 받는 목적격 관계대명사: he shall leave the bridge에서 목적어 자리를 대신합니다. leave의 목적어가 관계대명사로 앞에 나온 구조입니다.');
    html+=chunk('in no circumstances / until properly relieved','어떠한 상황에서도 ~않다 / 적절히 교대받을 때까지','no가 circumstances를 부정하므로 shall ... leave 전체가 금지 의미입니다. until properly relieved는 until (he is) properly relieved의 생략. relieved는 수동 의미의 과거분사, properly는 relieved를 수식하는 부사입니다.');
    html+='<p><b>㉰ 직무 수행 능력이 없는 교대자에게 인계 — 틀림, 정답</b></p>';
    html+=chunk('Hand over the watch / to the relieving officer / if he has reason to believe','당직을 교대 항해사에게 인계해야 한다 / 그가 다음과 같이 판단할 이유가 있다면','Hand over는 인계하다라는 구동사. the watch가 목적어, to는 인계받는 사람을 연결합니다. relieving은 officer를 꾸미는 현재분사로 새로 당직을 맡을 사람을 뜻합니다. if는 조건절, he는 현재 당직 항해사. has는 본동사(가지고 있다), reason은 목적어, to believe는 reason을 설명하는 to부정사입니다.');
    html+=chunk('that the latter / is obviously not capable / of carrying out his duties effectively.','후자, 즉 교대 항해사가 자기 임무를 효과적으로 수행할 능력이 명백히 없다고','that은 believe의 내용을 이끄는 명사절 접속사. the latter는 후자(교대 항해사). is+capable은 주어의 상태를 설명하며 not이 능력 있음을 부정합니다. obviously는 명백히. capable of에서 of 뒤에는 동명사 carrying이 옵니다. carry out은 수행하다, his duties는 수행할 임무, effectively는 수행 방식을 설명하는 부사입니다. 여기의 his는 교대 항해사를 가리킵니다.');
    html+='<p><b>㉱ 선장이 명시적으로 인수하고 서로 확인할 때까지 책임 유지 — 옳음</b></p>';
    html+=chunk('Continue to be responsible / for the safe navigation of the ship','그 선박의 안전한 항해에 계속 책임을 져야 한다','Continue+to부정사(to be): 계속 ~하다. be responsible for는 ~에 책임이 있다. safe는 navigation을 꾸미고 of the ship은 어느 선박의 항해인지 연결합니다.');
    html+=chunk('despite the presence of the master on the bridge','선장이 선교에 있더라도','despite는 전치사이므로 뒤에 명사구가 옵니다. presence는 존재·참석, of the master는 선장의 존재임을 표시하며 on the bridge는 장소입니다. 선장이 선교에 있다는 사실만으로 당직 항해사의 책임이 자동 종료되지는 않습니다.');
    html+=chunk('until the master informs him specifically / that he has assumed that responsibility','선장이 자신이 그 책임을 인수했다고 당직 항해사에게 명시적으로 알릴 때까지','until은 시점의 끝을 나타내는 접속사. 주어 the master / 동사 informs / 목적어 him(당직 항해사) / specifically(명시적으로). 첫 that은 통보 내용을 이끄는 접속사. he는 선장, has assumed는 현재완료(인수를 완료한 상태), 두 번째 that은 responsibility를 꾸미는 지시한정사(그 책임)입니다.');
    html+=chunk('and this is mutually understood.','그리고 그 사실을 서로 이해하고 확인할 때까지','and가 인수 통보와 상호 이해의 조건을 연결합니다. this는 선장의 책임 인수 사실. is understood는 be+과거분사의 수동태, mutually는 상호 간에라는 부사입니다. 선장의 통보와 양측의 이해가 함께 필요합니다.');
    html+='━━ 왜 정답인가? ━━<p>직무를 제대로 수행할 능력이 없다고 판단할 이유가 있는 교대자에게는 당직을 인계하지 않고 선장에게 보고해야 합니다. ㉰는 인계를 해야 한다는 내용이므로 반대입니다. 정답은 <b>㉰</b>입니다.</p>';
    html+='<p>당직 원칙을 확인할 현행 STCW Code 항목은 <b>A‑VIII/2</b>입니다. A‑VIII/1은 직무 적합성·휴식 등에 관한 항목입니다. 이 문제와 유사한 구판 협약의 항해당직 문구에는 <b>obviously가 실제로 포함되어 있습니다.</b> 현행 항해당직 조항의 표현과 구판 문구를 구별해야 하므로, obviously 자체를 오답 이유로 삼지 않습니다.</p>';
    html+='━━ 핵심 암기 ━━<p>능력 없는 교대자 → 인계 금지 + 선장 보고.<br>relieving officer: 교대하러 온 항해사 / relieved officer: 교대를 받은 항해사.<br>선장의 단순 선교 방문 ≠ 책임의 자동 이전.<br>책임 인수의 명시적 통보 + 상호 이해를 확인합니다.</p>';
    return html;
  }
  function augment(q,explanation){
    if(!eligible(q)||!global.MDEnglishWordStudyData||explanation?.loading)return explanation;
    const extra=supplement(q);
    if(!extra)return explanation;
    let html=isWatchQuestion(q)?watchDetail():explanation?.html;
    if(!html){
      if(explanation && explanation['해설']){
        html=H(explanation['해설']).replace(/\n/g,'<br>');
        const terms=Object.entries(explanation['용어']||{});
        if(terms.length)html+='<br>━━ 용어 ━━'+terms.map(([w,d])=>`<p><b>${H(w)}</b>: ${H(d)}</p>`).join('');
        const points=explanation['키포인트']||[];
        if(points.length)html+='<br>━━ 키포인트 ━━'+points.map(p=>`<p>${H(p)}</p>`).join('');
      }
      else html='<p>이 문항의 문장별 해설은 보강이 필요합니다. 아래는 원문 전체의 단어별 기본 뜻입니다.</p>';
    }
    return {...(explanation||{}),html:html+'<br>'+extra};
  }
  global.MDEnglishWordStudy={augment,tokens,supplement,isWatchQuestion};
})(window);
