"""Isolated real-browser regression flows for v5.11. Never access a user account."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, os, threading
from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'browser-test-results';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'cases':[],'page_errors':[],'google_login_tested':False}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1365,'height':950})
        origin=f'http://127.0.0.1:{server.server_port}/'
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=context.new_page();page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
        page.goto(origin,wait_until='load');page.get_by_role('button',name='동의합니다',exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        page.evaluate("renderNavigatorPassPlan('navi3')");wait_plan(page, configure=True)
        for grade in ('navi2','navi3'):
            page.locator(f'#pp-enable-{grade}').check()
            page.locator(f'#pp-date-{grade}').fill((date.today()+timedelta(days=30)).isoformat())
            for field in page.locator(f'input[data-pp-subject="{grade}"]').all():
                field.set_checked(field.input_value()==('영어' if grade=='navi3' else '항해'))
        page.locator('#pp-daily-cap').fill('40');page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
        wait_plan(page)
        wait_plan(page, tab='mock')
        page.locator('''[onclick="startNavigatorPredictiveMock('navi3')"]''').click()
        page.wait_for_function("currentMode==='past'||document.getElementById('app').textContent.includes('모의를 시작하지 못했습니다')");assert page.evaluate("currentMode")=='past',page.locator('#app').inner_text();assert page.evaluate("pastQueue.length")==25,page.evaluate("({mode:currentMode,count:pastQueue.length,subjects:pastQueue.map(q=>q['과목'])})")
        first=page.evaluate("pastQueue[0]['정답']")
        page.locator(f'[onclick="choosePastAnswer({first})"]').click()
        page.keyboard.down('Space');page.keyboard.down('Space');page.keyboard.up('Space')
        assert page.evaluate('pastIdx')==1
        wrong=page.evaluate("(pastQueue[1]['정답']+1)%4")
        page.locator(f'[onclick="choosePastAnswer({wrong})"]').click();page.locator('[onclick="pastNext()"]').click()
        before=page.evaluate("({ids:pastQueue.map(pqid),answers:pastAnswers.slice(),idx:pastIdx})")
        page.reload(wait_until='load')
        assert page.evaluate("getPastProgress().meta.refs.every(r=>r.predictive&&r.planKey&&r.planGrade==='navi3')")
        page.evaluate('resumePastProgress()');page.wait_for_function("currentMode==='past'&&pastIdx===2")
        after=page.evaluate("({ids:pastQueue.map(pqid),answers:pastAnswers.slice(),idx:pastIdx})")
        assert before==after
        assert page.evaluate("pastQueue.every(q=>q._predictiveMock&&q._planKey&&q._planGrade==='navi3')")
        report['cases'].append('predictive mock reload restores exact question order, answers, position and grading identity')
        for _ in range(23):page.locator('[onclick="pastNext()"]').click()
        page.wait_for_selector('#md-predictive-analysis')
        assert '4점' in page.locator('#md-predictive-analysis').inner_text()
        profile=page.evaluate("JSON.parse(localStorage.getItem('md_weak_topic_profile_v1')).grades.navi3")
        assert profile['topics']
        page.evaluate("renderNavigatorPassPlan('navi2')");wait_plan(page)
        wait_plan(page, tab='mock')
        page.locator('''[onclick="startNavigatorPredictiveMock('navi2')"]''').click();page.wait_for_function("currentMode==='past'||document.getElementById('app').textContent.includes('모의를 시작하지 못했습니다')");assert page.evaluate("currentMode")=='past',page.locator('#app').inner_text();assert page.evaluate("pastQueue.length")==25,page.evaluate("({mode:currentMode,count:pastQueue.length,subjects:pastQueue.map(q=>q['과목'])})")
        for _ in range(25):
            answer=page.evaluate("pastQueue[pastIdx]['정답']")
            page.locator(f'[onclick="choosePastAnswer({answer})"]').click();page.locator('[onclick="pastNext()"]').click()
        page.wait_for_selector('#md-predictive-analysis')
        assert page.evaluate("JSON.parse(localStorage.getItem('md_weak_topic_profile_v1')).grades.navi3")==profile
        report['cases'].append('a perfect navigation mock in grade 2 preserves grade 3 English weaknesses')
        page.evaluate("renderNavigatorPassPlan('navi3')");wait_plan(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click();page.wait_for_function("currentMode==='pass-plan-session'")
        key=page.evaluate("(()=>{const cp=JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2'));return cp.queueKeys[cp.nextIndex]})()")
        answer=page.evaluate(r"""(key)=>{const card=document.querySelector('#app .card'),m=card.textContent.match(/(\d+)년 (\d+)회 Q(\d+)/),subject=card.querySelectorAll('.tag')[1].textContent;const q=getPastExam(key.split('|')[0],Number(m[1]),Number(m[2])).questions.find(q=>q['과목']===subject&&Number(q['번호'])===Number(m[3]));if(!q)throw Error('visible source question not found');return q['정답']}""",key)
        page.locator(f'[onclick="chooseNavigatorPassPlanAnswer({answer})"]').click()
        assert not page.locator('button[onclick^="setNavigatorPassPlanConfidence("]').count()
        assert page.locator('[onclick="nextNavigatorPassPlanQuestion()"]').is_enabled()
        # A real pre-update checkpoint may have a correct answer and null confidence.
        page.evaluate("""()=>{const k='md_pass_plan_session_checkpoint_v2',cp=JSON.parse(localStorage.getItem(k));cp.confidence[cp.nextIndex]=null;localStorage.setItem(k,JSON.stringify(cp))}""")
        order=page.locator('button[onclick^="chooseNavigatorPassPlanAnswer("]').evaluate_all('(els)=>els.map(e=>e.textContent)')
        page.reload(wait_until='load');page.evaluate("renderNavigatorPassPlan('navi3')");wait_plan(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click();page.wait_for_function("currentMode==='pass-plan-session'")
        assert page.locator('button[onclick^="chooseNavigatorPassPlanAnswer("]').evaluate_all('(els)=>els.map(e=>e.textContent)')==order
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(OUT/'v516-mobile-answer.png'),full_page=True)
        assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')==0
        assert page.locator('button[onclick^="chooseNavigatorPassPlanAnswer("]').first.evaluate('(el)=>getComputedStyle(el).fontFamily')==page.locator('body').evaluate('(el)=>getComputedStyle(el).fontFamily')
        page.set_viewport_size({'width':1365,'height':950})
        checkpoint=page.evaluate("localStorage.getItem('md_pass_plan_session_checkpoint_v2')")
        page.locator('#md-settings-button').click()
        page.keyboard.press('ArrowRight')
        assert page.evaluate("localStorage.getItem('md_pass_plan_session_checkpoint_v2')")==checkpoint
        page.locator('#md-modal-wrap .md-modal-close').click()
        page.locator('#md-settings-button').focus()
        page.keyboard.press('Space')
        assert not page.locator('#md-modal-wrap').count()
        assert page.evaluate("JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2')).nextIndex")==1
        record=page.evaluate('(key)=>JSON.parse(localStorage.getItem("md_nav23_pass_progress_v1"))[key]',key)
        assert record['lastOutcome']=='sure' and record['correct']>=1 and not record['mastered'],record
        page.keyboard.press('Space')
        assert page.evaluate("JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2')).nextIndex")==1
        page.keyboard.press('ArrowLeft');page.keyboard.press('Space')
        assert page.evaluate('(key)=>JSON.parse(localStorage.getItem("md_nav23_pass_progress_v1"))[key]',key)==record
        report['cases'].append('no self-rating; Space advances a legacy checkpoint exactly once, cannot skip unanswered homework or activate a focused settings button; modal keys preserve progress')
        page.evaluate('resetNavigatorPassPlanProgress()');page.get_by_role('button',name='확인',exact=True).click()
        wait_plan(page)
        assert page.evaluate("localStorage.getItem('md_pass_plan_session_checkpoint_v2')")==None
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")=='{}'
        report['cases'].append('confirmed progress reset removes the saved homework session')
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click();page.wait_for_function("currentMode==='pass-plan-session'")
        canonical=int(page.locator('button[onclick^="chooseNavigatorPassPlanAnswer("]').first.get_attribute('onclick').split('(')[1].split(')')[0])
        page.keyboard.press('Digit1')
        assert page.evaluate("JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2')).answers[0]")==canonical
        report['cases'].append('keyboard selection follows shuffled visible option order')
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')==0
        page.evaluate("""()=>{const bad=getPastExam('navi3',2024,3).questions.find(q=>q['과목']==='항해'&&q['번호']===5);pastQueue=[{...bad,_year:2024,_short:'navi3',_session:3}];pastAnswers=[null];pastIdx=0;pastMode='mock';currentMode='past';renderPastCard()}""")
        assert page.evaluate("currentMode")=='past-unavailable'
        assert '학습 진도에는 반영하지 않습니다' in page.locator('#app').inner_text()
        report['cases'].append('actual 2024 grade-3 missing-figure question is blocked without grading')
        assert not report['page_errors'],report['page_errors']
        report['status']='PASS';browser.close()
except Exception as error:
    report['status']='FAIL';report['error']=str(error);raise
finally:
    (OUT/'integrity-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2));server.shutdown()
