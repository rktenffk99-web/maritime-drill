from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

# Persist priority settings in the pass-plan model.
if "priorityMode:'auto'" not in text:
    anchor="      finalDays:4,\n      revision:0,"
    replacement="      finalDays:4,\n      priorityMode:'auto',\n      priorityNavi3Pct:80,\n      revision:0,"
    if anchor not in text:
        raise SystemExit('default plan anchor not found')
    text=text.replace(anchor,replacement,1)

if 'base.priorityMode=' not in text:
    anchor="      base.finalDays=Math.max(2,Math.min(7,Number(saved.finalDays)||4));\n      base.revision=Number(saved.revision)||0;"
    replacement="""      base.finalDays=Math.max(2,Math.min(7,Number(saved.finalDays)||4));
      const priorityModes=new Set(['auto','navi3','navi2','custom']);
      base.priorityMode=priorityModes.has(String(saved.priorityMode||''))?String(saved.priorityMode):'auto';
      const savedNavi3Pct=Number(saved.priorityNavi3Pct);
      base.priorityNavi3Pct=Math.max(0,Math.min(100,Number.isFinite(savedNavi3Pct)?savedNavi3Pct:80));
      base.revision=Number(saved.revision)||0;"""
    if anchor not in text:
        raise SystemExit('load plan anchor not found')
    text=text.replace(anchor,replacement,1)

# Helpers are intentionally separate from the assignment builder because
# patch_rotation_mix.py rewrites that builder on every workflow run.
if 'function ppPriorityProfile(plan,today)' not in text:
    anchor='  function ppBuildTodayAssignment(plan,pools,progress,today){'
    i=text.find(anchor)
    if i<0:
        raise SystemExit('assignment builder anchor not found')
    helpers="""  function ppPriorityProfile(plan,today){ // grade-priority-v1
    const mode=['auto','navi3','navi2','custom'].includes(String(plan&&plan.priorityMode||''))?String(plan.priorityMode):'auto';
    if(mode==='navi3')return {mode,navi2:20,navi3:80,label:'3급 우선 · 여유 슬롯 20:80'};
    if(mode==='navi2')return {mode,navi2:80,navi3:20,label:'2급 우선 · 여유 슬롯 80:20'};
    if(mode==='custom'){
      const raw=Number(plan&&plan.priorityNavi3Pct),navi3=Math.max(0,Math.min(100,Number.isFinite(raw)?raw:80));
      return {mode,navi2:100-navi3,navi3,label:`직접 설정 · 2급 ${100-navi3}% / 3급 ${navi3}%`};
    }
    return {mode:'auto',navi2:50,navi3:50,label:'자동 추천 · 시험일 역산'};
  }
  function ppPriorityFlexQuotas(plan,today,slots){
    const total=Math.max(0,Number(slots)||0),profile=ppPriorityProfile(plan,today);
    if(!total)return {navi2:0,navi3:0};
    const weights={navi2:0,navi3:0};
    PLAN_GRADES.forEach(g=>{if(plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate)weights[g]=Math.max(0,Number(profile[g])||0)});
    const weightSum=weights.navi2+weights.navi3;
    if(weightSum<=0)return {navi2:0,navi3:0};
    let n2=Math.floor(total*weights.navi2/weightSum),n3=Math.floor(total*weights.navi3/weightSum);
    let rest=total-n2-n3;
    const order=weights.navi3>=weights.navi2?['navi3','navi2']:['navi2','navi3'];
    const out={navi2:n2,navi3:n3};
    for(let i=0;rest>0;i++,rest--)out[order[i%order.length]]++;
    return out;
  }

"""
    text=text[:i]+helpers+text[i:]

# Replace the final assignment builder. Mandatory unseen coverage remains the
# first constraint. Manual priority only distributes the flexible slots left
# after those mandatory new-question slots have been reserved.
build_fn="""  function ppBuildTodayAssignment(plan,pools,progress,today){ // deadline-coverage-priority-v1
    const cap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
    const priority=ppPriorityProfile(plan,today);
    const allItems=PLAN_GRADES.flatMap(g=>(plan.grades[g].enabled&&plan.grades[g].examDate)?(pools[g]||[]):[]);
    const phases={},requests={navi2:0,navi3:0};

    // 시험일까지 모든 문제 그룹을 최소 1회 보도록 오늘의 '필수 신규' 수를 역산한다.
    // dday=0인 시험일도 학습 가능일로 포함하므로 남은 학습일은 dday+1이다.
    PLAN_GRADES.forEach(g=>{
      if(!plan.grades[g].enabled||!plan.grades[g].examDate){phases[g]=null;return}
      const phase=ppPhaseForGrade(plan,g,pools[g]||[],progress,today);phases[g]=phase;
      const remaining=phase.allRemaining||[];
      const daysLeft=phase.dday===null?Math.max(1,phase.learningDays||1):Math.max(1,phase.dday+1);
      requests[g]=remaining.length?Math.ceil(remaining.length/daysLeft):0;
    });

    const due=allItems.filter(item=>ppIsDue(ppProgressFor(progress,item.key),today)).sort((a,b)=>ppUrgentSort(a,b,progress));
    const requestedNew=PLAN_GRADES.reduce((sum,g)=>sum+(requests[g]||0),0);
    const requiredNew=Math.min(cap,requestedNew);

    // 필수 신규 슬롯은 복습이나 수동 우선순위가 침범하지 않는다.
    // 일정 자체가 불가능(requestedNew > cap)할 때만 선택한 급수 우선도를 희소 슬롯 배분에 반영한다.
    let quotaRequests={...requests};
    if(requestedNew>cap&&priority.mode!=='auto'){
      quotaRequests={navi2:(requests.navi2||0)*(1+(priority.navi2||0)/100),navi3:(requests.navi3||0)*(1+(priority.navi3||0)/100)};
    }
    const quotas=ppAllocateNewSlots(quotaRequests,requiredNew);
    const newItems=[];

    PLAN_GRADES.forEach(g=>{
      const phase=phases[g];if(!phase||!quotas[g])return;
      const preferred=new Set((phase.candidates||[]).map(item=>item.key));
      const candidates=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate);
      candidates.sort((a,b)=>(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
      newItems.push(...candidates.slice(0,quotas[g]));
    });

    const selectedKeys=new Set(newItems.map(item=>item.key));
    const dueSelected=[];
    let fill=Math.max(0,cap-newItems.length);
    const flexUsed={navi2:0,navi3:0};

    if(priority.mode==='auto'){
      // 기존 자동 추천: 가장 급한 복습을 먼저 채운 뒤 여유가 있으면 미학습을 앞당긴다.
      for(const item of due){
        if(fill<=0)break;
        if(selectedKeys.has(item.key))continue;
        dueSelected.push(item);selectedKeys.add(item.key);fill--;flexUsed[item.gradeId]++;
      }
    }else if(fill>0){
      // 수동 우선: 필수 신규를 제외한 여유 슬롯만 선택 비율대로 나눈다.
      const flexQuotas=ppPriorityFlexQuotas(plan,today,fill);
      PLAN_GRADES.forEach(g=>{
        if(!flexQuotas[g])return;
        for(const item of due){
          if(flexUsed[g]>=flexQuotas[g])break;
          if(item.gradeId!==g||selectedKeys.has(item.key))continue;
          dueSelected.push(item);selectedKeys.add(item.key);flexUsed[g]++;fill--;
        }
      });
    }

    // 각 급수에 남은 여유 쿼터는 그 급수의 미학습 문제를 앞당겨 채운다.
    if(fill>0&&priority.mode!=='auto'){
      const flexQuotas=ppPriorityFlexQuotas(plan,today,cap-newItems.length);
      PLAN_GRADES.forEach(g=>{
        let gradeFill=Math.max(0,(flexQuotas[g]||0)-(flexUsed[g]||0));
        const phase=phases[g];if(!phase||!gradeFill)return;
        const preferred=new Set((phase.candidates||[]).map(item=>item.key));
        const extra=(phase.allRemaining||[]).filter(item=>!ppProgressFor(progress,item.key).firstPassDate&&!selectedKeys.has(item.key));
        extra.sort((a,b)=>(preferred.has(b.key)?1:0)-(preferred.has(a.key)?1:0)||(pp2026NeedsPriority(b,progress)?1:0)-(pp2026NeedsPriority(a,progress)?1:0)||b.count-a.count||b.latest-a.latest);
        for(const item of extra){
          if(fill<=0||gradeFill<=0)break;
          newItems.push(item);selectedKeys.add(item.key);fill--;gradeFill--;flexUsed[g]++;
        }
      });
    }

    // 한 급수가 소진되어 쿼터를 못 채우면 다른 급수의 기한도래 복습에 재배분한다.
    if(fill>0){
      for(const item of due){
        if(fill<=0)break;
        if(selectedKeys.has(item.key))continue;
        dueSelected.push(item);selectedKeys.add(item.key);fill--;flexUsed[item.gradeId]++;
      }
    }

    // 복습할 문제가 부족한 날에는 미학습 문제를 앞당겨 1회독을 더 빨리 진행한다.
    if(fill>0){
      const extra=[];
      PLAN_GRADES.forEach(g=>{
        const phase=phases[g];if(!phase)return;
        const preferred=new Set((phase.candidates||[]).map(item=>item.key));
        (phase.allRemaining||[]).forEach(item=>{
          if(ppProgressFor(progress,item.key).firstPassDate||selectedKeys.has(item.key))return;
          extra.push({item,preferred:preferred.has(item.key),priority:Number(priority[g])||0});
        });
      });
      extra.sort((a,b)=>(priority.mode==='auto'?0:b.priority-a.priority)||(b.preferred?1:0)-(a.preferred?1:0)||(pp2026NeedsPriority(b.item,progress)?1:0)-(pp2026NeedsPriority(a.item,progress)?1:0)||b.item.count-a.item.count||b.item.latest-a.item.latest);
      for(const row of extra){
        if(fill<=0)break;
        if(selectedKeys.has(row.item.key))continue;
        newItems.push(row.item);selectedKeys.add(row.item.key);fill--;
      }
    }

    // 복습과 신규를 세션 전체에 골고루 섞는다.
    const ordered=[];let ri=0,ni=0;
    while(ri<dueSelected.length||ni<newItems.length){
      if(ri>=dueSelected.length){ordered.push(newItems[ni++]);continue}
      if(ni>=newItems.length){ordered.push(dueSelected[ri++]);continue}
      const reviewProgress=ri/Math.max(1,dueSelected.length),newProgress=ni/Math.max(1,newItems.length);
      if(reviewProgress<=newProgress)ordered.push(dueSelected[ri++]);
      else ordered.push(newItems[ni++]);
    }

    return {keys:ordered.map(i=>i.key),createdAt:Date.now(),phases,requests,requiredNew,dueOverflow:Math.max(0,due.length-dueSelected.length),dueCount:dueSelected.length,newCount:newItems.length,newShortfall:Math.max(0,requiredNew-newItems.length),coverageAtRisk:requestedNew>cap,priorityMode:priority.mode,priorityLabel:priority.label,priorityProfile:{navi2:priority.navi2,navi3:priority.navi3},rotationPolicy:'deadline-coverage-priority-v1'};
  }"""
pattern=r"  function ppBuildTodayAssignment\(plan,pools,progress,today\)\{.*?\n  \}(?=\n  function ppGetItemByKey)"
text,n=re.subn(pattern,build_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppBuildTodayAssignment not found')

# New policy id forces today's cached queue to rebuild once after deployment.
text,n=re.subn(r"assignmentPolicy:'[^']+'","assignmentPolicy:'deadline-coverage-priority-v1'",text,count=1)
if n!=1:
    raise SystemExit('assignmentPolicy not found')

# Priority selector UI in the existing exam settings card.
if 'id="pp-priority-settings"' not in text:
    anchor='''        <button class="btn btn-accent" style="width:100%;margin-top:12px;background:#7C3AED;border-color:#7C3AED" onclick="saveNavigatorPassPlanSettings()">설정 저장 · 오늘 숙제 재계산</button>'''
    block='''        <div id="pp-priority-settings" style="margin-top:14px;padding:12px;background:#F8FAFC;border-radius:10px">
          <div style="font-size:13px;font-weight:900;margin-bottom:8px">학습 우선순위</div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            ${[['auto','자동 추천'],['navi3','3급 우선'],['navi2','2급 우선'],['custom','직접 설정']].map(([value,label])=>`<label style="display:flex;align-items:center;gap:5px;padding:8px 10px;border:1px solid #CBD5E1;border-radius:9px;background:#fff;font-size:12px;font-weight:800;cursor:pointer"><input type="radio" name="pp-priority-mode" value="${value}" ${plan.priorityMode===value?'checked':''} onchange="toggleNavigatorPassPlanPriorityCustom()">${label}</label>`).join('')}
          </div>
          <div id="pp-priority-custom" style="display:${plan.priorityMode==='custom'?'block':'none'};margin-top:9px;padding-top:9px;border-top:1px solid #E2E8F0;font-size:12px;font-weight:700">3급 비중 <input id="pp-priority-navi3-pct" type="number" min="0" max="100" step="5" value="${plan.priorityNavi3Pct}" style="width:64px;padding:7px;border:1px solid #CBD5E1;border-radius:8px"> % <span style="font-size:10px;color:var(--textDim);font-weight:600">· 2급은 나머지 비율</span></div>
          <div style="font-size:10px;color:var(--textDim);line-height:1.55;margin-top:8px">시험일까지 필요한 신규 문제는 먼저 확보합니다. 선택한 우선순위는 그 뒤 남는 복습·추가 학습 슬롯에 적용됩니다.</div>
        </div>
'''+anchor
    if anchor not in text:
        raise SystemExit('settings save button anchor not found')
    text=text.replace(anchor,block,1)

# Show the active allocation rule in today's assignment card.
if '배분 기준: ${escapeHtml(assignment.priorityLabel' not in text:
    anchor='''        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px"><div style="background:#EFF6FF;padding:11px;border-radius:9px"><b>2급 ${gradeCounts.navi2.total}</b><div style="font-size:10px;color:#475569">신규 ${gradeCounts.navi2.new} · 복습 ${gradeCounts.navi2.review}</div></div><div style="background:#ECFDF5;padding:11px;border-radius:9px"><b>3급 ${gradeCounts.navi3.total}</b><div style="font-size:10px;color:#475569">신규 ${gradeCounts.navi3.new} · 복습 ${gradeCounts.navi3.review}</div></div></div>'''
    replacement=anchor+'''\n        <div style="font-size:10px;color:var(--textDim);margin-top:7px">배분 기준: ${escapeHtml(assignment.priorityLabel||'자동 추천 · 시험일 역산')} · 필수 신규량 우선</div>'''
    if anchor not in text:
        raise SystemExit('today grade-count anchor not found')
    text=text.replace(anchor,replacement,1)

# Toggle custom percentage control without a page reload.
if 'window.toggleNavigatorPassPlanPriorityCustom=' not in text:
    anchor='  window.saveNavigatorPassPlanSettings=async function(){'
    helper="""  window.toggleNavigatorPassPlanPriorityCustom=function(){
    const picked=document.querySelector('input[name="pp-priority-mode"]:checked'),box=document.getElementById('pp-priority-custom');
    if(box)box.style.display=picked&&picked.value==='custom'?'block':'none';
  };

"""
    i=text.find(anchor)
    if i<0:
        raise SystemExit('save settings handler anchor not found')
    text=text[:i]+helper+text[i:]

# Save priority controls and explicitly invalidate today's cached assignment.
if "plan.priorityMode=['auto','navi3','navi2','custom'].includes" not in text:
    anchor="""    plan.finalDays=Math.max(2,Math.min(7,Number(finalDays&&finalDays.value)||4));
    const today=ppDateKey(new Date());"""
    replacement="""    plan.finalDays=Math.max(2,Math.min(7,Number(finalDays&&finalDays.value)||4));
    const priorityModeEl=document.querySelector('input[name="pp-priority-mode"]:checked');
    const priorityMode=priorityModeEl?priorityModeEl.value:'auto';
    plan.priorityMode=['auto','navi3','navi2','custom'].includes(priorityMode)?priorityMode:'auto';
    const priorityPctEl=document.getElementById('pp-priority-navi3-pct'),priorityPct=Number(priorityPctEl&&priorityPctEl.value);
    plan.priorityNavi3Pct=Math.max(0,Math.min(100,Number.isFinite(priorityPct)?priorityPct:80));
    const today=ppDateKey(new Date());"""
    if anchor not in text:
        raise SystemExit('save settings numeric anchor not found')
    text=text.replace(anchor,replacement,1)

    anchor="""    ppSavePlan(plan);showToast('합격 플랜 설정을 저장했습니다.');renderNavigatorPassPlan(planEntrySubject);"""
    replacement="""    ppSavePlan(plan);const daily=ppLoadDaily();delete daily[today];ppSaveDaily(daily);showToast('합격 플랜 설정을 저장했습니다.');renderNavigatorPassPlan(planEntrySubject);"""
    if anchor not in text:
        raise SystemExit('save settings final anchor not found')
    text=text.replace(anchor,replacement,1)

if 'grade-priority-v1' not in text or "assignmentPolicy:'deadline-coverage-priority-v1'" not in text:
    raise SystemExit('grade priority patch marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched grade priority controls + weighted flexible allocation')
else:
    print('grade priority already patched')
