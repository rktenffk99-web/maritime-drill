"""Exercise real 2/3-grade mock generators, numbering and saved answer identity."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'browser-test-results'
OUT.mkdir(exist_ok=True)
ALL = ['항해', '운용', '법규', '영어', '상선전문']
SELECTED = ['항해', '법규', '영어']


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'cases': [], 'page_errors': []}


def check_paper(page, subjects, label, counts=None):
    assert page.evaluate("currentMode==='past'&&pastMode==='mock'"), page.locator('#app').inner_text()
    actual = page.evaluate("pastQueue.map(q=>q['과목'])")
    assert actual == [s for s in subjects for _ in range(counts[s] if counts else 25)], (label, actual)
    assert page.evaluate('new Set(pastQueue.map(pqid)).size===pastQueue.length')
    assert page.evaluate("pastQueue.every(q=>getPastExam(q._short,q._year,q['회차']).questions.some(source=>source['과목']===q['과목']&&source['번호']===q['번호']&&source['정답']===q['정답']))")
    for idx in (0, 24, 25, len(actual) - 1):
        if idx >= len(actual):
            continue
        page.evaluate('(idx)=>{pastIdx=idx;renderPastCard()}', idx)
        assert page.locator('[title^="기출 원문 번호:"]').inner_text() == f'Q{idx+1}'
    report['cases'].append(label)


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
                                     args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        origin = f'http://127.0.0.1:{server.server_port}/'
        context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.goto(origin, wait_until='load')
        page.get_by_role('button', name='동의합니다', exact=True).click()
        page.wait_for_function("hasAgreedTerms()&&!document.getElementById('md-modal-wrap')")
        for grade in ('navi2', 'navi3'):
            page.evaluate("async grade=>{await ensurePastDataForSubject(grade);await ensureNavi3FrequencyData(grade)}", grade)
            # Select all subjects even when saved choices arrive in a different order.
            for selected in (list(reversed(ALL)), ['영어', '항해', '법규']):
                page.evaluate("""({grade,selected,target})=>{
                  const plan={grades:{navi2:{enabled:true,examDate:target,subjects:selected},navi3:{enabled:true,examDate:target,subjects:selected}}};
                  localStorage.setItem('md_nav23_pass_plan_v1',JSON.stringify(plan));
                }""", {'grade': grade, 'selected': selected, 'target': (date.today()+timedelta(days=30)).isoformat()})
                page.evaluate('(grade)=>startNavigatorPredictiveMock(grade)', grade)
                subjects = ALL if len(selected) == 5 else SELECTED
                check_paper(page, subjects, f'{grade}: predictive mock {len(subjects)*25} contiguous questions')
                if len(selected) == 3:
                    # Save a response either side of a subject boundary, then reload.
                    page.evaluate("pastIdx=24;choosePastAnswer(1);pastNext();choosePastAnswer(2)")
                    before = page.evaluate('({ids:pastQueue.map(pqid),answers:pastAnswers.slice(),idx:pastIdx})')
                    page.reload(wait_until='load')
                    page.evaluate('resumePastProgress()')
                    assert page.evaluate('({ids:pastQueue.map(pqid),answers:pastAnswers.slice(),idx:pastIdx})') == before
                    report['cases'].append(f'{grade}: reload preserves order, answers and subject boundary')
            page.evaluate('(grade)=>startNavigatorPassPlanMock(grade)', grade)
            # A fixed historical paper can contain fewer usable questions (e.g.
            # missing underlines). Keep those established exclusions and source.
            counts = page.evaluate("""()=>Object.fromEntries(['항해','법규','영어'].map(subject=>[subject,Math.min(25,getPastExamsForSession(pastBaseShort,pastYear,pastSession,pastVariant).flatMap(exam=>exam.questions).filter(q=>q['과목']===subject&&mdQuestionUsable(q)).length)]))""")
            check_paper(page, SELECTED, f'{grade}: latest-paper mock groups valid source questions', counts)
            # A single selected subject always starts at question 1.
            page.evaluate("startPastSession('mock','법규')")
            check_paper(page, ['법규'], f'{grade}: single-subject mock has 25 questions')
            page.evaluate("grade=>{pastYearPickVariant='상선';pastVariant='상선';renderPastYearPick(grade,grade)}", grade)
            for field in page.locator('.past-allyears-subj-check').all():
                field.set_checked(field.input_value() in SELECTED)
            page.evaluate("startPastAllYearsSession('mock')")
            check_paper(page, SELECTED, f'{grade}: all-years mock uses the same subject order')
            page.evaluate('(grade)=>renderPastYearPick(grade,grade)', grade)
            for field in page.locator('.past-year-check').all():
                field.set_checked(field.input_value() == '2025')
            page.evaluate("startPastYearPickSession('mock')")
            check_paper(page, ALL, f'{grade}: selected-year mock keeps all 5 subjects contiguous')
            # Frequency mock can have a different count, but still groups subjects.
            page.evaluate("async grade=>{n3aActivateGrade(grade);await ensureNavi3FrequencyData(grade);await startNavi3FrequencyPractice('filtered',null,'all','mock','list')}", grade)
            actual = page.evaluate("pastQueue.map(q=>q['과목'])")
            assert actual and actual == sorted(actual, key=ALL.index)
            report['cases'].append(f'{grade}: frequency mock groups all selected questions by subject')
        # The helper leaves source objects/numbers intact, and other grades alone.
        assert page.evaluate("""()=>{
          const rows=[{'과목':'영어','번호':7},{'과목':'항해','번호':3},{'과목':'영어','번호':2},{'과목':'법규','번호':1}];
          const before=JSON.stringify(rows),ordered=orderNavigatorMockQuestions(rows,'navi3');
          return JSON.stringify(rows)===before&&ordered[0]===rows[1]&&ordered[2]===rows[0]&&ordered[3]===rows[2]&&orderNavigatorMockQuestions(rows,'engi3')===rows;
        }""")
        assert not report['page_errors'], report['page_errors']
        browser.close()
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (OUT / 'mock-subject-order.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
