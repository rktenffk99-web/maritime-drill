from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)
patterns=['startNavigatorPassPlanMock','startPastSession','function ppBuildPool','function ppBuildTodayAssignment','renderNavigatorPassPlan','실전 모의','getPastExamsByBase','getPastExamsForSession','pastQuestions','pastSessionQuestions','pastExamQuestions','pastSessionQueue','pastSessionMode','pastQuestionIndex','pastAnswered']
out=[]
for pat in patterns:
    hits=[m.start() for m in re.finditer(re.escape(pat),src)]
    out.append(f'===== {pat} count={len(hits)} =====')
    for i,pos in enumerate(hits[:20],1):
        out.append(f'--- {i} @ {pos} ---\n'+src[max(0,pos-4500):min(len(src),pos+18000)])
Path('debug/predictive-mock-context.txt').write_text('\n\n'.join(out),encoding='utf-8')
print('wrote predictive mock context')
