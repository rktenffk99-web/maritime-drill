from pathlib import Path
import re

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text

progress_fn="""  function ppProgressFor(progress,key){
    if(!progress[key])progress[key]={firstPassDate:null,mastered:false,status:'new',dueDate:null,lastDate:null,lastSureDate:null,lastOutcome:null,attempts:0,correct:0,wrong:0,unsure:0,masteryReviews:0,recoveryStartDate:null,sameDayFirstCorrectDate:null,sameDayConfirmedDate:null};
    const r=progress[key];
    // Migrate old records without discarding prior study history.
    if(!Object.prototype.hasOwnProperty.call(r,'sameDayFirstCorrectDate'))r.sameDayFirstCorrectDate=(!r.mastered&&r.lastSureDate)?r.lastSureDate:null;
    if(!Object.prototype.hasOwnProperty.call(r,'sameDayConfirmedDate'))r.sameDayConfirmedDate=r.mastered?(r.lastSureDate||r.firstPassDate||null):null;
    return r;
  }"""
text,n=re.subn(r"  function ppProgressFor\(progress,key\)\{.*?\n  \}",progress_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppProgressFor not found')

text,n=re.subn(
    r"  function ppTodayCleared\(rec,today\)\{[^\n]*\}",
    "  function ppTodayCleared(rec,today){return !!(rec&&rec.sameDayConfirmedDate===today)}",
    text,count=1
)
if n!=1:
    raise SystemExit('ppTodayCleared not found')

commit_fn="""  function ppCommitOutcome(q,answer,confidence){
    const progress=ppLoadProgress(),r=ppProgressFor(progress,q._planKey),today=ppDateKey(new Date()),correct=answer===q['정답'];
    const priorConfirmed=r.sameDayConfirmedDate||null,priorFirstCorrect=r.sameDayFirstCorrectDate||null;
    r.attempts=(r.attempts||0)+1;r.lastDate=today;r.lastOutcome=correct?confidence:'wrong';
    if(correct)r.correct=(r.correct||0)+1;else r.wrong=(r.wrong||0)+1;
    if(correct&&confidence==='unsure')r.unsure=(r.unsure||0)+1;
    if(correct&&confidence==='sure'){
      r.lastSureDate=today;
      const retainedAcrossDay=!!(priorConfirmed&&priorConfirmed<today);
      if(retainedAcrossDay){
        // A question confirmed on an earlier date and recalled again today is mastered.
        r.status='mastered';r.mastered=true;r.masteryReviews=(r.masteryReviews||0)+1;
        r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;
        const exam=ppExamDay(ppLoadPlan(),q._planGrade);let due=ppAddDays(today,3);if(exam){const dayBefore=ppAddDays(exam,-1);due=ppMinDate(due,dayBefore)}r.dueDate=due;
        removePastWrong(pqid(q));
      }else if(priorFirstCorrect===today){
        // Second correct recall on the same day: confirmed for today, but not mastered yet.
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=today;r.recoveryStartDate=null;r.dueDate=ppAddDays(today,1);
        removePastWrong(pqid(q));
      }else{
        // First correct recall of the day. Keep it unresolved so a delayed same-day check is required.
        if(!r.firstPassDate)r.firstPassDate=today;
        r.status='provisional';r.mastered=false;r.sameDayFirstCorrectDate=today;r.sameDayConfirmedDate=null;r.dueDate=today;
      }
    }else{
      r.status='weak';r.mastered=false;r.recoveryStartDate=today;r.dueDate=today;
      r.sameDayFirstCorrectDate=null;r.sameDayConfirmedDate=null;
      if(!correct)addPastWrong(q,answer);
    }
    progress[q._planKey]=r;ppSaveProgress(progress);
  }"""
text,n=re.subn(r"  function ppCommitOutcome\(q,answer,confidence\)\{.*?\n  \}",commit_fn,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('ppCommitOutcome not found')

old_note='같은 날 여러 번 맞혀도 숙달로 올리지 않습니다. 다른 날 다시 정답+확실해야 숙달됩니다.'
new_note='첫 정답은 학습 중 · 같은 날 한 번 더 맞히면 오늘 확인 완료 · 다음 날짜에 다시 맞히면 숙달됩니다.'
text=text.replace(old_note,new_note,1)

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched same-day confirmation flow')
else:
    print('no change needed')
