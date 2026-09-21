from pathlib import Path
import re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')

required=[
    "recovery-recheck-v1",
    "checkpoint-authoritative-resume-v3",
    "stale-assignment-recovery-v3",
    "return (Number(r.wrong)||0)>=2&&!r.mastered;",
    "function ppScheduleSameDayRecheck(q)",
    "const delay=30+Math.floor(Math.random()*21);",
    "planSessionQueue.splice(insertAt,0,copy);",
    "planSessionAnswers.splice(insertAt,0,null);",
    "planSessionConfidence.splice(insertAt,0,null);",
    "if(confidence==='sure')ppScheduleSameDayRecheck(q);",
    "const checkpoint=ppLoadPassSessionCheckpoint();",
    "const checkpointKeys=checkpoint.queueKeys.slice();",
    "const uniqueKeys=[...new Set(checkpointKeys)];",
    "const keptOldIndices=[];",
    "ppSavePassSessionCheckpoint(nextIndex); // normalize after skipping stale keys, if any",
    "const assignment=await ppGetDailyAssignment(plan,planPools,progress,false);",
    "stale daily assignment keys skipped",
    "let startIndex=0;",
    "rec.lastDate===today",
    "_sameDayRecheck:true",
    "숙달되면 목록에서 빠집니다.",
    "30~50문제 뒤 자동 재확인",
    "new Map(planSessionQueue.filter(q=>!ppTodayCleared",
]
for needle in required:
    assert needle in src, f'missing marker: {needle}'

assert "filter(item=>(Number(ppProgressFor(progress,item.key).wrong)||0)>=2)" not in src, 'lifetime wrong-only selector still present'
assert src.count('function ppScheduleSameDayRecheck(q)')==1
assert src.count('checkpoint-authoritative-resume-v3')==1
assert src.count('stale-assignment-recovery-v3')==1

# Static ordering checks: commit must happen before scheduling, and scheduling before checkpoint save.
choose=re.search(r"window\.nextNavigatorPassPlanQuestion=function\(\)\{(.*?)\n  \};",src,re.S)
assert choose, 'choose function missing'
body=choose.group(1)
assert body.index('ppCommitOutcome') < body.index('ppScheduleSameDayRecheck') < body.index('ppSavePassSessionCheckpoint'), 'recheck scheduling order is unsafe'

# The saved queue must be restored BEFORE today's adaptive assignment is rebuilt.
# This is the regression that previously sent a user from roughly 36/110 back to 3/110.
start=re.search(r"window\.startNavigatorPassPlanToday=async function\(\)\{(.*?)\n  \};",src,re.S)
assert start, 'today-start function missing'
sbody=start.group(1)
assert sbody.index('const checkpoint=ppLoadPassSessionCheckpoint();') < sbody.index('const assignment=await ppGetDailyAssignment'), 'daily assignment is rebuilt before checkpoint restore'
assert 'checkpointMatches' not in sbody, 'resume still depends on strict equality with a rebuilt daily assignment'
assert 'checkpoint.queueKeys.every(k=>baseSet.has(k))' not in sbody, 'old strict base-assignment checkpoint validation remains'
assert 'keptOldIndices.filter(i=>i<oldNext).length' in sbody, 'checkpoint index is not remapped when stale source keys are skipped'
assert "rec.lastDate===today&&Number(rec.attempts||0)>0" in sbody, 'lost-checkpoint recovery does not use actually attempted-today prefix'
assert sbody.index('const checkpoint=ppLoadPassSessionCheckpoint();') < sbody.index('const checkpointKeys=checkpoint.queueKeys.slice();') < sbody.index('const assignment=await ppGetDailyAssignment')
assert "throw new Error('문제 원문을 찾지 못했습니다.')" not in sbody, 'single stale key still aborts whole daily session'

# Syntax-check the pass-plan block after all patches.
m=re.search(r'<script>\s*// ── v5\.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제 ──(.*?)</script>',src,re.S)
assert m,'pass-plan script block not found'
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write('// extracted for syntax check\n'+m.group(1)); name=f.name
subprocess.run(['node','--check',name],check=True)

print('recovery/recheck checks passed: checkpoint queue is authoritative and lost checkpoints recover from attempted-today progress')
