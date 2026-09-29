"""Invalidate stale pass-plan checkpoints when the daily question cap changes."""
from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='daily-cap-session-reset-v1'

if MARKER not in text:
    old_save = """    if(!ppSavePlan(plan))return;const daily=ppLoadDaily();delete daily[today];if(!ppSaveDaily(daily))return;
    await renderNavigatorPassPlan(planEntrySubject);"""
    new_save = """    if(!ppSavePlan(plan))return;const daily=ppLoadDaily();delete daily[today];if(!ppSaveDaily(daily))return;
    ppClearPassSessionCheckpoint();
    await renderNavigatorPassPlan(planEntrySubject);"""
    if old_save not in text:
        raise SystemExit('pass-plan settings save anchor not found')
    text=text.replace(old_save,new_save,1)

    old_checkpoint = """      const checkpoint=ppLoadPassSessionCheckpoint();
      if(checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length){"""
    new_checkpoint = """      const checkpoint=ppLoadPassSessionCheckpoint();
      const currentDailyCap=Math.max(40,Math.min(250,Number(plan.dailyCap)||120));
      const checkpointExceedsDailyCap=!!(checkpoint&&Array.isArray(checkpoint.queueKeys)&&new Set(checkpoint.queueKeys).size>currentDailyCap); // daily-cap-session-reset-v1
      if(checkpointExceedsDailyCap){
        console.info('[pass-plan] saved checkpoint exceeds current daily cap; rebuilding today assignment');
        ppClearPassSessionCheckpoint();
      }
      if(!checkpointExceedsDailyCap&&checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length){"""
    if old_checkpoint not in text:
        raise SystemExit('pass-plan checkpoint restore anchor not found')
    text=text.replace(old_checkpoint,new_checkpoint,1)

if MARKER not in text:
    raise SystemExit('daily cap session reset marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched stale daily-cap checkpoint reset')
else:
    print('daily-cap checkpoint reset already patched')
