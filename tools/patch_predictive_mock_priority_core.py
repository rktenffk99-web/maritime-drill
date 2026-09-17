from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='predictive-priority-core-v1'

if MARKER not in text:
    anchor="""  function ppPredictiveSample(items,data,count,history,progress){"""
    helper="""  const PREDICTIVE_CORE_SHARE=0.40; // predictive-priority-core-v1
  const PREDICTIVE_TOP_POOL_SHARE=0.30;
  function ppPredictivePrioritySample(items,data,count,history,progress){
    const unique=typeof ppUniquePredictiveCandidates==='function'?ppUniquePredictiveCandidates(items||[]):[...(items||[])];
    const target=Math.min(Math.max(0,Number(count)||0),unique.length);
    if(!target)return [];
    const ranked=unique.slice().sort((a,b)=>ppPredictiveWeight(b,history,progress)-ppPredictiveWeight(a,history,progress));
    const coreCount=Math.min(target,Math.max(1,Math.round(target*PREDICTIVE_CORE_SHARE)));
    const topPoolSize=Math.min(ranked.length,Math.max(coreCount,Math.ceil(ranked.length*PREDICTIVE_TOP_POOL_SHARE)));
    const topPool=ranked.slice(0,topPoolSize);
    const core=ppPredictiveSample(topPool,data,coreCount,history,progress);
    const coreFp=new Set(core.map(item=>ppPredictiveQuestionFingerprint(item)||`key:${item&&item.key||''}`));
    const remainder=ranked.filter(item=>!coreFp.has(ppPredictiveQuestionFingerprint(item)||`key:${item&&item.key||''}`));
    const rest=ppPredictiveSample(remainder,data,target-core.length,history,progress);
    return [...core,...rest];
  }
"""+anchor
    if anchor not in text:
        raise SystemExit('predictive sampler anchor not found')
    text=text.replace(anchor,helper,1)

old="""        const draw=ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress);"""
new="""        const draw=ppPredictivePrioritySample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress);"""
if old in text:
    text=text.replace(old,new,1)
elif 'ppPredictivePrioritySample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress)' not in text:
    raise SystemExit('predictive draw anchor not found')

text=text.replace(
    '최근 5개년 출제경향 중심 · 개인 취약도 보조 · 급수별 최근 완료 모의 중복 억제',
    '핵심 중요도 상위군 40% 우선 · 나머지는 출제빈도·최근성·개인 취약도 가중 랜덤 · 동일 문항 중복 금지'
)

for needle in [MARKER,'PREDICTIVE_CORE_SHARE=0.40','PREDICTIVE_TOP_POOL_SHARE=0.30','function ppPredictivePrioritySample','const coreCount=','const topPoolSize=','const core=ppPredictiveSample','const rest=ppPredictiveSample']:
    if needle not in text:
        raise SystemExit(f'missing priority-core marker: {needle}')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock with guaranteed high-priority core')
else:
    print('predictive priority core already patched')
