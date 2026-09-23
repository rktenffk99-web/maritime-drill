"""Test rotating exam papers and their real browser save/result flows in isolation."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from collections import Counter
import json, os, threading
from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'browser-test-results';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'cases':[],'page_errors':[],'diversity':{}}

def configure(page,subjects):
    page.evaluate("renderNavigatorPassPlan('navi3')");wait_plan(page,configure=True)
    for grade in ('navi2','navi3'):
        page.locator(f'#pp-enable-{grade}').check()
        page.locator(f'#pp-date-{grade}').fill((date.today()+timedelta(days=30)).isoformat())
        for field in page.locator(f'input[data-pp-subject="{grade}"]').all():field.set_checked(field.input_value() in subjects)
    page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click();wait_plan(page,tab='mock')

try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':1280,'height':900})
    origin=f'http://127.0.0.1:{server.server_port}/'
    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
    page=context.new_page();page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
    page.goto(origin,wait_until='load');page.get_by_role('button',name='동의합니다',exact=True).click()
    page.wait_for_function("hasAgreedTerms()&&!document.getElementById('md-modal-wrap')")
    all_subjects=['항해','운용','법규','영어','상선전문']
    configure(page,all_subjects)
    assert page.locator('button[onclick^="startNavigatorPassPlanMock("]:visible').count()==2
    assert '2026 최신 회차' not in page.locator('#app').inner_text()
    assert page.locator('#md-plan-panel-mock .md-mock-note').count()==2
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(OUT/'balanced-mock-menu.png'),full_page=True)
    report['cases'].append('new primary exam and its explanation are visible on mobile 30 days before the exam')
    for grade in ('navi2','navi3'):
        page.evaluate('(grade)=>startNavigatorPassPlanMock(grade)',grade)
        assert page.evaluate("pastQueue.map(q=>q['과목'])")==[s for s in all_subjects for _ in range(25)]
        assert page.evaluate('pastQueue.every(q=>q._balancedMock&&q._predictiveMock)')
        assert page.evaluate('new Set(pastQueue.map(q=>q._year)).size')>1
    report['cases'].append('both grades have 125 valid questions in subject order, drawn across multiple years')
    selected=['항해','법규','영어'];configure(page,selected)
    # Reset only isolated test-browser assembly history, never application progress.
    page.evaluate("localStorage.removeItem('md_mock_exposure_v1')")
    before_progress=page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")
    page.evaluate("""()=>{let seed=20260923;Math.random=()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}""")
    for grade in ('navi2','navi3'):
        old=[];counts=Counter();source_years=set();english_topics=set();overlaps=[]
        other='navi3' if grade=='navi2' else 'navi2'
        other_before=page.evaluate("grade=>JSON.parse(localStorage.getItem('md_mock_exposure_v1')||'null')?.grades?.[grade]||{sequence:0,seen:{},recent:[]}",other)
        for i in range(20):
            page.evaluate('(grade)=>startNavigatorPassPlanMock(grade)',grade)
            assert page.evaluate("currentMode==='past'&&pastMode==='mock'&&pastQueue.every(mdQuestionUsable)")
            assert page.evaluate("pastQueue.map(q=>q['과목'])")==[s for s in selected for _ in range(25)]
            keys=page.evaluate('pastQueue.map(q=>q._planKey)');assert len(set(keys))==75
            exposure=page.evaluate("grade=>JSON.parse(localStorage.getItem('md_mock_exposure_v1')).grades[grade]",grade)
            paper=set(exposure['recent'][0]);assert len(paper)==75
            assert not paper.intersection(set().union(*old[-3:]))
            if old:overlaps.append(len(paper&old[-1]))
            old.append(paper);counts.update(keys)
            source_years.update(page.evaluate('pastQueue.map(q=>q._year)'))
            english_topics.update(page.evaluate("pastQueue.filter(q=>q['과목']==='영어').map(q=>q._predictiveConcept)"))
            assert exposure['sequence']==i+1
            assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")==before_progress
            if i==0:
                page.evaluate("pastIdx=24;choosePastAnswer(1);pastNext();choosePastAnswer(2)")
                before=page.evaluate('({keys:pastQueue.map(q=>q._planKey),answers:pastAnswers,idx:pastIdx,exposure:localStorage.getItem("md_mock_exposure_v1")})')
                page.reload(wait_until='load');page.evaluate('resumePastProgress()')
                assert page.evaluate('({keys:pastQueue.map(q=>q._planKey),answers:pastAnswers,idx:pastIdx,exposure:localStorage.getItem("md_mock_exposure_v1")})')==before
                assert page.evaluate('pastQueue.every(q=>q._balancedMock)')
                assert page.locator('[title^="기출 원문 번호:"]').inner_text()=='Q26'
        assert page.evaluate("grade=>JSON.parse(localStorage.getItem('md_mock_exposure_v1')).grades[grade]",other)==other_before
        # These gates target the previous 20-run failure (only 532/563 distinct
        # questions and a single question appearing 15/16 times).
        assert len(counts)>=650,(grade,len(counts))
        assert max(counts.values())<=6,(grade,max(counts.values()))
        assert len(english_topics)>=7,(grade,english_topics)
        report['diversity'][grade]={'papers':20,'questions_per_paper':75,'unique_questions':len(counts),
          'max_appearances_of_one_question':max(counts.values()),'adjacent_overlap':overlaps,
          'source_years':sorted(source_years),'english_topics':sorted(english_topics)}
        report['cases'].append(f'{grade}: 20 papers without completing them, no overlap with the last three, grade-scoped exposure and exact resume')
    # Submit with 74 unanswered questions: scoring and paper history are separate.
    saved_exposure=page.evaluate("localStorage.getItem('md_mock_exposure_v1')")
    page.evaluate("pastIdx=0;choosePastAnswer(pastQueue[0]['정답']);pastIdx=pastQueue.length-1;pastNext()")
    page.wait_for_selector('#md-predictive-analysis')
    assert '실전 모의고사 결과' in page.locator('#app').inner_text()
    assert '4점' in page.locator('#md-predictive-analysis').inner_text()
    assert page.evaluate("localStorage.getItem('md_mock_exposure_v1')")==saved_exposure
    next_button=page.get_by_role('button',name='새 실전 모의',exact=True)
    assert next_button.get_attribute('onclick')=="startNavigatorPassPlanMock('navi3')"
    next_button.click();page.wait_for_function("currentMode==='past'&&pastQueue[0]._balancedMock")
    new_exposure=page.evaluate("JSON.parse(localStorage.getItem('md_mock_exposure_v1')).grades.navi3")
    assert new_exposure['sequence']==21
    assert not set(new_exposure['recent'][0])&set().union(*json.loads(saved_exposure)['grades']['navi3']['recent'])
    page.evaluate('renderPastResult()');page.wait_for_selector('#md-predictive-analysis')
    before_review=page.evaluate("localStorage.getItem('md_mock_exposure_v1')")
    page.evaluate('retryPastSessionWrongs()')
    assert page.evaluate("pastMode==='study'&&pastQueue.every(q=>q._predictiveReview)")
    assert page.evaluate("localStorage.getItem('md_mock_exposure_v1')")==before_review
    report['cases'].append('blank submission is scored, result starts another balanced paper, and wrong-answer review never creates exposure')
    assert not report['page_errors'],report['page_errors']
    report['status']='PASS';browser.close()
finally:
    (OUT/'balanced-mock.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2));server.shutdown()
