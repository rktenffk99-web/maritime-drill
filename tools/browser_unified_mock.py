"""Exercise the unified mock exam and its learning/recovery boundary in a real browser."""
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
subjects = ['항해', '운용', '법규', '영어', '상선전문']


def snapshot(page):
    return page.evaluate("""() => ({
      keys:pastQueue.map(q=>q._planKey), answers:pastAnswers.slice(), idx:pastIdx,
      flags:pastQueue.map(q=>[q._unifiedMock===true,q._balancedMock===true,
        q._predictiveMock===true,q._evaluationMock===true]),
      exposure:localStorage.getItem('md_mock_exposure_v1'),
      learning:localStorage.getItem('md_nav23_pass_progress_v1')})""")


def assert_no_live_explanation(page):
    # All mock exams offer an optional explanation, but none starts disclosed.
    page.evaluate('window.__mdMockExplanationControls.mount()')
    assert page.locator('#md-mock-explanation-toggle:visible').count() == 1
    assert page.locator('#md-mock-explanation-panel:visible').count() == 0
    assert page.locator('.md-mock-correct-answer:visible').count() == 0


try:
    with TemporaryDirectory(prefix='md-unified-profile-') as profile, sync_playwright() as pw:
        def launch():
            context = pw.chromium.launch_persistent_context(
                profile, headless=True,
                executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
                viewport={'width': 390, 'height': 844},
                args=['--no-sandbox', '--disable-dev-shm-usage'])
            context.route('**/*', lambda route: route.continue_()
                          if route.request.url.startswith(origin) else route.abort())
            page = context.pages[0]
            page.set_default_timeout(60000)
            page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
            page.goto(origin, wait_until='load', timeout=60000)
            page.wait_for_function("window.__MD_BOOTED__===true")
            return context, page

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
        start = page.get_by_role('button', name='모의시험 시작', exact=True)
        assert start.count() == 1
        assert page.locator('#md-plan-panel-mock button[onclick^="startNavigatorPassPlanMock("]').count() == 0
        assert page.locator('#md-plan-panel-mock button[onclick^="startNavigatorEvaluationMock("]').count() == 0
        assert page.locator('#md-plan-panel-mock button[onclick^="startNavigatorPredictiveMock("]').count() == 0
        assert page.locator('#md-plan-panel-mock button[onclick^="startNavigatorTargetedPractice("]').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.wait_for_function("!document.getElementById('_appToast')||document.getElementById('_appToast').style.opacity==='0'")
        page.screenshot(path=str(OUT / 'unified-mock-menu.png'), full_page=True)
        report['cases'].append('one unified mock action is visible for the enabled grade, with no legacy or targeted actions in the mock tab')

        legacy = {'navi2': [{'id': 'legacy-grade', 'score': 48, 'total': 125}],
                  'navi2|항해:25': [{'id': 'legacy-evaluation', 'score': 72, 'total': 25}]}
        page.evaluate("value=>localStorage.setItem('md_evaluation_score_history_v1',JSON.stringify(value))", legacy)
        start.click()
        page.wait_for_function("currentMode==='past'&&pastQueue.length===125&&pastQueue.every(q=>q._unifiedMock)")
        assert page.evaluate("pastQueue.map(q=>q['과목'])") == [s for s in subjects for _ in range(25)]
        assert page.evaluate('pastQueue.every(q=>q._balancedMock&&q._predictiveMock&&!q._evaluationMock)')
        assert len(set(page.evaluate('pastQueue.map(q=>q._planKey)'))) == 125
        assert_no_live_explanation(page)
        before_learning = page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")
        first_key = page.evaluate('pastQueue[0]._planKey')
        first_id = page.evaluate('pqid(pastQueue[0])')

        for i in range(50):
            if i % 10 == 0:
                print(f'unified: answering {i}/50', flush=True)
            if i == 25:
                context.set_offline(True)
            choice = page.evaluate("i=>i===0?(pastQueue[i]['정답']+1)%4:pastQueue[i]['정답']", i)
            page.locator(f'[onclick="choosePastAnswer({choice})"]').click()
            page.locator('[onclick="pastNext()"]').click()
        expected = snapshot(page)
        assert expected['idx'] == 50
        assert sum(answer is not None for answer in expected['answers']) == 50
        assert expected['learning'] == before_learning
        assert_no_live_explanation(page)
        context.close()
        print('unified: browser closed offline, reopening saved paper', flush=True)
        context, page = launch()
        resume = page.locator('[data-past-resume] button[onclick^="resumePastProgress("]').first
        resume.wait_for(state='visible')
        assert '50/125' in page.locator('[data-past-resume]').inner_text()
        assert page.locator('#app').evaluate("el=>el.firstElementChild.hasAttribute('data-past-resume')")
        page.screenshot(path=str(OUT / 'unified-mock-resume.png'), full_page=True)
        resume.click()
        page.wait_for_function("currentMode==='past'&&pastIdx===50")
        assert snapshot(page) == expected
        assert_no_live_explanation(page)
        report['cases'].append('125 ordered unique questions; 50 UI answers survive offline browser shutdown with exact paper, flags, cursor and unchanged learning')

        page.get_by_role('button', name='저장하고 나가기', exact=True).click()
        wait_plan(page, tab='mock')
        page.get_by_role('button', name='모의시험 시작', exact=True).click()
        page.wait_for_function("currentMode==='past'&&pastIdx===0")
        page.get_by_role('button', name='저장하고 나가기', exact=True).click()
        wait_plan(page, tab='mock')
        assert page.evaluate('__mdExamSessions.list().some(s=>s.state.idx===50)')
        expected['exposure'] = page.evaluate("localStorage.getItem('md_mock_exposure_v1')")
        page.locator('[data-past-resume]').filter(has_text='50/125').locator('button').click()
        page.wait_for_function("currentMode==='past'&&pastIdx===50")
        assert snapshot(page) == expected
        assert_no_live_explanation(page)
        report['cases'].append('pause and independent-new-exam keep all answers and the no-help examination mode')

        # The first 50 answers exercised real controls. Complete the remaining
        # known-correct fixture without spending another 75 full renders.
        page.evaluate("""()=>{pastAnswers=pastQueue.map((q,i)=>i<50?pastAnswers[i]:q['정답']);
          pastIdx=pastQueue.length-1;renderPastCard();pastNext()}""")
        page.wait_for_selector('#md-predictive-analysis')
        assert '모의시험 결과' in page.locator('#app').inner_text()
        assert '124 / 125' in page.locator('#app').inner_text()
        assert '99' in page.locator('#md-predictive-analysis').inner_text()
        scores = page.evaluate("JSON.parse(localStorage.getItem('md_evaluation_score_history_v1'))")
        for key, rows in legacy.items():
            assert scores[key] == rows
        new_keys = [key for key in scores if key.startswith('unified-v1|navi2|')]
        assert len(new_keys) == 1, scores
        assert len(scores[new_keys[0]]) == 1
        assert scores[new_keys[0]][0]['score'] == 99
        wrong = page.evaluate("key=>JSON.parse(localStorage.getItem('md_nav23_pass_progress_v1'))[key]", first_key)
        assert wrong['wrong'] == 1 and wrong['status'] == 'weak', wrong
        assert page.evaluate("id=>!!loadPastWrongs()[id]", first_id)
        page.locator('#md-past-review-slot .md-past-review-question').wait_for()
        assert '정답:' in page.locator('#md-past-review-slot').inner_text()
        assert page.locator('#md-past-review-slot .md-past-review-question').count() == 1
        learning_after = page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")
        scores_after = page.evaluate("localStorage.getItem('md_evaluation_score_history_v1')")
        page.evaluate("()=>{renderPastResult();document.getElementById('md-predictive-analysis')?.remove()}")
        page.wait_for_selector('#md-predictive-analysis')
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')") == learning_after
        assert page.evaluate("localStorage.getItem('md_evaluation_score_history_v1')") == scores_after
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(OUT / 'unified-mock-result.png'), full_page=True)
        report['cases'].append('submission reveals explanations, saves one independent score, updates the wrong answer for review once, and preserves old evaluation histories')

        page.evaluate("renderNavigatorPassPlan('navi2')")
        wait_plan(page, tab='review')
        target = page.locator('#md-plan-panel-review button[onclick^="startNavigatorTargetedPractice("]')
        assert target.count() == 1
        assert '빈출·취약 집중 연습' in target.inner_text()
        assert target.locator('xpath=ancestor::*[@id="md-plan-panel-review"]').count() == 1
        page.screenshot(path=str(OUT / 'unified-mock-review.png'), full_page=True)
        target.click()
        page.wait_for_function("currentMode==='past'&&pastQueue.length===125&&pastQueue.every(q=>q._predictiveMock&&!q._unifiedMock)")
        page.locator('#md-mock-explanation-toggle').wait_for(state='visible')
        page.locator('#md-mock-explanation-toggle').click()
        assert page.locator('#md-mock-explanation-panel').is_visible()
        assert page.evaluate("localStorage.getItem('md_evaluation_score_history_v1')") == scores_after
        report['cases'].append('targeted practice lives in review, permits explanations and leaves the unified score history unchanged')

        # A separate explanation-assisted paper must leave the independent
        # 99-point score above intact, including after pause and recovery.
        page.get_by_role('button', name='저장하고 나가기', exact=True).click()
        wait_plan(page, tab='mock')
        page.get_by_role('button', name='모의시험 시작', exact=True).click()
        page.wait_for_function("currentMode==='past'&&pastQueue.length===125&&pastQueue.every(q=>q._unifiedMock)")
        hint_button = page.locator('#md-mock-explanation-toggle')
        hint_panel = page.locator('#md-mock-explanation-panel')
        hint_button.wait_for(state='visible')
        assert hint_button.inner_text() == '해설 보기 (0)'
        assert hint_panel.is_hidden()
        assert_no_live_explanation(page)

        choice = page.evaluate("pastQueue[0]['정답']")
        page.locator(f'[onclick="choosePastAnswer({choice})"]').click()
        before_hint = snapshot(page)
        hint_storage = page.evaluate("localStorage.getItem(__mdExamSessions.PREFIX+pastProgressId)")
        page.evaluate("window.__mdHintTestOriginalSavePastProgress=savePastProgress;savePastProgress=()=>false")
        try:
            page.keyboard.press('0')
            assert hint_panel.is_hidden(), 'the explanation must stay closed when its usage record cannot be saved'
            assert hint_button.inner_text() == '해설 보기 (0)'
            assert page.evaluate('pastQueue[0]._mockHintViewed!==true')
            assert snapshot(page) == before_hint
            assert page.evaluate("localStorage.getItem(__mdExamSessions.PREFIX+pastProgressId)") == hint_storage
        finally:
            page.evaluate("savePastProgress=window.__mdHintTestOriginalSavePastProgress;delete window.__mdHintTestOriginalSavePastProgress")
        report['cases'].append('failed checkpoint keeps the full solution closed with unchanged answers and durable paper')
        page.wait_for_function("!document.getElementById('_appToast')||document.getElementById('_appToast').style.opacity==='0'")
        page.keyboard.press('0')
        hint_panel.wait_for(state='visible')
        assert hint_button.inner_text() == '해설 닫기 (0)'
        assert '정답' in hint_panel.inner_text(), 'requested explanation must reveal the actual answer'
        assert snapshot(page) == before_hint, 'viewing an explanation must preserve the selected answer, cursor and learning'
        assert page.evaluate('pastQueue[0]._mockHintViewed===true')
        assert page.evaluate('pastQueue[0]._unifiedExplanationViewed===true')
        assert page.evaluate('getPastProgress().state.hintedIndices') == [0]
        page.screenshot(path=str(OUT / 'unified-mock-explanation.png'), full_page=True)

        page.keyboard.press('0')
        hint_panel.wait_for(state='hidden')
        assert hint_button.inner_text() == '해설 보기 (0)'
        assert page.evaluate('getPastProgress().state.hintedIndices') == [0], 'closing an explanation must not erase assistance'
        page.keyboard.press('Numpad0')
        hint_panel.wait_for(state='visible')
        assert snapshot(page) == before_hint
        page.locator('[onclick="pastNext()"]').click()
        page.wait_for_function('pastIdx===1')
        hint_button.wait_for(state='visible')
        assert hint_panel.is_hidden(), 'the next question must start with its explanation closed'
        assert hint_button.inner_text() == '해설 보기 (0)'
        assert page.evaluate('pastQueue.map((q,i)=>q._mockHintViewed===true?i:-1).filter(i=>i>=0)') == [0]
        assert_no_live_explanation(page)
        report['cases'].append('0 and Numpad0 toggle the answer and full explanation without answer or learning changes; next question starts closed')

        hinted_expected = snapshot(page)
        page.reload(wait_until='load', timeout=60000)
        page.wait_for_function('window.__MD_BOOTED__===true')
        resume = page.locator('[data-past-resume] button[onclick^="resumePastProgress("]').first
        resume.wait_for(state='visible')
        assert page.evaluate('getPastProgress().state.hintedIndices') == [0]
        resume.click()
        page.wait_for_function("currentMode==='past'&&pastIdx===1")
        hint_button.wait_for(state='visible')
        assert snapshot(page) == hinted_expected
        assert page.evaluate('pastQueue.map((q,i)=>q._mockHintViewed===true?i:-1).filter(i=>i>=0)') == [0]
        assert hint_panel.is_hidden()
        page.locator('[onclick="pastIdx--;renderPastCard()"]').click()
        page.wait_for_function('pastIdx===0')
        hint_button.wait_for(state='visible')
        assert hint_panel.is_hidden(), 'a previously assisted question must not reveal its explanation automatically on resume'
        assert page.evaluate('pastQueue[0]._mockHintViewed===true')
        assert_no_live_explanation(page)
        report['cases'].append('refresh and resume preserve the exact paper, answer and assisted question indices; solutions start closed')

        # Fill the remaining fixture with correct answers. Assistance must
        # exclude this 100-point paper from independent score averages even
        # after a reload; the earlier unassisted paper remains the only run.
        page.evaluate("""()=>{pastAnswers=pastQueue.map(q=>q['정답']);
          pastIdx=pastQueue.length-1;renderPastCard();pastNext()}""")
        page.wait_for_selector('#md-predictive-analysis')
        assert '125 / 125' in page.locator('#app').inner_text()
        summary = page.evaluate('window.__mdWeakTopicAnalytics.unifiedSummary(pastQueue,pastAnswers,false)')
        assert summary['score'] == 100 and summary['complete'], summary
        assert summary['explanationViewed'], 'a restored explanation-assisted paper must remain marked as assisted'
        assert summary['recentCount'] == 1 and summary['recentAverage'] == 99, summary
        assert '제외' in page.locator('[data-unified-score-summary]').inner_text()
        assert page.evaluate("localStorage.getItem('md_evaluation_score_history_v1')") == scores_after
        assert page.locator('#md-mock-explanation-toggle:visible').count() == 0
        assert page.locator('#md-mock-explanation-panel:visible').count() == 0
        report['cases'].append('completed explanation-assisted 100-point paper excluded from recent averages after recovery; prior scores preserved')
        assert not report['page_errors'], report['page_errors']
        context.close()
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (OUT / 'unified-mock.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
