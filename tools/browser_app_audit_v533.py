"""Isolated browser audit: all exam banks, homework durability, evaluation help.

No user profile or Google session is opened. All non-local requests are blocked.
"""
import argparse
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--report', type=Path,
                    default=ROOT / 'browser-test-results' / 'app-audit-v533.json')
args = parser.parse_args()
args.report.parent.mkdir(parents=True, exist_ok=True)
report = {'cases': [], 'page_errors': [], 'licenses': [], 'google_login_tested': False}


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *values):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'


def new_context(browser):
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    context.route('**/*', lambda route: route.continue_()
                  if route.request.url.startswith(origin) else route.abort())
    return context


def open_page(context, first_run=False):
    page = context.new_page()
    page.set_default_timeout(60000)
    page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
    page.goto(origin, wait_until='load')
    if first_run:
        page.get_by_role('button', name='동의합니다', exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
    assert page.evaluate('APP_VERSION') == '5.35'
    return page


def configure_english(page):
    page.evaluate("renderNavigatorPassPlan('navi2')")
    wait_plan(page, configure=True)
    page.locator('#pp-enable-navi2').check()
    page.locator('#pp-enable-navi3').uncheck()
    page.locator('#pp-date-navi2').fill((date.today() + timedelta(days=30)).isoformat())
    for field in page.locator('input[data-pp-subject="navi2"]').all():
        field.set_checked(field.input_value() == '영어')
    page.locator('#pp-daily-cap').fill('40')
    page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
    wait_plan(page)


def audit_banks(browser):
    context = new_context(browser)
    try:
        page = open_page(context, first_run=True)
        licenses = page.evaluate('Object.keys(PAST_GRADE_MAP)')
        assert len(licenses) == 13, licenses
        for subject in licenses:
            result = page.evaluate('''async subject => {
                const exams = await ensurePastDataForSubject(subject);
                return {subject, exams: exams.length,
                    questions: exams.reduce((n, exam) => n + exam.questions.length, 0)};
            }''', subject)
            assert result['exams'] > 0 and result['questions'] > 0, result
            report['licenses'].append(result)
            print(json.dumps(result), flush=True)
        years = page.evaluate('Array.from(PAST_EXPLAIN_YEARS)')
        explanations = page.evaluate('years => ensurePastExplainForYears(years)', years)
        assert explanations['failedFiles'] == [], explanations
        report['explanation_years'] = years
        report['exam_count'] = sum(row['exams'] for row in report['licenses'])
        report['question_count'] = sum(row['questions'] for row in report['licenses'])
        report['cases'].append('all 13 license banks and every declared explanation year load without missing files')
    finally:
        context.close()


def homework_view(page):
    return page.evaluate(r'''() => ({
        mode: currentMode,
        counter: document.querySelector('#app').innerText.match(/문제\s+\d+\s*\/\s*\d+/)?.[0],
        choices: [...document.querySelectorAll('button[onclick^="chooseNavigatorPassPlanAnswer("]')]
            .map(button => ({text: button.textContent, disabled: button.disabled, style: button.getAttribute('style')}))
    })''')


def audit_homework_failure(browser):
    context = new_context(browser)
    try:
        page = open_page(context, first_run=True)
        configure_english(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click()
        page.wait_for_function("currentMode === 'pass-plan-session'")
        checkpoint_key = 'md_pass_plan_session_checkpoint_v2'
        before = page.evaluate('key => localStorage.getItem(key)', checkpoint_key)
        progress_before = page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")
        chosen = page.locator('button[onclick^="chooseNavigatorPassPlanAnswer("]').first
        answer = int(chosen.get_attribute('onclick').split('(')[1].split(')')[0])
        page.evaluate('''key => {
            window.__auditRealSet = Storage.prototype.setItem;
            Storage.prototype.setItem = function(k, value) {
                if (k === key) throw new DOMException('test quota exhausted', 'QuotaExceededError');
                return window.__auditRealSet.call(this, k, value);
            };
        }''', checkpoint_key)
        chosen.click()
        page.locator('[data-homework-save-status]').wait_for(state='visible')
        pending = homework_view(page)
        assert pending['mode'] == 'pass-plan-session' and pending['counter'].startswith('문제 1/')
        assert all(choice['disabled'] for choice in pending['choices']), pending
        assert page.evaluate('key => localStorage.getItem(key)', checkpoint_key) == before

        page.locator('[onclick="nextNavigatorPassPlanQuestion()"]').click()
        assert homework_view(page) == pending, 'failed answer save advanced or changed the live question'
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')") == progress_before
        page.get_by_role('button', name='그만', exact=True).click()
        page.get_by_role('button', name='확인', exact=True).click()
        assert homework_view(page) == pending, 'confirmed exit discarded the unsaved answer'
        # Global home navigation has no question-screen button; exercise the same
        # public function used by the app's home controls as a separate guard.
        page.evaluate('renderSubjectSelect()')
        assert homework_view(page) == pending, 'home navigation discarded the unsaved answer'
        assert page.evaluate('key => localStorage.getItem(key)', checkpoint_key) == before
        report['cases'].append('homework storage failure keeps the selected answer visible and blocks Next, confirmed exit and home before scoring')

        page.evaluate('() => { Storage.prototype.setItem = window.__auditRealSet; }')
        page.get_by_role('button', name='저장 다시 시도', exact=True).click()
        assert page.locator('[data-homework-save-status]').count() == 0
        saved = page.evaluate('key => JSON.parse(localStorage.getItem(key))', checkpoint_key)
        assert saved['nextIndex'] == 0 and saved['answers'][0] == answer, saved
        assert homework_view(page) == pending
        page.reload(wait_until='load')
        page.evaluate("renderNavigatorPassPlan('navi2')")
        wait_plan(page)
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click()
        page.wait_for_function("currentMode === 'pass-plan-session'")
        assert homework_view(page) == pending, 'retry/reload changed question, choice order or selected-answer feedback'
        restored = page.evaluate('key => JSON.parse(localStorage.getItem(key))', checkpoint_key)
        assert restored['queueKeys'] == saved['queueKeys']
        assert restored['answers'] == saved['answers'] and restored['nextIndex'] == 0
        page.locator('[onclick="nextNavigatorPassPlanQuestion()"]').click()
        advanced = page.evaluate('key => JSON.parse(localStorage.getItem(key))', checkpoint_key)
        assert advanced['nextIndex'] == 1 and advanced['answers'][0] == answer, advanced
        report['cases'].append('homework save retry and reload preserve the exact answer, question order and cursor; Next works after storage recovers')
    finally:
        context.close()


def help_state(page):
    return page.evaluate('''() => ({
        answerVisible: !document.querySelector('#md-mock-explanation-panel').hidden,
        inMemoryHelp: pastQueue[0]._evaluationExplanationViewed === true,
        savedHelp: getPastProgress(pastProgressId).state.evaluationExplanationViewed
    })''')


def resume_evaluation(context, exam_id):
    page = open_page(context)
    page.locator(f'[data-past-resume="{exam_id}"] button').click()
    page.wait_for_function("currentMode === 'past'")
    return page


def audit_evaluation_help(browser):
    context = new_context(browser)
    try:
        page = open_page(context, first_run=True)
        configure_english(page)
        # Legacy evaluation papers remain resumable even though the main menu
        # now starts unified exams; use its actual start function to cover them.
        page.evaluate("startNavigatorEvaluationMock('navi2')")
        page.wait_for_function("currentMode === 'past' && pastQueue.length === 25")
        exam_id = page.evaluate('pastProgressId')
        page.evaluate('''() => {
            Storage.prototype.setItem = function() {
                throw new DOMException('test quota exhausted', 'QuotaExceededError');
            };
        }''')
        page.locator('#md-mock-explanation-toggle').click()
        assert help_state(page) == {'answerVisible': False, 'inMemoryHelp': False, 'savedHelp': False}
        # Closing without beforeunload models force-close; any pagehide write
        # still encounters the injected failure. The next tab has normal storage.
        page.close(run_before_unload=False)
        page = resume_evaluation(context, exam_id)
        assert help_state(page) == {'answerVisible': False, 'inMemoryHelp': False, 'savedHelp': False}
        report['cases'].append('evaluation answer/explanation stays undisclosed when its help marker cannot be saved, including after force-close/reopen')

        page.locator('#md-mock-explanation-toggle').click()
        assert help_state(page) == {'answerVisible': True, 'inMemoryHelp': True, 'savedHelp': True}
        page.close(run_before_unload=False)
        page = resume_evaluation(context, exam_id)
        assert help_state(page) == {'answerVisible': False, 'inMemoryHelp': True, 'savedHelp': True}
        report['cases'].append('evaluation help is revealed after a successful retry and remains marked as assisted after reopening')
    finally:
        context.close()


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            audit_banks(browser)
            audit_homework_failure(browser)
            audit_evaluation_help(browser)
            assert not report['page_errors'], report['page_errors']
            report['status'] = 'PASS'
        finally:
            browser.close()
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    server.shutdown()
