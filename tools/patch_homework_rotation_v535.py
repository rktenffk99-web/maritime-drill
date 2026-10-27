"""Keep deferred homework rechecks durable before advancing or completing."""
from pathlib import Path
import argparse
import sys

MARKER = 'homework-recheck-persistence-v535'


def patch(s):
    if MARKER in s:
        return s

    def replace(old, new):
        nonlocal s
        assert s.count(old) == 1, old[:120]
        s = s.replace(old, new, 1)

    replace(
        "    const saved=ppSavePassSessionCheckpoint(planSessionIdx);renderNavigatorPassPlanCard();return saved;",
        "    const saved=ppFlushTodayAnswer();renderNavigatorPassPlanCard();return saved;",
    )
    replace(
        "  function ppScheduleSameDayRecheck(q){ // spaced-recheck-tail-v2",
        "  // homework-recheck-persistence-v535: null means a required schedule write failed.\n"
        "  function ppScheduleSameDayRecheck(q){ // spaced-recheck-tail-v2",
    )
    replace(
        "    if(r.sameDayConfirmedDate===today||r.sameDayFirstCorrectDate!==today||r.lastOutcome!=='sure')return false;",
        "    if(r.sameDayConfirmedDate===today||ppNextDayPending(r,today)||r.sameDayFirstCorrectDate!==today||r.lastOutcome!=='sure')return false;",
    )
    replace(
        "        progress[q._planKey]=rec;ppSaveProgress(progress);",
        "        progress[q._planKey]=rec;\n"
        "        if(!ppSaveProgress(progress)){\n"
        "          ppCheckpointSaveFailed=true;\n"
        "          showToast('다음 날 재확인 일정을 저장하지 못했습니다. 현재 문제에서 저장을 다시 시도하세요.',6000);\n"
        "          return null;\n"
        "        }",
    )
    replace(
        "      planSessionCommitted.add(planSessionIdx);if(confidence==='sure')ppScheduleSameDayRecheck(q);\n"
        "    }\n"
        "    return ppSavePassSessionCheckpoint(planSessionIdx);",
        "      planSessionCommitted.add(planSessionIdx);\n"
        "    }\n"
        "    // A prior attempt may already be scored while its deferred recheck still needs saving.\n"
        "    if(Number.isInteger(answer)&&answer===q['정답']&&ppScheduleSameDayRecheck(q)===null)return false;\n"
        "    return ppSavePassSessionCheckpoint(planSessionIdx);",
    )
    replace(
        "      if(confidence==='sure')ppScheduleSameDayRecheck(q);\n"
        "    }\n"
        "    const nextIndex=planSessionIdx+1;",
        "    }\n"
        "    if(confidence==='sure'&&ppScheduleSameDayRecheck(q)===null){renderNavigatorPassPlanCard();return;}\n"
        "    const nextIndex=planSessionIdx+1;",
    )
    return s


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stdin', action='store_true')
    parser.add_argument('--stdout', action='store_true')
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[1] / 'index.html'
    original = sys.stdin.read() if args.stdin else path.read_text(encoding='utf-8-sig')
    result = patch(original)
    if args.stdout:
        sys.stdout.write(result)
    else:
        path.write_text(result, encoding='utf-8')
        print('homework recheck persistence v5.35 ready')
