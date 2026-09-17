from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='review-spacing-v2'

# After a question is confirmed twice on the same day, do not force it back the very next day.
# Leave room for unseen/weak material and revisit it after two days instead.
pattern=(r"(r\.status='provisional';r\.mastered=false;"
         r"r\.sameDayFirstCorrectDate=today;r\.sameDayConfirmedDate=today;"
         r"r\.recoveryStartDate=null;r\.dueDate=ppAddDays\(today,)1(\);)")
text,n=re.subn(pattern, r"\g<1>2\g<2>", text, count=1)
if n!=1 and 'sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,2);' not in text:
    raise SystemExit('same-day confirmation spacing anchor not found')

# Add a durable marker next to the adaptive spacing policy without changing behavior.
if MARKER not in text:
    anchor="rotationPolicy:'knowledge-gap-priority-v3'"
    if anchor not in text:
        raise SystemExit('knowledge-gap priority policy not found')
    text=text.replace(anchor, anchor+",reviewSpacingPolicy:'review-spacing-v2'", 1)

if 'r.dueDate=ppAddDays(today,2);' not in text:
    raise SystemExit('two-day confirmation spacing missing')
if MARKER not in text:
    raise SystemExit('review spacing marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched next-day review suppression for confirmed correct items')
else:
    print('review spacing v2 already patched')
