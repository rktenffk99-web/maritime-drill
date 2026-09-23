"""Fresh-browser smoke tests. No Google sign-in or existing user profile is used."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'browser-test-results'
OUT.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'cases': [], 'page_errors': [], 'google_login_tested': False}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None, args=['--no-sandbox','--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        # Keep app tests local; never send progress, reports, or authentication requests.
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='load')
        agree = page.get_by_role('button', name='동의합니다', exact=True)
        # First-run agreement is opened by a timer after load; await it explicitly.
        agree.wait_for(state='visible')
        agree.click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        assert page.evaluate('APP_VERSION') == '5.17'
        assert 'v5.17' in page.title()
        report['cases'].append('v5.17 startup and auxiliary scripts loaded')
        page.evaluate("renderNavigatorPassPlan('navi3')")
        wait_plan(page, configure=True)
        target = (date.today() + timedelta(days=30)).isoformat()
        for grade in ('navi2', 'navi3'):
            page.locator(f'#pp-enable-{grade}').check()
            page.locator(f'#pp-date-{grade}').fill(target)
            for field in page.locator(f'input[data-pp-subject="{grade}"]').all():
                field.set_checked(field.input_value() == '영어')
        page.locator('#pp-daily-cap').fill('40')
        page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
        wait_plan(page)
        for grade in ('navi2', 'navi3'):
            wait_plan(page, tab='mock')
            page.locator(f'''[onclick="startNavigatorPredictiveMock('{grade}')"]''').click()
            page.wait_for_function("currentMode==='past' && pastQueue.length>0")
            assert page.evaluate('pastQueue.length') == 25
            answer = page.evaluate("pastQueue[0]['정답']")
            page.locator(f'[onclick="choosePastAnswer({answer})"]').click()
            # Use real Next/Submit controls: mock mode permits unanswered items.
            for _ in range(25):
                page.locator('[onclick="pastNext()"]').click()
            page.wait_for_selector('#md-predictive-analysis')
            text = page.locator('#md-predictive-analysis').inner_text()
            assert '4점' in text and '무응답 24' in text and '정답률 100%' in text, text
            report['cases'].append(f'{grade}: actual 25-question mock, 1 correct + 24 unanswered renders 4 points / 100% answered accuracy')
            page.screenshot(path=str(OUT / f'{grade}-results.png'), full_page=True)
            page.evaluate(f"renderNavigatorPassPlan('{grade}')")
            wait_plan(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click()
        page.wait_for_function("currentMode==='pass-plan-session'")
        page.locator('[onclick="chooseNavigatorPassPlanAnswer(0)"]').click()
        page.locator('[onclick="nextNavigatorPassPlanQuestion()"]').click()
        before = page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")
        assert before and before != '{}'
        page.reload(wait_until='load')
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')") == before
        page.evaluate("renderNavigatorPassPlan('navi3')")
        wait_plan(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click()
        page.wait_for_function("currentMode==='pass-plan-session'")
        report['cases'].append('homework answer/next, refresh persistence and resume')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUT / 'mobile-homework.png'), full_page=True)
        report['mobile_overflow_pixels'] = page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')
        report['cases'].append('mobile-width homework renders')
        assert not report['page_errors'], report['page_errors']
        browser.close()
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
