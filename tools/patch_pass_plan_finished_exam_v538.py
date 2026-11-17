"""2·3급 합격 플랜: 시험일이 지난 급수를 '시험 종료'로 다룬다 (v5.38).

- 이미 지난 시험일을 그대로 두면 다른 설정(하루 상한 등)도 저장할 수 있다.
  새로 입력하거나 바꾼 시험일이 과거이면 지금처럼 막는다.
- 시험이 끝난 급수의 문제는 '오늘 오답 다시 풀기'·'자주 틀리는 문제'에서 뺀다.
- 시험 당일·종료 급수에는 '첫 통과 일정 부족' 경고를 띄우지 않는다.
- 종료된 급수 카드에 다음 시험일 입력 또는 체크 해제를 안내한다.

재실행해도 결과가 같다.
"""
from pathlib import Path
import argparse
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'pass-plan-finished-exam-v538'

REPLACEMENTS = [
    (
        "  function ppActivePlanItems(plan){\n"
        "    return PLAN_GRADES.flatMap(g=>(plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate)?(planPools[g]||[]):[]);\n"
        "  }\n",
        "  function ppGradeFinished(plan,gradeId,today){ // pass-plan-finished-exam-v538\n"
        "    const cfg=plan&&plan.grades&&plan.grades[gradeId],dday=cfg&&cfg.examDate?ppDiffDays(today||ppDateKey(new Date()),cfg.examDate):null;\n"
        "    return !!(cfg&&cfg.enabled&&dday!==null&&dday<0);\n"
        "  }\n"
        "  function ppActivePlanItems(plan){\n"
        "    const today=ppDateKey(new Date());\n"
        "    return PLAN_GRADES.flatMap(g=>(plan.grades[g]&&plan.grades[g].enabled&&plan.grades[g].examDate&&!ppGradeFinished(plan,g,today))?(planPools[g]||[]):[]);\n"
        "  }\n",
    ),
    (
        "  window.saveNavigatorPassPlanSettings=async function(){\n"
        "    const plan=ppLoadPlan();\n",
        "  window.saveNavigatorPassPlanSettings=async function(){\n"
        "    const plan=ppLoadPlan(),savedExamDates=Object.fromEntries(PLAN_GRADES.map(g=>[g,plan.grades[g].examDate])); // pass-plan-finished-exam-v538\n",
    ),
    (
        "    const invalid=PLAN_GRADES.filter(g=>plan.grades[g].enabled&&(!plan.grades[g].examDate||ppDiffDays(today,plan.grades[g].examDate)<0));\n"
        "    if(invalid.length){showToast('활성화한 급수의 시험일을 오늘 이후 날짜로 설정하세요.');return}\n",
        "    // An exam that already took place may stay as it was; a newly entered past date is still rejected.\n"
        "    const invalid=PLAN_GRADES.filter(g=>plan.grades[g].enabled&&(!plan.grades[g].examDate||(ppDiffDays(today,plan.grades[g].examDate)<0&&plan.grades[g].examDate!==savedExamDates[g])));\n"
        "    if(invalid.length){showToast(invalid.some(g=>!plan.grades[g].examDate)?'활성화한 급수의 시험일을 입력하세요.':'새로 입력한 시험일이 이미 지났습니다. 오늘 이후 날짜로 설정하세요.');return}\n",
    ),
    (
        "${Object.entries(assignment.coverageByGrade||{}).filter(([,x])=>x.remainingFirstPass>0).map(",
        "${Object.entries(assignment.coverageByGrade||{}).filter(([,x])=>x.remainingFirstPass>0&&x.studyDays>0).map(",
    ),
    (
        "<span class=\"tag\" style=\"margin:0;background:${st.phase.phase==='final'?'#FEE2E2':'#E0F2FE'};color:${st.phase.phase==='final'?'#B91C1C':'#075985'}\">${escapeHtml(st.phase.label)}</span></div>\n",
        "${ppGradeFinished(plan,g,today)?'<span class=\"tag\" style=\"margin:0;background:#F1F5F9;color:#475569\">시험 종료</span>':`<span class=\"tag\" style=\"margin:0;background:${st.phase.phase==='final'?'#FEE2E2':'#E0F2FE'};color:${st.phase.phase==='final'?'#B91C1C':'#075985'}\">${escapeHtml(st.phase.label)}</span>`}</div>\n"
        "        ${ppGradeFinished(plan,g,today)?'<div data-pass-plan-finished style=\"font-size:11px;color:#475569;line-height:1.55;margin-top:8px;padding:8px 10px;background:#F8FAFC;border-radius:8px\">시험일이 지나 오늘 숙제와 취약문제 목록에서 빠졌습니다. 다음 시험일을 입력하거나 체크를 해제하세요.</div>':''}\n",
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
        print('pass plan finished-exam handling installed')


if __name__ == '__main__':
    main()
