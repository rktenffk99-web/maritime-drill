"""2·3급 합격 플랜 복습 정책 변경 (v5.39).

1. 당일 재확인 없음: 오늘 숙제에서 처음 맞힌 문제는 같은 세션에 다시 내지 않고
   다음 날 이후 한 번 확인한다. 그때 맞히면 숙달.
2. 숙달 후 간격: 7일 → 21일 두 번 확인 후, 시험 직전 모드 시작일까지 보류.
   (시험 직전 모드 기간에 다시 맞히면 시험일까지 보류)
3. 오답 처리는 그대로.
4. 처음 볼 문제는 실전예측 모의와 같은 연도별 재출제 가중치 순서로 배정
   (scheduler-v522.js가 row.reappear를 사용).

재실행해도 결과가 같다.
"""
from pathlib import Path
import argparse
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'pass-plan-review-policy-v539'

REPLACEMENTS = [
    # 1. Every first correct homework answer becomes a next-day check.
    (
        "    const minimumGap=15;\n"
        "    const remainingBase=planSessionQueue.slice(planSessionIdx+1).reduce((n,x)=>n+((x&&x._sameDayRecheck)?0:1),0);\n"
        "    if(remainingBase<minimumGap){\n",
        "    const minimumGap=15;\n"
        "    const remainingBase=planSessionQueue.slice(planSessionIdx+1).reduce((n,x)=>n+((x&&x._sameDayRecheck)?0:1),0);\n"
        "    // pass-plan-review-policy-v539: no same-session repeat; the first correct answer is checked on a later day.\n"
        "    if(!PP_SAME_DAY_RECHECK||remainingBase<minimumGap){\n",
    ),
    (
        "  // homework-recheck-persistence-v535: null means a required schedule write failed.\n",
        "  const PP_SAME_DAY_RECHECK=false; // pass-plan-review-policy-v539\n"
        "  // homework-recheck-persistence-v535: null means a required schedule write failed.\n",
    ),
    (
        "          needsSameDayConfirmation:!priorRecall&&r.sameDayFirstCorrectDate!==today});\n",
        "          needsSameDayConfirmation:PP_SAME_DAY_RECHECK&&!priorRecall&&r.sameDayFirstCorrectDate!==today,reappear:ppHomeworkReappearWeight(item)});\n",
    ),
    # 2. Mastered spacing: 7 days, 21 days, then wait for the final review window.
    (
        "        const interval=[1,5,7,14,21,30][Math.max(1,Math.min(5,Number(r.reviewStage)||1))];\n"
        "        r.dueDate=ppReviewDueDate(today,interval,exam);removeWrong=true;\n",
        "        r.dueDate=ppMasteredDueDate(today,Number(r.reviewStage)||1,exam,ppLoadPlan().finalDays);removeWrong=true;\n",
    ),
    (
        "  function ppNextDayPending(rec,today){\n",
        "  // pass-plan-review-policy-v539: after mastery check again in 7 and 21 days, then only in the final window.\n"
        "  function ppMasteredDueDate(today,stage,exam,finalDays){\n"
        "    const dday=exam?ppDiffDays(today,exam):null;\n"
        "    const bounded=days=>ppAddDays(today,dday!==null&&dday>1?Math.min(days,dday-1):(dday!==null&&dday>=0?1:days));\n"
        "    if(stage<=1)return bounded(7);\n"
        "    if(stage===2)return bounded(21);\n"
        "    if(dday===null||dday<0)return ppAddDays(today,30);\n"
        "    const finalStart=ppAddDays(exam,-Math.max(1,Number(finalDays)||4));\n"
        "    return finalStart>today?finalStart:exam;\n"
        "  }\n"
        "  function ppNextDayPending(rec,today){\n",
    ),
    # 4. Same re-appearance weight as the predictive mock (without personal/history factors).
    (
        "  function ppIsDue(rec,today){",
        "  function ppHomeworkReappearWeight(item){ // pass-plan-review-policy-v539\n"
        "    const hits=item&&Array.isArray(item.hits)?item.hits:[],years=new Set(hits.map(h=>Number(h.year)));\n"
        "    const latestYear=Number(item&&item.maxYear)||new Date().getFullYear(),count=hits.length;\n"
        "    let weight=1+Math.min(5,count)*0.72;\n"
        "    if(count>=2)weight+=0.8;if(count>=3)weight+=0.55;if(count>=4)weight+=0.35;\n"
        "    if(years.has(latestYear))weight+=0.9;if(years.has(latestYear-1))weight+=0.6;if(years.has(latestYear-2))weight+=0.3;\n"
        "    if(years.has(latestYear)&&hits.some(h=>Number(h.year)<latestYear))weight+=1.25;\n"
        "    const lastYear=Math.max(0,...hits.map(h=>Number(h.year)||0)),age=lastYear?Math.max(0,latestYear-lastYear):0;\n"
        "    return weight*[1,0.55,0.35,0.2][Math.min(3,age)];\n"
        "  }\n"
        "  function ppIsDue(rec,today){",
    ),
    # UI text.
    (
        "기본문항 ${assignment.keys.length}개 · 정답 진행 기준 자동 재확인 약 ${assignment.estimatedAutomaticRechecks||0}회 · 총 약 ${assignment.estimatedTotalAnswers||assignment.keys.length}회 풀이. 오답 재풀이는 별도입니다.",
        "기본문항 ${assignment.keys.length}개 · 처음 맞힌 문제는 같은 날 다시 내지 않고 다음 날 이후 한 번 확인합니다. 오답 재풀이는 별도입니다.",
    ),
    (
        "오늘 숙제에서 처음 맞힌 문제는 30~50문제 뒤 자동 재확인됩니다. 세션 끝부분은 최소 15문제 간격을 확보하고, 여유가 없으면 다음 날 재확인합니다.",
        "오늘 숙제에서 처음 맞힌 문제는 다음 날 이후 한 번 다시 확인합니다.",
    ),
    (
        "답을 고른 뒤 다음 문제로 이동하면 정답·오답이 기록됩니다. 당일 재확인 또는 다음 날 확인 예정으로 구분하며, 다른 날 다시 맞히면 숙달됩니다.",
        "답을 고른 뒤 다음 문제로 이동하면 정답·오답이 기록됩니다. 처음 맞힌 문제는 다음 날 이후 다시 확인하고, 그때 맞히면 숙달됩니다. 처음 보는 문제는 다시 출제될 가능성이 높은 순서로 배정합니다.",
    ),
    (
        "'첫 정답은 학습 중 · 같은 날 한 번 더 맞히면 오늘 확인 완료 · 다음 날짜에 다시 맞히면 숙달됩니다.'",
        "'첫 정답은 학습 중 · 다음 날 이후 다시 맞히면 숙달됩니다.'",
    ),
    (
        "① 첫 정답 → 학습 중, 같은 날 재확인 정답 → 오늘 확인 완료<br>② 확인 완료 후 다른 날 다시 정답 → 숙달<br>③ 숙달 문제도 최근 재확인 결과와 시험일에 따라 유지복습<br>",
        "① 첫 정답 → 학습 중 (같은 날 다시 내지 않음)<br>② 다음 날 이후 다시 정답 → 숙달<br>③ 숙달 문제는 7일 뒤, 그다음 21일 뒤 확인하고 이후에는 시험 직전 모드에서만 복습<br>",
    ),
]


def patch_html(text: str) -> str:
    for old, new in REPLACEMENTS:
        if new in text:
            continue
        if text.count(old) != 1:
            raise RuntimeError('missing or ambiguous pass-plan anchor: ' + old[:120])
        text = text.replace(old, new, 1)
    assert MARKER in text
    return text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--stdin', action='store_true')
    parser.add_argument('--stdout', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'index.html'
    text = sys.stdin.read() if args.stdin else path.read_text(encoding='utf-8-sig')
    out = patch_html(text)
    if args.stdout:
        sys.stdout.write(out)
    else:
        path.write_text(out, encoding='utf-8')
        print('pass plan review policy v5.39 installed')


if __name__ == '__main__':
    main()
