from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
POLICY='review-spacing-v3-mastery-ladder'

# Mature, repeatedly recalled questions should stop consuming frequent homework slots.
# masteryReviews increments only after a sure recall on a later date, so it is a stronger
# signal than raw attempts. "unsure" answers count as correct in legacy counters, therefore
# sureRate removes them before granting the longest intervals.
pattern=re.compile(
    r"""const attempts=Math\.max\(1,Number\(r\.attempts\)\|\|1\),accuracy=\(Number\(r\.correct\)\|\|0\)/attempts;\s*
        let interval=4;\s*
        if\(attempts>=4&&accuracy>=0\.90&&\(Number\(r\.wrong\)\|\|0\)<=1&&\(Number\(r\.unsure\)\|\|0\)<=1\)interval=14;\s*
        else if\(attempts>=3&&accuracy>=0\.80\)interval=7;\s*
        else if\(accuracy>=0\.70\)interval=5;\s*
        const exam=ppExamDay\(ppLoadPlan\(\),q\._planGrade\);let due=ppAddDays\(today,interval\);if\(exam\)\{const dayBefore=ppAddDays\(exam,-1\);due=ppMinDate\(due,dayBefore\)\}r\.dueDate=due;""",
    re.X
)
replacement="""const attempts=Math.max(1,Number(r.attempts)||1),correctCount=Math.max(0,Number(r.correct)||0),unsureCount=Math.max(0,Number(r.unsure)||0),accuracy=correctCount/attempts,sureRate=Math.max(0,correctCount-unsureCount)/attempts,reviews=Math.max(0,Number(r.masteryReviews)||0);
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

text,n=pattern.subn(replacement,text,count=1)
if n!=1 and POLICY not in text:
    raise SystemExit('adaptive mastered review interval block not found')

if "reviewSpacingPolicy:'review-spacing-v2'" in text:
    text=text.replace("reviewSpacingPolicy:'review-spacing-v2'",f"reviewSpacingPolicy:'{POLICY}'",1)
elif f"reviewSpacingPolicy:'{POLICY}'" not in text:
    raise SystemExit('review spacing policy marker not found')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched mastery-review spacing ladder + exam proximity caps')
else:
    print('review spacing v3 already patched')
