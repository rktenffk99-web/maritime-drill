from pathlib import Path
import re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')

required=[
    "recovery-recheck-v1",
    "return (Number(r.wrong)||0)>=2&&!r.mastered;",
    "function ppScheduleSameDayRecheck(q)",
    "const delay=30+Math.floor(Math.random()*21);",
    "planSessionQueue.splice(insertAt,0,copy);",
    "planSessionAnswers.splice(insertAt,0,null);",
    "planSessionConfidence.splice(insertAt,0,null);",
    "if(confidence==='sure')ppScheduleSameDayRecheck(q);",
    "const sourceKeys=checkpointMatches?checkpoint.queueKeys:allKeys;",
    "checkpoint.queueKeys.length>=allKeys.length",
    "_sameDayRecheck:true",
    "당일 재확인",
    "숙달되면 목록에서 빠집니다.",
    "첫 정답은 30~50문제 뒤 자동 재확인",
    "new Map(planSessionQueue.filter(q=>!ppTodayCleared",
]
for needle in required:
    assert needle in src, f'missing marker: {needle}'

assert "filter(item=>(Number(ppProgressFor(progress,item.key).wrong)||0)>=2)" not in src, 'lifetime wrong-only selector still present'
assert src.count('function ppScheduleSameDayRecheck(q)')==1
assert src.count('recovery-recheck-v1')==1

# Static ordering checks: commit must happen before scheduling, and scheduling before checkpoint save.
choose=re.search(r"window\.chooseNavigatorPassPlanAnswer=function\(i\)\{(.*?)\n  \};",src,re.S)
assert choose, 'choose function missing'
body=choose.group(1)
assert body.index('ppCommitOutcome') < body.index('ppScheduleSameDayRecheck') < body.index('ppSavePassSessionCheckpoint'), 'recheck scheduling order is unsafe'

# Resume validation must only accept keys from today's base assignment, while permitting duplicates.
start=re.search(r"window\.startNavigatorPassPlanToday=async function\(\)\{(.*?)\n  \};",src,re.S)
assert start, 'today-start function missing'
sbody=start.group(1)
assert 'checkpoint.queueKeys.every(k=>baseSet.has(k))' in sbody
assert 'allKeys.every(k=>checkpoint.queueKeys.includes(k))' in sbody

# Syntax-check the pass-plan block after all patches.
m=re.search(r'<script>\s*// ── v5\.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제 ──(.*?)</script>',src,re.S)
assert m,'pass-plan script block not found'
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write('// extracted for syntax check\n'+m.group(1)); name=f.name
subprocess.run(['node','--check',name],check=True)

print('recovery/recheck checks passed: frequent-wrong retires on mastery; first sure-correct schedules delayed confirmation')
