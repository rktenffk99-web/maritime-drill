from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

old="""      }else{
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
      }
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;
      if(!correct)addPastWrong(q,answer);
    }
"""
new="""      }else{
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
      }
      if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today;
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;r.lastWrongDate=today;r.todayWrongReviewDate=null;
      if(!correct)addPastWrong(q,answer);
    }
"""
if old in text:
    text=text.replace(old,new,1)
elif "if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today" not in text:
    raise SystemExit('learning-priority weak-drill compatibility anchor not found')

for marker in ["if(planSessionKind==='today-wrong')r.todayWrongReviewDate=today","r.lastWrongDate=today;r.todayWrongReviewDate=null"]:
    if marker not in text: raise SystemExit(f'missing marker: {marker}')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('restored weak-drill bookkeeping after learning-priority patch')
else:
    print('weak-drill bookkeeping compatibility already present')
