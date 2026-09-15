from pathlib import Path
import re
src=Path('index.html').read_text(encoding='utf-8-sig')
Path('debug').mkdir(exist_ok=True)

def dump(name, needle, before=1500, after=24000, occurrence=0):
    hits=[m.start() for m in re.finditer(re.escape(needle),src)]
    if not hits:
        Path(f'debug/{name}.txt').write_text(f'not found: {needle}',encoding='utf-8');return
    pos=hits[min(occurrence,len(hits)-1)]
    Path(f'debug/{name}.txt').write_text(src[max(0,pos-before):min(len(src),pos+after)],encoding='utf-8')

# Focused extracts for implementation.
dump('mock-function','window.startNavigatorPassPlanMock',2500,18000)
dump('past-session-function','async function startPastSession',3000,30000)
dump('past-state','let past',6000,18000)
dump('past-render','function renderPast',2500,24000)
dump('pool-functions','function ppBuildPool',2500,18000)
dump('plan-render','window.renderNavigatorPassPlan',1000,22000)
dump('past-exam-helper','function getPastExamsByBase',2500,16000)
print('wrote focused predictive mock context')
