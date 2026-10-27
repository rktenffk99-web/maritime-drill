"""Persist optional mock hints and keep assisted answers out of recall evidence."""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text(encoding='utf-8-sig')

# The old generator documents v5.28 hint UI. In the released v5.34 app,
# pressing 0 opens a persisted full explanation instead, so do not reinsert
# obsolete hint copy if the validation script is run against a modern build.
if "const APP_VERSION = '5.34'" in text and "<b>0</b> 해설 열기·닫기" in text:
    print('v5.34 explanation controls already integrated')
    raise SystemExit(0)


def replace_once(old, new):
    global text
    if new in text:
        return
    if text.count(old) != 1:
        raise RuntimeError('missing or ambiguous mock hint anchor: ' + old[:120])
    text = text.replace(old, new, 1)


replace_once(
    'function savePastProgress(){',
    'function savePastProgress(options={}){',
)
replace_once(
    "const saved=safeStorageSet(PAST_CHECKPOINT_KEY,JSON.stringify({meta:pastProgressMeta,state}),'필기 답안 체크포인트');\n  safeStorageSet(PAST_PROGRESS_KEY,JSON.stringify(state),'필기 진행');",
    "const saved=safeStorageSet(PAST_CHECKPOINT_KEY,JSON.stringify({meta:pastProgressMeta,state}),'필기 답안 체크포인트');\n"
    "  // Hint content is disclosed only after its complete checkpoint is durable.\n"
    "  if(options.requireCheckpoint===true&&!saved)return false;\n"
    "  safeStorageSet(PAST_PROGRESS_KEY,JSON.stringify(state),'필기 진행');",
)
replace_once(
    "savedAt:Date.now(),evaluationExplanationViewed:pastQueue.some(q=>q&&q._evaluationExplanationViewed===true)};",
    "savedAt:Date.now(),evaluationExplanationViewed:pastQueue.some(q=>q&&q._evaluationExplanationViewed===true),hintedIndices:pastQueue.flatMap((q,i)=>q&&q._mockHintViewed===true?[i]:[])};",
)
replace_once(
    "    if(state.evaluationExplanationViewed===true)restored.forEach(q=>{q._evaluationExplanationViewed=true});\n",
    "    if(state.evaluationExplanationViewed===true)restored.forEach(q=>{q._evaluationExplanationViewed=true});\n"
    "    if(Array.isArray(state.hintedIndices))for(const i of state.hintedIndices){if(Number.isInteger(i)&&i>=0&&i<restored.length)restored[i]._mockHintViewed=true;}\n",
)
replace_once(
    "if(answer===q['정답']){ppAppendReviewEvidence(r,'correct',today,'predictive-mock',ppMockEvidenceId(q));window.__mdLearningIntegrity.appendOutcome(r,'correct',false);return;}",
    "if(answer===q['정답']){const outcome=q._mockHintViewed===true?'unsure':'correct';ppAppendReviewEvidence(r,outcome,today,'predictive-mock',ppMockEvidenceId(q));window.__mdLearningIntegrity.appendOutcome(r,outcome,false);return;}",
)
replace_once(
    '정답·해설은 제출 후 확인합니다. 중간에 나가도 이어서 풀 수 있습니다.',
    '0 키 또는 힌트 버튼으로 풀이 도움을 볼 수 있습니다. 정답·전체 해설은 제출 후 확인합니다.',
)
replace_once(
    '단축키: <b>1~4</b> 답 선택 · <b>Enter</b>/<b>→</b> 다음 · <b>←</b> 이전 · <b>B</b> 북마크',
    "단축키: <b>1~4</b> 답 선택${pastMode==='mock'?' · <b>0</b> 힌트':''} · <b>Enter</b>/<b>→</b> 다음 · <b>←</b> 이전 · <b>B</b> 북마크",
)
path.write_text(text, encoding='utf-8')
print('mock hint persistence and keyboard guidance integrated')
