"""Hold real paper downloads and verify launch/navigation isolation in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import os
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'browser-test-results'
OUT.mkdir(exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
report = {'cases': [], 'page_errors': []}

try:
    with TemporaryDirectory(prefix='md-start-v535-') as profile, sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(
            profile, headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
            viewport={'width': 390, 'height': 844},
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        context.route('**/*', lambda route: route.continue_()
                      if route.request.url.startswith(origin) else route.abort())
        page = context.pages[0]
        page.set_default_timeout(60000)
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.goto(origin, wait_until='load')
        page.get_by_role('button', name='동의합니다', exact=True).click()
        assert page.evaluate('!!window.__mdExamStartGuard')
        selected = page.evaluate("""async()=>{
          await ensurePastDataForSubject('navi3');
          const paper=getPastExamsByBase('navi3','상선').sort((a,b)=>b.meta.year-a.meta.year||b.meta.session-a.meta.session)[0];
          if(!paper)throw new Error('test fixture: no navi3 paper');
          pastVariant='상선';renderPastRunner('navi3','navi3',paper.meta.year,paper.meta.session);
          return {year:paper.meta.year,session:paper.meta.session};
        }""")
        page.evaluate("""()=>{
          window.__testOriginalExplain=ensurePastExplainForYears;
          ensurePastExplainForYears=async years=>{
            await new Promise(resolve=>{window.__testReleaseExplain=resolve});
            return window.__testOriginalExplain(years);
          };
        }""")
        page.locator('[onclick="startPastSession(\'mock\',\'all\')"]').click()
        page.wait_for_function("currentMode==='past-loading'&&typeof window.__testReleaseExplain==='function'")
        assert page.evaluate('__mdExamStartGuard.isPending()')
        page.evaluate("()=>{startPastSession('study','all');resumePastProgress();renderSubjectSelect();pickPrepType('engi5')}")
        assert page.evaluate("currentMode==='past-loading'&&pastSubjectId==='navi3'&&pastBaseShort==='navi3'")
        page.keyboard.press('1')
        page.keyboard.press('ArrowRight')
        assert page.evaluate('__mdExamSessions.list().length') == 0
        page.evaluate('window.__testReleaseExplain()')
        page.wait_for_function("currentMode==='past'&&!__mdExamStartGuard.isPending()")
        assert page.evaluate('__mdExamSessions.list().length') == 1
        assert page.evaluate("paper=>pastQueue.length>0&&pastQueue.every(q=>q._year===paper.year&&q['회차']===paper.session&&q._short==='navi3')", selected)
        assert page.evaluate('pastIdx===0&&pastAnswers.every(a=>a===null)')
        page.screenshot(path=str(OUT / 'v535-exam-start-success.png'), full_page=True)
        report['cases'].append('delayed real paper load blocks duplicate creation/resume, home/licence changes and answer keys; finishes one exact unanswered paper')

        page.get_by_role('button', name='저장하고 나가기', exact=True).click()
        page.wait_for_function("currentMode==='past-menu'")
        page.evaluate("()=>{ensurePastExplainForYears=async()=>{throw new Error('test: download unavailable')}}")
        page.locator('[onclick="startPastSession(\'mock\',\'all\')"]').click()
        page.wait_for_function("currentMode==='past-start-error'&&!__mdExamStartGuard.isPending()")
        assert 'test: download unavailable' in page.locator('#app').inner_text()
        assert page.evaluate('__mdExamSessions.list().length') == 1
        page.screenshot(path=str(OUT / 'v535-exam-start-error.png'), full_page=True)
        page.get_by_role('button', name='시험 목록으로', exact=True).click()
        page.wait_for_function("currentMode==='select'")
        page.evaluate('()=>{ensurePastExplainForYears=window.__testOriginalExplain}')
        page.locator('[data-past-resume] button').first.click()
        page.wait_for_function("currentMode==='past'&&!__mdExamStartGuard.isPending()")
        assert page.evaluate('__mdExamSessions.list().length') == 1
        report['cases'].append('rejected download displays escaped error and usable menu action; existing paper survives and resumes')
        assert not report['page_errors'], report['page_errors']
        report['status'] = 'PASS'
        context.close()
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    try:
        report['screen'] = page.evaluate("({mode:currentMode,pending:window.__mdExamStartGuard?.isPending(),text:document.getElementById('app')?.innerText?.slice(0,3000)})")
    except Exception:
        pass
    raise
finally:
    (OUT / 'v535-exam-start-guard.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    server.shutdown()
