from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
POLICY='review-spacing-v3-mastery-ladder'

# Mature, repeatedly recalled questions should stop consuming frequent homework slots.
# This patch runs after the safety/integrity transforms, so locate the final interval block
# structurally instead of depending on the exact earlier source text.
fn_start=text.find('  function ppCommitOutcome(q,answer,confidence){')
if fn_start<0:
    raise SystemExit('ppCommitOutcome not found')
fn_end=text.find('  window.prevNavigatorPassPlanQuestion=',fn_start)
if fn_end<0:
    fn_end=text.find('  window.nextNavigatorPassPlanQuestion=',fn_start)
if fn_end<0:
    raise SystemExit('ppCommitOutcome end anchor not found')
body=text[fn_start:fn_end]

if 'sureRate=Math.max(0,correctCount-unsureCount)/attempts' not in body:
    interval_pos=body.find('let interval=4;')
    attempt_pos=body.rfind('const attempts=',0,interval_pos)
    due_end=body.find('r.dueDate=due;',interval_pos)
    if interval_pos<0 or attempt_pos<0 or due_end<0:
        raise SystemExit('adaptive mastered review interval block not found')
    block_start=body.rfind('\n',0,attempt_pos)+1
    block_end=due_end+len('r.dueDate=due;')
    old_block=body[block_start:block_end]
    if 'const exam=ppExamDay' not in old_block:
        raise SystemExit('mastered review exam anchor not found')

    replacement="""        const attempts=Math.max(1,Number(r.attempts)||1),correctCount=Math.max(0,Number(r.correct)||0),unsureCount=Math.max(0,Number(r.unsure)||0),accuracy=correctCount/attempts,sureRate=Math.max(0,correctCount-unsureCount)/attempts,reviews=Math.max(0,Number(r.masteryReviews)||0);
        let interval=4;
        if(reviews>=5&&attempts>=7&&sureRate>=0.90)interval=30;
        else if(reviews>=4&&attempts>=6&&sureRate>=0.85)interval=21;
        else if(reviews>=3&&attempts>=5&&sureRate>=0.80)interval=14;
        else if(reviews>=2&&attempts>=4&&sureRate>=0.75)interval=7;
        else if(accuracy>=0.70)interval=5;
        const exam=ppExamDay(ppLoadPlan(),q._planGrade);
        if(exam){
          const dday=ppDiffDays(today,exam);
          if(dday!==null&&dday>=0){
            if(dday<=7)interval=Math.min(interval,3);
            else if(dday<=21)interval=Math.min(interval,7);
            else if(dday<=44)interval=Math.min(interval,21);
          }
        }
        let due=ppAddDays(today,interval);if(exam){const dayBefore=ppAddDays(exam,-1);due=ppMinDate(due,dayBefore)}r.dueDate=due;"""
    body=body[:block_start]+replacement+body[block_end:]
    text=text[:fn_start]+body+text[fn_end:]

if "reviewSpacingPolicy:'review-spacing-v2'" in text:
    text=text.replace("reviewSpacingPolicy:'review-spacing-v2'",f"reviewSpacingPolicy:'{POLICY}'",1)
elif f"reviewSpacingPolicy:'{POLICY}'" not in text:
    raise SystemExit('review spacing policy marker not found')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched mastery-review spacing ladder + exam proximity caps')
else:
    print('review spacing v3 already patched')
