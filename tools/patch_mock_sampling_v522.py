"""Apply the v5.22 mock-selection fixes after the legacy rebuild patches.

The function API also permits applying this patch to an isolated copy for tests.
"""
from pathlib import Path
import argparse
import re


def patch(text):
    def replace_function(name, following, replacement):
        nonlocal text
        start = text.index(f"  function {name}(")
        end = text.index(following, start)
        text = text[:start] + replacement + "\n" + text[end:]

    replace_function("ppPredictiveWeight", "  function ppWeightedChoice", """  function ppPredictiveWeight(item,history,progress){ // rolling-latest-year-weights-v522
    const hits=item.hits||[],years=new Set(hits.map(h=>Number(h.year)));
    const latestYear=Number(item.maxYear)||new Date().getFullYear();
    const count=hits.length;
    let weight=1+Math.min(5,count)*0.72;
    if(count>=2)weight+=0.8;
    if(count>=3)weight+=0.55;
    if(count>=4)weight+=0.35;
    if(years.has(latestYear))weight+=0.9;
    if(years.has(latestYear-1))weight+=0.6;
    if(years.has(latestYear-2))weight+=0.3;
    if(years.has(latestYear)&&hits.some(h=>Number(h.year)<latestYear))weight+=1.25;
    const recentLevel=ppPredictiveRecentLevel(item,history);
    if(recentLevel===0)weight*=0.45;
    else if(recentLevel===1)weight*=0.75;
    weight*=ppPredictivePersonalMultiplier(item,progress);
    return Math.max(0.12,weight);
  }
""")
    replace_function("ppPredictiveHistoryFingerprint", "  function ppNormalizePredictiveFingerprintHistory", """  function ppPredictiveHistoryFingerprint(item){
    return window.__mdBalancedMock.fingerprint(item);
  }
""")
    replace_function("ppPredictiveQuestionFingerprint", "  function ppUniquePredictiveCandidates", """  function ppPredictiveQuestionFingerprint(item){ // predictive-content-identity-v522
    return window.__mdBalancedMock.fingerprint(item);
  }
""")
    replace_function("ppPredictiveSample", "  window.startNavigatorPredictiveMock", """  function ppPredictiveSample(items,data,count,history,progress){ // predictive-mass-sampling-v522
    return window.__mdBalancedMock.predictiveSample(items,{
      count,weight:item=>ppPredictiveWeight(item,history,progress)
    });
  }
""")
    replace_function("ppEvaluationSelect", "  window.startNavigatorEvaluationMock", """  function ppEvaluationSelect(items,options){ // evaluation-exposure-rotation-v522
    return window.__mdBalancedMock.evaluationSelect(items,options);
  }
""")
    text = text.replace("return `${item.subject}|group:${item.groupId}`;", "return `${item.subject}|종합`;")
    text = text.replace("const identity=item=>PP_HOMEWORK_DUPLICATE_CLUSTER[item.key]||item.key;",
                        "const identity=item=>window.__mdBalancedMock.identity(item);")
    text = text.replace("engine.normalize(raw)", "engine.rebaseExposure(raw,gradeId,planPools[gradeId]||[])")
    text = text.replace("pastYear=2026;pastSession=0;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock'",
                        "pastYear=null;pastSession=null;pastVariant='상선';pastAllYears=false;pastReturnView='pass-plan-predictive-mock'")
    return text


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="index.html")
    parser.add_argument("--output")
    args = parser.parse_args()
    path = Path(args.input)
    output = Path(args.output) if args.output else path
    output.write_text(patch(path.read_text(encoding="utf-8-sig")), encoding="utf-8")
    print("mock question-mass sampling, evaluation rotation and content identity v5.22 applied")
