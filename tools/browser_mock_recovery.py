"""Exercise 50-answer mock recovery in a real, isolated persistent browser."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import os
import threading
from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'browser-test-results'
OUT.mkdir(exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
report = {'cases': [], 'page_errors': []}


def snapshot(page):
    return page.evaluate("""() => ({ids:pastQueue.map(pqid),answers:pastAnswers.slice(),idx:pastIdx,
      exposure:localStorage.getItem('md_mock_exposure_v1'),
      evaluation:localStorage.getItem('md_evaluation_mock_exposure_v1'),
      learning:localStorage.getItem('md_nav23_pass_progress_v1')})""")


try:
    with TemporaryDirectory(prefix='md-mock-profile-') as profile, sync_playwright() as pw:
        def launch():
            ctx = pw.chromium.launch_persistent_context(
                profile, headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
                viewport={'width': 390, 'height': 844}, args=['--no-sandbox', '--disable-dev-shm-usage'])
            ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            page = ctx.pages[0]
            page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
            page.goto(origin, wait_until='load')
            return ctx, page

        context, page = launch()
        page.get_by_role('button', name='동의합니다', exact=True).click()
        page.evaluate("renderNavigatorPassPlan('navi2')")
        wait_plan(page, configure=True)
        page.locator('#pp-enable-navi2').check()
        page.locator('#pp-enable-navi3').uncheck()
        page.locator('#pp-date-navi2').fill((date.today()+timedelta(days=30)).isoformat())
        for field in page.locator('input[data-pp-subject="navi2"]').all():
            field.check()
        page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
        wait_plan(page, tab='mock')

        for name in ['startNavigatorPassPlanMock', 'startNavigatorPredictiveMock', 'startNavigatorEvaluationMock']:
            print(name+': starting', flush=True)
            page.evaluate("name => {window[name]('navi2')}", name)
            if page.get_by_role('button', name='기존 답안 대신 새 시험 시작', exact=True).is_visible():
                page.get_by_role('button', name='기존 답안 대신 새 시험 시작', exact=True).click()
            page.wait_for_function("currentMode==='past' && pastQueue.length===125")
            for i in range(50):
                if i%10==0:
                    print(name+': answering '+str(i), flush=True)
                if i == 25:
                    context.set_offline(True)
                page.locator(f'[onclick="choosePastAnswer({i%4})"]').click()
                page.locator('[onclick="pastNext()"]').click()
            expected = snapshot(page)
            assert expected['idx'] == 50 and sum(a is not None for a in expected['answers']) == 50
            assert '자동 저장됨' in page.locator('[data-past-save-status]').inner_text()
            # Close the complete browser while offline, then restart its profile.
            context.close()
            print(name+': closed offline; restarting', flush=True)
            context, page = launch()
            page.get_by_role('button', name='모의고사 이어서 풀기', exact=True).wait_for()
            page.get_by_role('button', name='모의고사 이어서 풀기', exact=True).click()
            page.wait_for_function("currentMode==='past' && pastIdx===50")
            assert snapshot(page) == expected, name
            print(name+': full browser restart restored 50 answers', flush=True)
            page.reload(wait_until='load')
            page.get_by_role('button', name='모의고사 이어서 풀기', exact=True).click()
            page.wait_for_function("currentMode==='past' && pastIdx===50")
            assert snapshot(page) == expected
            print(name+': refresh restored 50 answers', flush=True)
            report['cases'].append(f'{name}: 50/125 answers, offline answering, full browser restart, reload, exact paper/answers/cursor')
            # Real stop and replacement controls must preserve the paper on cancel.
            page.get_by_role('button', name='저장하고 나가기', exact=True).click()
            wait_plan(page, tab='mock')
            assert page.locator('[data-past-resume]').count() == 1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if name == 'startNavigatorEvaluationMock':
                page.screenshot(path=str(OUT / 'mock-resume-mobile.png'), full_page=True)
            page.evaluate("name => {window[name]('navi2')}", name)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if name == 'startNavigatorEvaluationMock':
                page.screenshot(path=str(OUT / 'mock-replace-mobile.png'), full_page=True)
            page.get_by_role('button', name='취소', exact=True).click()
            assert page.evaluate('getPastProgress().state.idx') == 50
            page.get_by_role('button', name='모의고사 이어서 풀기', exact=True).click()
            page.wait_for_function("currentMode==='past' && pastIdx===50")
            assert snapshot(page) == expected
            report['cases'].append(f'{name}: stopping and cancelling replacement retains all 50 answers')
            page.evaluate('goBackFromPastSession()')
            wait_plan(page, tab='mock')

        # Force a storage error; do not display success or erase the last checkpoint.
        page.get_by_role('button', name='모의고사 이어서 풀기', exact=True).click()
        page.wait_for_function("currentMode==='past'")
        prior = page.evaluate("localStorage.getItem('md_past_checkpoint_v2')")
        page.evaluate("() => {window.__testSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}}")
        page.locator('[onclick="choosePastAnswer(2)"]').click()
        assert '저장 실패' in page.locator('[data-past-save-status]').inner_text()
        assert page.evaluate("localStorage.getItem('md_past_checkpoint_v2')") == prior
        page.get_by_role('button', name='저장하고 나가기', exact=True).click()
        assert page.evaluate("currentMode==='past'")
        page.evaluate("() => {Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true})}")
        with page.expect_download() as download_info:
            page.get_by_role('button', name='답안 파일 백업', exact=True).click()
        backup = json.loads(Path(download_info.value.path()).read_text())
        exported = json.loads(backup['items']['md_past_checkpoint_v2'])
        assert exported['state']['answers'][50] == 2
        assert sum(a is not None for a in exported['state']['answers']) == 51
        assert page.evaluate("localStorage.getItem('md_past_checkpoint_v2')") == prior
        page.evaluate('() => {Storage.prototype.setItem=window.__testSetItem}')
        page.get_by_role('button', name='다시 저장', exact=True).click()
        assert '자동 저장됨' in page.locator('[data-past-save-status]').inner_text()
        report['cases'].append('quota failure blocks exit, preserves the checkpoint, exports all 51 live answers and retries successfully')
        assert not report['page_errors'], report['page_errors']
        context.close()
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (OUT / 'mock-recovery.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
