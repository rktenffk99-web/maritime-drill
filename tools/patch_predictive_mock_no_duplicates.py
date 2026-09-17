from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='predictive-no-duplicate-v1'

if MARKER not in text:
    anchor="""  function ppPredictiveSample(items,data,count,history,progress){"""
    helper="""  function ppPredictiveQuestionFingerprint(item){ // predictive-no-duplicate-v1
    return String(item&&item.question||'').normalize('NFKC').toLowerCase().replace(/\\s+/g,' ').trim();
  }
  function ppUniquePredictiveCandidates(items){
    const seen=new Set(),out=[];
    for(const item of (items||[])){
      const fp=ppPredictiveQuestionFingerprint(item)||`key:${item&&item.key||''}`;
      if(seen.has(fp))continue;
      seen.add(fp);out.push(item);
    }
    return out;
  }
"""+anchor
    if anchor not in text:
        raise SystemExit('predictive sample anchor not found')
    text=text.replace(anchor,helper,1)

pattern=r"""      const pool=planPools\[gradeId\]\|\|\[\],history=ppLoadPredictiveHistory\(gradeId\),progress=ppLoadProgress\(\),selected=\[\];\n      for\(const subject of subjects\)\{\n        const candidates=pool\.filter\(item=>item\.subject===subject\);\n        const draw=ppPredictiveSample\(candidates,data,Math\.min\(PAST_MOCK_PER_SUBJECT,candidates\.length\),history,progress\);\n        selected\.push\(\.\.\.draw\);\n      \}"""
replacement="""      const pool=planPools[gradeId]||[],history=ppLoadPredictiveHistory(gradeId),progress=ppLoadProgress(),selected=[],selectedFingerprints=new Set();
      for(const subject of subjects){
        const candidates=ppUniquePredictiveCandidates(pool.filter(item=>item.subject===subject)).filter(item=>!selectedFingerprints.has(ppPredictiveQuestionFingerprint(item)));
        const draw=ppPredictiveSample(candidates,data,Math.min(PAST_MOCK_PER_SUBJECT,candidates.length),history,progress);
        for(const item of draw){
          const fp=ppPredictiveQuestionFingerprint(item)||`key:${item&&item.key||''}`;
          if(selectedFingerprints.has(fp))continue;
          selectedFingerprints.add(fp);selected.push(item);
        }
      }"""
text,n=re.subn(pattern,replacement,text,count=1)
if n!=1:
    # Idempotency / already upgraded check.
    if 'selectedFingerprints=new Set()' not in text:
        raise SystemExit('predictive start selection anchor not found')

if MARKER not in text: raise SystemExit('predictive duplicate guard marker missing')
if 'ppUniquePredictiveCandidates' not in text: raise SystemExit('predictive candidate dedupe helper missing')
if 'selectedFingerprints=new Set()' not in text: raise SystemExit('predictive cross-subject dedupe guard missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched predictive mock to forbid duplicate question stems')
else:
    print('predictive mock duplicate guard already patched')
