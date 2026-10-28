"""Exercise per-exam deletion using real UI and an isolated, offline-only profile."""
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


def stored(page):
    return page.evaluate('() => Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))')


def progress(page):
    return page.evaluate('''() => ({id:pastProgressId, idx:pastIdx,
      answers:pastAnswers.slice(), questions:pastQueue.map(q=>[pqid(q),q['문제'],q['선택지'],q['정답']])})''')


def resume(page, exam_id):
    page.locator(f'[data-past-resume="{exam_id}"] button[onclick^="resumePastProgress("]').click()
    page.wait_for_function("id=>currentMode==='past'&&pastProgressId===id", arg=exam_id)


def delete(page, exam_id, accept):
    messages = []

    def answer(dialog):
        messages.append(dialog.message)
        dialog.accept() if accept else dialog.dismiss()

    page.once('dialog', answer)
    page.locator(f'[data-past-resume="{exam_id}"] .md-exam-delete').click()
    assert len(messages) == 1, 'delete must ask before changing saved answers'
    assert '성적·오답 기록은 유지' in messages[0]
    return messages[0]


try:
    with TemporaryDirectory(prefix='md-delete-v536-') as profile, sync_playwright() as pw:
        def launch():
            context = pw.chromium.launch_persistent_context(
                profile, headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
                viewport={'width': 390, 'height': 844},
                args=['--no-sandbox', '--disable-dev-shm-usage'])
            context.route('**/*', lambda route: route.continue_()
                          if route.request.url.startswith(origin) else route.abort())
            page = context.pages[0]
            page.set_default_timeout(60000)
            page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
            pending, console = set(), []
            page.on('request', lambda request: pending.add(request.url))
            page.on('requestfinished', lambda request: pending.discard(request.url))
            page.on('requestfailed', lambda request: pending.discard(request.url))
            page.on('console', lambda message: console.append(message.text)
                    if message.type in ('error', 'warning') else None)
            try:
                page.goto(origin, wait_until='load')
            except Exception:
                report['navigation'] = {'pending': sorted(pending), 'console': console[-10:]}
                report['navigation']['document'] = page.evaluate('({readyState:document.readyState,title:document.title})')
                raise
            return context, page

        context, page = launch()
        page.get_by_role('button', name='동의합니다', exact=True).click()
        assert page.evaluate('APP_VERSION') == '5.36'
        paper = page.evaluate('''async()=>{
          await ensurePastDataForSubject('navi3');
          const paper=getPastExamsByBase('navi3','상선').sort((a,b)=>b.meta.year-a.meta.year||b.meta.session-a.meta.session)[0];
          if(!paper)throw new Error('fixture: navi3 paper missing');
          return {year:paper.meta.year,session:paper.meta.session};
        }''')

        def start():
            page.evaluate('''paper=>{pastVariant='상선';renderPastRunner('navi3','navi3',paper.year,paper.session)}''', paper)
            page.locator('[onclick="startPastSession(\'mock\',\'all\')"]').click()
            page.wait_for_function("currentMode==='past'&&pastQueue.length>0")

        # Generate real grading and wrong-answer records before the two unfinished exams.
        start()
        wrong = page.evaluate("(pastQueue[0]['정답']+1)%pastQueue[0]['선택지'].length")
        page.locator(f'[onclick="choosePastAnswer({wrong})"]').click()
        page.evaluate('()=>{pastIdx=pastQueue.length-1;renderPastCard()}')
        page.get_by_role('button', name='제출', exact=True).click()
        page.wait_for_function("currentMode==='past-result'")
        assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('md_past_history_v1'))).length>0")
        assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('md_past_wrongs_v1'))).length>0")

        saved = []
        for answer in (0, 2):
            start()
            page.locator(f'[onclick="choosePastAnswer({answer})"]').click()
            page.locator('[onclick="pastNext()"]').click()
            saved.append(progress(page))
            page.get_by_role('button', name='저장하고 나가기', exact=True).click()
            page.wait_for_function("currentMode==='past-menu'")
        first, second = [item['id'] for item in saved]
        assert first != second
        prefix = page.evaluate('__mdExamSessions.PREFIX')
        first_key, second_key = prefix + first, prefix + second
        page.evaluate('renderSubjectSelect()')
        assert page.locator('[data-past-resume]').count() == 2
        assert page.locator('.md-exam-delete').count() == 2
        button = page.locator(f'[data-past-resume="{first}"] .md-exam-delete')
        assert '시험 삭제' in button.get_attribute('aria-label')
        bounds = button.bounding_box()
        assert bounds['width'] >= 40 and bounds['height'] >= 40
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        page.screenshot(path=str(OUT / 'v536-exam-delete-cards.png'), full_page=True)

        before = stored(page)
        delete(page, first, accept=False)
        assert stored(page) == before
        assert page.locator('[data-past-resume]').count() == 2
        report['cases'].append('two independent exams show labeled 40px delete controls; cancel leaves all stored bytes unchanged')

        delete(page, first, accept=True)
        page.wait_for_function('id=>getPastProgress(id)===null', arg=first)
        after = stored(page)
        assert first_key not in after
        assert page.locator(f'[data-past-resume="{first}"]').count() == 0
        assert page.locator(f'[data-past-resume="{second}"]').count() == 1
        for key, value in before.items():
            if key not in (first_key, 'md_drive_sync_state_v1', 'maritime-drill:last-exam:v3'):
                assert after.get(key) == value, f'deleting one exam changed unrelated key {key}'
        assert page.evaluate('key=>driveSyncLoadState().itemMeta[key].deleted===true', first_key)
        report['cases'].append('confirmed deletion removes only its card and answer sheet, writes a Drive tombstone, and preserves the other exam plus real grades and wrong answers byte-for-byte')

        # A durable per-exam marker commits deletion before the shared Drive mirror.
        # Fail that commit write; a failed deletion must preserve the original sheet.
        before_failure = stored(page)
        page.evaluate('''key=>{
          window.__deleteOriginalSet=driveSyncOriginalSetItem;
          driveSyncOriginalSetItem=function(target,value){
            if(String(target)===key)throw new DOMException('test deletion marker quota','QuotaExceededError');
            return window.__deleteOriginalSet.call(this,target,value);
          };
        }''', 'maritime-drill:deleted-exam:v3:' + second)
        delete(page, second, accept=True)
        assert stored(page) == before_failure
        assert page.locator(f'[data-past-resume="{second}"]').count() == 1
        assert page.evaluate('id=>getPastProgress(id)!==null', second)
        page.evaluate('()=>{driveSyncOriginalSetItem=window.__deleteOriginalSet}')
        report['cases'].append('durable deletion-marker save failure keeps the original exam, its card and all persisted storage unchanged')

        context.close()
        context, page = launch()
        assert page.locator(f'[data-past-resume="{first}"]').count() == 0
        assert page.locator(f'[data-past-resume="{second}"]').count() == 1
        assert page.evaluate('key=>driveSyncLoadState().itemMeta[key].deleted===true', first_key)
        resume(page, second)
        assert progress(page) == saved[1]
        for key in ('md_past_history_v1', 'md_past_wrongs_v1'):
            assert page.evaluate('key=>localStorage.getItem(key)', key) == before[key]
        report['cases'].append('full browser close/reopen retains deletion and resumes the untouched paper with identical answers, question order and cursor')
        assert not report['page_errors'], report['page_errors']
        report['status'] = 'PASS'
        context.close()
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    try:
        report['screen'] = page.evaluate("({mode:currentMode,text:document.getElementById('app')?.innerText?.slice(0,3000)})")
    except Exception:
        pass
    raise
finally:
    (OUT / 'v536-exam-deletion.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    server.shutdown()
