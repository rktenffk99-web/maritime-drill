from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
marker='predictive-mock-resume-isolated-v1'
if marker not in text:
    old="""  if(pastReturnView==='pass-plan-predictive-mock'){
    pastReturnView=null;
    currentMode='pass-plan';"""
    new="""  if(pastReturnView==='pass-plan-predictive-mock'){
    clearPastProgress(); // predictive-mock-resume-isolated-v1
    pastReturnView=null;
    currentMode='pass-plan';"""
    if old not in text: raise SystemExit('predictive return follow-up anchor missing')
    text=text.replace(old,new,1)

    old="""function renderPastCard(){
  if(currentMode!=='past')return;
  savePastProgress();"""
    new="""function renderPastCard(){
  if(currentMode!=='past')return;
  if(pastReturnView!=='pass-plan-predictive-mock')savePastProgress();"""
    if old not in text: raise SystemExit('predictive progress follow-up anchor missing')
    text=text.replace(old,new,1)

    old="""      ppSavePredictiveHistory(keys);
      pastSubjectId=gradeId;"""
    new="""      ppSavePredictiveHistory(keys);
      clearPastProgress();
      pastSubjectId=gradeId;"""
    if old not in text: raise SystemExit('predictive start follow-up anchor missing')
    text=text.replace(old,new,1)

    old="""        ${cfg.enabled&&cfg.examDate?`<button class=\"btn btn-accent\" style=\"width:100%;margin-top:9px;background:${g==='navi2'?'#2563EB':'#059669'};border-color:${g==='navi2'?'#2563EB':'#059669'}\" onclick=\"startNavigatorPredictiveMock('${g}')\">실전예측 모의 · 가중 랜덤</button>`:''}
        ${st.phase.phase==='final'&&cfg.enabled&&cfg.examDate?"""
    new="""        ${cfg.enabled&&cfg.examDate?`<button class=\"btn btn-accent\" style=\"width:100%;margin-top:9px;background:${g==='navi2'?'#2563EB':'#059669'};border-color:${g==='navi2'?'#2563EB':'#059669'}\" onclick=\"startNavigatorPredictiveMock('${g}')\">실전예측 모의 · 가중 랜덤</button><div style=\"font-size:10px;color:var(--textDim);line-height:1.5;margin-top:5px\">최근 5개년 빈출·최근성·2026 교차빈출 가중 · 최근 모의 중복 억제</div>`:''}
        ${st.phase.phase==='final'&&cfg.enabled&&cfg.examDate?"""
    if old not in text: raise SystemExit('predictive description follow-up anchor missing')
    text=text.replace(old,new,1)

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock resume isolation')
else:
    print('predictive mock follow-up already patched')
