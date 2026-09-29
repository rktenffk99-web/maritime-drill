from pathlib import Path
import re

text=Path('index.html').read_text(encoding='utf-8-sig')

assert 'daily-cap-session-reset-v1' in text, 'daily-cap reset marker missing'

save=re.search(r"window\.saveNavigatorPassPlanSettings=async function\(\)\{.*?\n  \};",text,re.S)
assert save, 'pass-plan settings save handler missing'
save_body=save.group(0)
assert 'delete daily[today]' in save_body, 'today assignment cache is not invalidated'
assert 'ppClearPassSessionCheckpoint();' in save_body, 'settings save must clear the old active homework checkpoint'
assert save_body.find('ppClearPassSessionCheckpoint();') < save_body.find('await renderNavigatorPassPlan'), 'checkpoint must be cleared before the plan is re-rendered'

start=re.search(r"window\.startNavigatorPassPlanToday=async function\(\)\{.*?\n  \};",text,re.S)
assert start, 'today-session starter missing'
start_body=start.group(0)
assert "const currentDailyCap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));" in start_body
assert 'new Set(checkpoint.queueKeys).size>currentDailyCap' in start_body, 'stale checkpoint must be compared with the current daily cap'
assert 'checkpointExceedsDailyCap' in start_body, 'stale checkpoint guard missing'
assert "ppClearPassSessionCheckpoint();" in start_body and 'if(!checkpointExceedsDailyCap&&checkpoint' in start_body, 'oversized stale checkpoint must be discarded before restore'

def stale(keys, cap):
    return len(set(keys)) > cap

assert stale([f'q{i}' for i in range(190)],70), '190-question checkpoint must be rejected after changing the cap to 70'
base=[f'q{i}' for i in range(70)]
assert not stale(base + base[:20],70), 'same-day recheck duplicates must not make a valid 70-question session look stale'
assert not stale([f'q{i}' for i in range(70)],70), 'exactly 70 base questions must remain resumable'

print('daily cap stale-checkpoint regression: PASS')
