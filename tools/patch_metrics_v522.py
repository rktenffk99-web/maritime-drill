from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8-sig');original=s
start=s.index('  function ppWeakTopicId(item){');end=s.index('  function ppPredictivePersonalMultiplier(',start)
old=s[start:end]
new='''  function ppWeakTopicId(item){
    const subject=String(item&&item.subject||'기타');
    const question=item&&(item.question||item['문제']||item['질문'])||'';
    return window.__mdWeakTopicClassifier.classify(subject,question,item&&(item.choices||item['선택지']));
  }
  function ppLoadWeakTopicProfile(gradeId){ // recent-homework-topic-evidence-v522
    try{return window.__mdWeakTopicAnalytics.getProfileForGrade(gradeId)}catch(e){return {}}
  }
  function ppWeakTopicBoost(item,profile){
    const grade=item&&(item.gradeId||item._planGrade||String(item.key||item._planKey||'').split('|')[0]);
    const p=profile||ppLoadWeakTopicProfile(grade),key=`${item&&item.subject||'기타'}|${ppWeakTopicId(item)}`,row=p[key];
    if(!row||!(Number(row.wrong)>0))return 1;
    if(Number.isFinite(Number(row.boostMultiplier)))return Math.max(1,Math.min(1.75,Number(row.boostMultiplier)));
    // Legacy callers without evidence metadata get only a small, bounded boost.
    const attempts=Math.max(0,Number(row.attempts)||0),wrong=Math.max(0,Number(row.wrong)||0);
    const evidence=attempts/(attempts+5),error=(wrong+1)/(attempts+2);
    return 1+Math.min(attempts<3?0.05:0.75,0.75*error*evidence);
  }
'''
s=s[:start]+new+s[end:]
if s!=original:p.write_text(s,encoding='utf-8')
print('metrics v5.22 pass-plan API integration applied')
s=p.read_text(encoding='utf-8-sig');original=s
if 'const stats=window.__mdPassPlanLearningAPI.getResultStats();' in s:
    print('metrics v5.22 result rendering already applied')
    raise SystemExit(0)
start=s.index('    const unresolved=[...new Map(planSessionQueue.filter(')
end=s.index('  window.retryNavigatorPassPlanUnresolved=',start)
replacement='''    const stats=window.__mdPassPlanLearningAPI.getResultStats();
    const pending=Number(stats.pendingNextDay)||0,unresolved=Number(stats.unresolved)||0;
    const status=unresolved?`<div class="card" style="background:#FEF3C7;border-left:4px solid #D97706"><div style="font-size:15px;font-weight:900;color:#92400E">미해결 ${unresolved}문제</div><div style="font-size:11px;color:#78350F;margin-top:5px;line-height:1.6">아직 확인하지 못한 문제입니다. 다시 풀어 확인할 수 있으며 숙달 판정에는 다른 날 재확인이 필요합니다.</div></div><button class="btn btn-accent" style="width:100%;background:#D97706;border-color:#D97706" onclick="retryNavigatorPassPlanUnresolved()">미해결만 다시 풀기 · ${unresolved}문제</button>`:pending?`<div class="card" style="background:#F5F3FF;text-align:center"><div style="font-size:18px;font-weight:900;color:#5B21B6">오늘 분량 풀이 완료</div><div style="font-size:11px;color:#6D28D9;margin-top:5px">${pending}문제는 간격을 두고 다음 날 확인합니다. 아직 재확인을 마친 것은 아닙니다.</div></div>`:`<div class="card" style="background:#D1FAE5;text-align:center"><div style="font-size:18px;font-weight:900;color:#065F46">오늘 숙제 확인 완료</div><div style="font-size:11px;color:#047857;margin-top:5px">다음 복습일에 다시 확인합니다.</div></div>`;
    app.innerHTML=`<div style="padding-top:22px;margin-bottom:14px"><div style="font-size:12px;letter-spacing:2px;font-weight:900;color:#7C3AED">TODAY RESULT</div><h1 style="font-size:24px;margin:4px 0">오늘의 숙제 결과</h1></div><div class="card" style="text-align:center;border-left:4px solid #7C3AED"><div style="font-size:40px;font-weight:900;color:#7C3AED">${stats.baseCorrect} / ${stats.baseTotal}</div><div style="font-size:14px;font-weight:800;margin-top:5px">기본 문제 첫 시도 정답</div><div style="font-size:12px;color:var(--textDim);margin-top:8px">당일 재확인 정답 ${stats.recheckCorrect} / ${stats.recheckTotal} · 다음 날 확인 예정 ${pending}문제</div><div style="font-size:11px;color:var(--textDim);margin-top:5px">${Math.floor(elapsed/60)}분 ${elapsed%60}초 · 재확인 문항은 기본 문제 수에 중복 합산하지 않습니다.</div></div>${status}<button class="btn btn-outline" style="width:100%;margin-top:10px" onclick="renderNavigatorPassPlan('${planEntrySubject}')">합격 플랜으로 돌아가기</button>`;
  };
'''
s=s[:start]+replacement+s[end:]
if s!=original:p.write_text(s,encoding='utf-8')
print('metrics v5.22 basic/recheck result rendering applied')
