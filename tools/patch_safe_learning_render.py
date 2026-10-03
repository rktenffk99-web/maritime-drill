"""Normalize imported interview state and defend its HTML render boundaries.

Apply after the legacy generators. ``--stdout`` transforms in memory for tests.
"""
from pathlib import Path
import sys


HELPERS = '''// imported-learning-values-v1: imported values are data, never HTML.
function mdLearningNumber(value,fallback=0,min=0,max=Number.MAX_SAFE_INTEGER,integer=false){
  if(typeof value!=='number'&&typeof value!=='string')return fallback;
  if(typeof value==='string'&&(!value.trim()||!/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?$/i.test(value.trim())))return fallback;
  const n=Number(value);if(!Number.isFinite(n))return fallback;
  const bounded=Math.max(min,Math.min(max,n));return integer?Math.floor(bounded):bounded;
}
function mdLearningRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
function mdLearningIds(value){return Array.isArray(value)?value.filter(v=>typeof v==='string'||typeof v==='number').map(String):[]}
function mdNormalizeTypedStats(value){
  if(!mdLearningRecord(value))return null;
  const s={...value};
  for(const k of ['attempts','verifiedAttempts'])s[k]=mdLearningNumber(value[k],0,0,Number.MAX_SAFE_INTEGER,true);
  for(const k of ['avgScore','avgScoreVerified','bestScore'])s[k]=mdLearningNumber(value[k],0,0,100);
  s.trend=mdLearningNumber(value.trend,0,-100,100);
  s.rubricVersionAtLast=mdLearningNumber(value.rubricVersionAtLast,1,1,Number.MAX_SAFE_INTEGER,true);
  s.chronicMisses=mdLearningIds(value.chronicMisses);s.chronicForbidden=mdLearningIds(value.chronicForbidden);
  return s;
}
function mdNormalizeTypedAttempts(value){
  if(!Array.isArray(value))return [];
  return value.filter(mdLearningRecord).map(a=>{
    const row={...a,score:mdLearningNumber(a.score,0,0,100),durationSec:mdLearningNumber(a.durationSec,0,0,Number.MAX_SAFE_INTEGER,true),rubricVersion:mdLearningNumber(a.rubricVersion,1,1,Number.MAX_SAFE_INTEGER,true)};
    row.date=typeof a.date==='string'&&Number.isFinite(new Date(a.date).getTime())?a.date:null;
    row.mode=a.mode==='exam'?'exam':'learn';row.userAnswer=typeof a.userAnswer==='string'?a.userAnswer:'';
    for(const k of ['matchedFactIds','missedFactIds','niceMatched','forbiddenHits'])row[k]=mdLearningIds(a[k]);
    return row;
  });
}
function mdNormalizeLearningBox(value){
  const item=mdLearningRecord(value)?value:{};
  item.box=mdLearningNumber(item.box,1,1,3,true);
  for(const k of ['correct','wrong','reps','interval'])item[k]=mdLearningNumber(item[k],0,0,Number.MAX_SAFE_INTEGER,true);
  item.recoveryStreak=mdLearningNumber(item.recoveryStreak,0,0,2,true);
  item.ef=mdLearningNumber(item.ef,SM2_DEFAULT_EF,1.3);
  item.confidence=['sure','unsure'].includes(item.confidence)?item.confidence:null;
  if(typeof item.needsRetry!=='boolean')item.needsRetry=item.wrong>0&&item.box<3;
  item.typedAttempts=mdNormalizeTypedAttempts(item.typedAttempts);item.typedStats=mdNormalizeTypedStats(item.typedStats);
  return item;
}
'''


FOCUS_HELPER = '''function mdNormalizeFocusHistory(value){
  if(!Array.isArray(value))return [];
  return value.filter(row=>mdLearningRecord(row)&&Array.isArray(row.ids)).map(row=>({
    ...row,
    ids:row.ids.filter(id=>typeof id==='string'||(typeof id==='number'&&Number.isFinite(id))),
    ts:mdLearningNumber(row.ts,0,0,8640000000000000,true),
    dayNum:mdLearningNumber(row.dayNum,0,0,Number.MAX_SAFE_INTEGER,true),
    replayCount:mdLearningNumber(row.replayCount,0,0,Number.MAX_SAFE_INTEGER,true)
  }));
}
'''


def patch_source(text):
    def replace(old, new):
        nonlocal text
        if new in text:
            return
        if old not in text:
            raise RuntimeError('missing safe learning render anchor: ' + old[:100])
        text = text.replace(old, new)

    if 'function mdLearningNumber(' not in text:
        replace('function migrateBoxes(loadedBoxes){', HELPERS + 'function migrateBoxes(loadedBoxes){')
    replace('  boxes = (st && st.boxes) ? st.boxes : initBoxes();',
            '  boxes = (st && mdLearningRecord(st.boxes)) ? st.boxes : initBoxes();')
    replace('  if(!loadedBoxes) return loadedBoxes;',
            '  if(!mdLearningRecord(loadedBoxes)) return {};')
    replace('    const it = loadedBoxes[id];',
            '    const it = loadedBoxes[id] = mdNormalizeLearningBox(loadedBoxes[id]);')
    replace('    const b = boxes[qid];\n    if (!Array.isArray(b.typedAttempts)) b.typedAttempts = [];\n    if (!b.typedStats) b.typedStats = null;',
            '    const b = boxes[qid] = mdNormalizeLearningBox(boxes[qid]);')

    # Cached stats can also reach the renderer without migration (e.g. sync).
    replace('  const s = box.typedStats;\n  if (s.rubricVersionAtLast !== rubricVersion) {',
            '  const s = mdNormalizeTypedStats(box.typedStats);if(!s)return \'\';\n  if (s.rubricVersionAtLast !== mdLearningNumber(rubricVersion,1,1,Number.MAX_SAFE_INTEGER,true)) {')
    replace('  const avgVerified = s.avgScoreVerified || s.avgScore;',
            '  const avgVerified = s.verifiedAttempts>0 ? s.avgScoreVerified : s.avgScore;')
    replace('  const total = sa.length;\n  const avg = Math.round(sa.reduce((s, a) => s + (a.score || 0), 0) / total);',
            '  sa=sa.filter(mdLearningRecord).map(a=>({...a,score:mdLearningNumber(a.score,0,0,100)}));if(!sa.length)return \'\';\n  const total = sa.length;\n  const avg = Math.round(sa.reduce((s, a) => s + a.score, 0) / total);')
    replace(" + w.missCount + '회 miss", " + mdLearningNumber(w.missCount,0,0,Number.MAX_SAFE_INTEGER,true) + '회 miss")

    # These interview cards interpolate counters; normalize before formatting.
    replace('  const bi=boxes[cur.id];const isMock=currentMode===\"mock\";',
            '  const bi=mdNormalizeLearningBox(boxes[cur.id]);const isMock=currentMode===\"mock\";')
    replace('  const bi=boxes[cur.id];const imp=getImp(cur.id);',
            '  const bi=mdNormalizeLearningBox(boxes[cur.id]);const imp=getImp(cur.id);')
    replace('  const curProgress = isFocus ? (focusProgress[cur.id]||0) : 0;',
            '  const curProgress = isFocus ? mdLearningNumber(focusProgress[cur.id],0,0,Number.MAX_SAFE_INTEGER,true) : 0;')
    replace('${activeFocusTarget}', '${mdLearningNumber(activeFocusTarget,FOCUS_TARGET,1,Number.MAX_SAFE_INTEGER,true)}')
    replace('<span class="tag tag-dim">#${cur.id}</span>',
            '<span class="tag tag-dim">#${escapeHTML(cur.id)}</span>')
    # Focus timestamps also appear in event-handler arguments; keep them numbers.
    if 'function mdNormalizeFocusHistory(' not in text:
        replace('function getFocusHistory(){', FOCUS_HELPER + 'function getFocusHistory(){')
    replace('    let arr=r?JSON.parse(r):[];',
            '    let arr=mdNormalizeFocusHistory(r?JSON.parse(r):[]);')
    replace("function renderFocusHistorySection(){\n  const hist=getFocusHistory();",
            "function renderFocusHistorySection(){\n  const hist=mdNormalizeFocusHistory(getFocusHistory());")
    return text


if __name__ == '__main__':
    file = Path('index.html')
    original = (sys.stdin.buffer.read().decode('utf-8-sig') if '--stdin' in sys.argv
                else file.read_text(encoding='utf-8-sig'))
    result = patch_source(original)
    if '--stdout' in sys.argv:
        sys.stdout.buffer.write(result.encode('utf-8'))
    else:
        if result != original:
            file.write_text(result, encoding='utf-8')
        print('safe imported learning render patch applied')
