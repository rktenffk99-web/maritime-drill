from pathlib import Path
import re, subprocess, tempfile

src=Path('index.html').read_text(encoding='utf-8-sig')
checks=[
    "let planSessionKind='today';",
    "lastWrongDate:null,todayWrongReviewDate:null",
    "window.startNavigatorWeakDrill=async function(kind)",
    "ppTodayWrongItems(plan,progress,today)",
    "ppFrequentWrongItems(plan,progress)",
    "오늘 오답 다시 풀기",
    "자주 틀리는 문제",
    "r.lastWrongDate=today;r.todayWrongReviewDate=null",
    "if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today",
    "2026 explanation coverage" if False else "window.renderNavigatorPassPlanResult=function()",
]
for needle in checks:
    assert needle in src, f'missing marker: {needle}'
assert src.count("window.startNavigatorWeakDrill=async function(kind)")==1
assert src.count('취약문제 집중')==1
assert src.count("let planSessionKind='today';")==1
# Extract and syntax-check the v5.07 pass-plan script without executing it.
m=re.search(r'<script>\s*// ── v5\.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제 ──(.*?)</script>',src,re.S)
assert m,'pass-plan script block not found'
js="// extracted for syntax check\n"+m.group(1)
with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as f:
    f.write(js); name=f.name
subprocess.run(['node','--check',name],check=True)
print('weak drill checks passed: today-wrong + frequent-wrong')
