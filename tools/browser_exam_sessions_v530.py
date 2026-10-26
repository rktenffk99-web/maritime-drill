"""Real UI regression: 50 answers, offline close/reopen, switching, hints and grading."""
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
import json, os, threading
from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'browser-test-results';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}/'
report={'cases':[],'page_errors':[]}
def snapshot(page):
    return page.evaluate('''() => ({id:pastProgressId,questions:pastQueue.map(q=>[pqid(q),q['문제'],q['선택지'],q['정답'],q._mockHintViewed===true]),answers:pastAnswers.slice(),idx:pastIdx})''')
def resume(page,id):
    page.locator(f'[data-past-resume="{id}"] button').click()
    page.wait_for_function("id=>currentMode==='past'&&pastProgressId===id",arg=id)
try:
 with TemporaryDirectory(prefix='md-v530-') as profile,sync_playwright() as pw:
    def launch():
        ctx=pw.chromium.launch_persistent_context(profile,headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,viewport={'width':390,'height':844},args=['--no-sandbox','--disable-dev-shm-usage'])
        ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
        page=ctx.pages[0];page.set_default_timeout(60000)
        page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
        page.goto(origin,wait_until='load');return ctx,page
    context,page=launch();page.get_by_role('button',name='동의합니다',exact=True).click()
    page.evaluate("renderNavigatorPassPlan('navi2')");wait_plan(page,configure=True)
    page.locator('#pp-enable-navi2').check();page.locator('#pp-enable-navi3').uncheck()
    page.locator('#pp-date-navi2').fill((date.today()+timedelta(days=30)).isoformat())
    for field in page.locator('input[data-pp-subject="navi2"]').all():field.check()
    page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click();wait_plan(page,tab='mock')
    assert page.evaluate('APP_VERSION')=='5.33'
    expected=[]
    for name in ['startNavigatorUnifiedMock','startNavigatorEvaluationMock']:
        page.evaluate('name=>window[name]("navi2")',name)
        page.wait_for_function("currentMode==='past'&&pastQueue.length===125")
        for i in range(50):
            correct=page.evaluate("pastQueue[pastIdx]['정답']")
            page.locator(f'[onclick="choosePastAnswer({correct})"]').click()
            page.locator('[onclick="pastNext()"]').click()
            if i==25:context.set_offline(True)
        expected.append(snapshot(page));assert expected[-1]['idx']==50
        before=page.evaluate("localStorage.getItem(__mdExamSessions.PREFIX+pastProgressId)")
        page.evaluate('() => {for(let i=0;i<20;i++)savePastProgress()}')
        assert page.evaluate("localStorage.getItem(__mdExamSessions.PREFIX+pastProgressId)")==before
        report['cases'].append(name+': 20 unchanged saves retain identical stored bytes and version')
        assert '자동 저장됨' in page.locator('[data-past-save-status]').inner_text()
        context.close();context,page=launch()
        resume(page,expected[-1]['id']);assert snapshot(page)==expected[-1]
        page.reload(wait_until='load');resume(page,expected[-1]['id']);assert snapshot(page)==expected[-1]
        page.get_by_role('button',name='저장하고 나가기',exact=True).click();wait_plan(page,tab='mock')
        print(name+': 50 correct answers, offline full browser close/reopen and reload PASS',flush=True)
        report['cases'].append(name+': 50/125 answers, offline full close/reopen, reload, exact content/choices/answers/cursor')
    assert page.locator('[data-past-resume]').count()==2
    for paper in expected:
        resume(page,paper['id']);assert snapshot(page)==paper
        page.get_by_role('button',name='저장하고 나가기',exact=True).click();wait_plan(page,tab='mock')
    report['cases'].append('switch between two independent papers and restore each exact paper, answers and cursor')
    page.screenshot(path=str(OUT/'v530-independent-exams.png'),full_page=True)
    # Grade the evaluation paper: exactly fifty correct, seventy-five unanswered.
    resume(page,expected[1]['id'])
    active_size=page.evaluate('localStorage.getItem(__mdExamSessions.PREFIX+pastProgressId).length')
    page.evaluate('renderPastResult()')
    page.wait_for_function("currentMode==='past-result'")
    assert '50 / 125' in page.locator('#app').inner_text()
    assert page.evaluate('id=>getPastProgress(id)===null',expected[1]['id'])
    completed=page.evaluate('id=>localStorage.getItem(__mdExamSessions.PREFIX+id)',expected[1]['id'])
    record=json.loads(completed);assert set(record['meta'])=={'id'}
    assert all(set(h['state'])=={'id','savedAt'} for h in record['heads'].values())
    assert len(completed)<active_size/20
    report['cases'].append('completed exam removes full questions/answers and shrinks by over 95%')
    assert page.evaluate('id=>getPastProgress(id)!==null',expected[0]['id'])
    page.evaluate('renderSubjectSelect()');resume(page,expected[0]['id']);assert snapshot(page)==expected[0]
    report['cases'].append('grading yields 50/125; completes only submitted paper; other paper retains all answers')
    # Hint identity is attached to the exact position and survives reopening.
    page.keyboard.press('0');page.wait_for_function('pastQueue[50]._mockHintViewed===true')
    hinted=snapshot(page);page.reload(wait_until='load');resume(page,hinted['id']);assert snapshot(page)==hinted
    report['cases'].append('0 hint stays attached to exact question after reload')
    key=page.evaluate("__mdExamSessions.PREFIX+pastProgressId")
    prior=page.evaluate('key=>localStorage.getItem(key)',key)
    page.evaluate("() => {window.__realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}}")
    page.locator('[onclick="choosePastAnswer(2)"]').click()
    assert '저장 실패' in page.locator('[data-past-save-status]').inner_text()
    assert page.evaluate('key=>localStorage.getItem(key)',key)==prior
    page.get_by_role('button',name='저장하고 나가기',exact=True).click();assert page.evaluate("currentMode==='past'")
    page.evaluate("() => {Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true})}")
    with page.expect_download() as dl:page.get_by_role('button',name='답안 파일 백업',exact=True).click()
    backup=json.loads(Path(dl.value.path()).read_text());record=json.loads(backup['items'][key])
    assert any(h['state']['answers'][50]==2 for h in record['heads'].values())
    page.evaluate('() => {Storage.prototype.setItem=window.__realSet}');page.get_by_role('button',name='다시 저장',exact=True).click()
    report['cases'].append('quota failure blocks exit, keeps durable paper, exports 51 live answers, retry saves')
    # Reproduce explicit undo after its deletion has become a remote tombstone.
    restored_expected=snapshot(page)
    page.get_by_role('button',name='저장하고 나가기',exact=True).click();wait_plan(page,tab='mock')
    page.evaluate("key => {const items=collectBackupItems();delete items[key];writeAutomaticRestorePoint(items,'test-before-exam');restoreAutomaticRestorePoint()}",key)
    page.get_by_role('button',name='확인',exact=True).click();page.wait_for_load_state('load')
    page.wait_for_function('id=>getPastProgress(id)===null',arg=restored_expected['id'])
    deletion=page.evaluate('key=>driveSyncLoadState().itemMeta[key]',key);assert deletion['deleted']
    page.evaluate('restoreAutomaticRestorePoint()');page.get_by_role('button',name='확인',exact=True).click();page.wait_for_load_state('load')
    page.wait_for_function('id=>__mdExamSessions.list().some(s=>s.meta.restoredFrom===id)',arg=restored_expected['id'])
    restored_id=page.evaluate('id=>__mdExamSessions.list().find(s=>s.meta.restoredFrom===id).meta.id',restored_expected['id'])
    assert restored_id!=restored_expected['id']
    survived=page.evaluate("({key,deletion,id})=>{const state=driveSyncLoadState();const merged=__mdDriveSyncV2.mergeSnapshots(collectBackupItems(),{},state.itemMeta,{[key]:deletion},'2000-01-01','2099-01-01');return !merged.items[key]&&!!merged.items[__mdExamSessions.PREFIX+id]}",{'key':key,'deletion':deletion,'id':restored_id})
    assert survived
    resume(page,restored_id);restored_expected['id']=restored_id;assert snapshot(page)==restored_expected
    report['cases'].append('explicit undo after deletion restores a fresh exam; stale Drive tombstone cannot delete it; 51 answers, order, cursor and hints retained')
    assert not report['page_errors'],report['page_errors'];report['status']='PASS';context.close()
except Exception as e:
 report['status']='FAIL';report['error']=str(e);raise
finally:
 (OUT/'v530-exam-sessions.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2),flush=True);server.shutdown()
