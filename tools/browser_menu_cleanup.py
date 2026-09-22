"""Exercise reorganized menus, non-destructive navigation and backup/restore in Chromium."""
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
origin=f'http://127.0.0.1:{server.server_port}/'
report={'cases':[],'page_errors':[],'google_login_tested':False}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=context.new_page();page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
        page.on('dialog',lambda d:d.accept())
        page.goto(origin,wait_until='load');page.get_by_role('button',name='동의합니다',exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        assert page.evaluate('APP_VERSION')=='5.14'
        assert page.locator('#md-settings-button').count()==1
        assert not page.get_by_role('button',name='전체 백업 저장',exact=True).count()
        assert not page.get_by_role('button',name='제작자의 말',exact=True).count()
        assert page.evaluate("['exportData','importData','resetAll'].every(k=>typeof window[k]==='undefined')")
        page.evaluate("localStorage.setItem('md_ui_test_record',JSON.stringify({answer:2,keep:'before-backup'}))")
        page.locator('#md-settings-button').click()
        page.locator('#md-backup-settings > summary').click()
        with page.expect_download() as downloaded:
            page.get_by_role('button',name='전체 백업 저장',exact=True).click()
        backup=json.loads(Path(downloaded.value.path()).read_text())
        assert json.loads(backup['items']['md_ui_test_record'])['keep']=='before-backup'
        assert 'maritime-drill:drive-auth:v1' not in backup['items']
        assert 'md_drive_sync_state_v1' not in backup['items']
        page.evaluate("localStorage.setItem('md_ui_test_record',JSON.stringify({answer:3,keep:'before-import'}))")
        with page.expect_file_chooser() as chooser:
            page.get_by_role('button',name='백업 불러오기',exact=True).click()
        chooser.value.set_files({'name':'menu-backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
        page.get_by_role('button',name='확인',exact=True).click()
        page.wait_for_function("JSON.parse(localStorage.getItem('md_ui_test_record')).keep==='before-backup' && !!document.getElementById('md-settings-button')")
        page.locator('#md-settings-button').click()
        page.locator('#md-backup-settings > summary').click()
        page.locator('#md-backup-settings details > summary').click()
        page.get_by_role('button',name='이전 상태로 되돌리기',exact=True).click()
        page.get_by_role('button',name='확인',exact=True).click()
        page.wait_for_function("JSON.parse(localStorage.getItem('md_ui_test_record')).keep==='before-import' && !!document.getElementById('md-settings-button')")
        report['cases'].append('settings exports a real backup, imports it, and restores the pre-import state without leaking credentials')

        page.evaluate("renderNavigatorPassPlan('navi3')")
        wait_plan(page,configure=True)
        for grade in ('navi2','navi3'):
            page.locator(f'#pp-enable-{grade}').check()
            page.locator(f'#pp-date-{grade}').fill((date.today()+timedelta(days=3)).isoformat())
            for field in page.locator(f'input[data-pp-subject="{grade}"]').all():field.set_checked(field.input_value()=='영어')
        page.locator('#pp-daily-cap').fill('40')
        page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
        wait_plan(page)
        assert not page.locator('#md-plan-settings').evaluate('(el)=>el.open')
        assert page.locator('[onclick="startNavigatorPassPlanToday()"]').is_visible()
        assert not page.locator('[onclick="resetNavigatorPassPlanProgress()"]').count()
        assert not page.locator('[onclick="recalculateNavigatorPassPlanToday()"]').count()
        before=page.evaluate('collectBackupItems()')
        for tab in ('review','mock','records','today'):
            wait_plan(page,tab=tab)
            assert page.locator('[data-md-plan-panel]:visible').count()==1
            assert page.locator(f'[data-md-plan-tab="{tab}"]').get_attribute('aria-pressed')=='true'
            assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')==0
            if tab=='mock':
                assert page.locator('button[onclick^="startNavigatorPredictiveMock("]:visible').count()==2
                assert page.locator('button[onclick^="startNavigatorPassPlanMock("]:visible').count()==2
            page.screenshot(path=str(OUT/f'v514-mobile-{tab}.png'),full_page=True)
        assert page.evaluate('collectBackupItems()')==before
        report['cases'].append('all four menus fit mobile, retain both mock formats and leave learning data byte-for-byte unchanged')

        wait_plan(page,configure=True)
        page.locator('#pp-daily-cap').fill('45')
        wait_plan(page,tab='review')
        wait_plan(page)
        assert page.locator('#pp-daily-cap').input_value()=='45'
        page.locator('#md-settings-button').click()
        assert page.locator('#md-advanced-settings').count()==1
        assert not page.get_by_role('button',name='합격 플랜 진도 초기화',exact=True).is_visible()
        page.locator('#md-advanced-settings > summary').click()
        page.get_by_role('button',name='합격 플랜 진도 초기화',exact=True).click()
        page.get_by_role('button',name='취소',exact=True).click()
        assert page.evaluate('collectBackupItems()')==before
        report['cases'].append('switching menus preserves unsaved settings, and cancelling advanced reset preserves all records')

        page.locator('#md-plan-settings > summary').click()
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click()
        page.wait_for_function("currentMode==='pass-plan-session'")
        checkpoint=page.evaluate("localStorage.getItem('md_pass_plan_session_checkpoint_v2')")
        page.locator('#md-settings-button').click()
        assert not page.locator('#md-advanced-settings').count()
        page.locator('#md-display-settings > summary').click()
        page.locator('#md-reading-toggle').click()
        page.locator('#md-reading-toggle').click()
        page.get_by_role('button',name='닫기',exact=True).click()
        assert page.evaluate('currentMode')=='pass-plan-session'
        assert page.evaluate("localStorage.getItem('md_pass_plan_session_checkpoint_v2')")==checkpoint
        report['cases'].append('opening display settings and toggling reading during a question preserves the current session')

        page.evaluate("renderNavigatorPassPlan('navi3')");wait_plan(page)
        assert '이어서' in page.locator('[onclick="startNavigatorPassPlanToday()"]').inner_text()
        assert not page.locator('#md-resume-banner').count()
        page.locator('#md-settings-button').click()
        page.locator('#md-backup-settings > summary').click()
        page.screenshot(path=str(OUT/'v514-mobile-settings.png'),full_page=True)
        assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')==0
        page.get_by_role('button',name='닫기',exact=True).click()
        page.set_viewport_size({'width':1440,'height':1000})
        page.screenshot(path=str(OUT/'v514-desktop-today.png'),full_page=True)
        report['cases'].append('the homework page has one resume control and settings fit the mobile viewport')
        assert not report['page_errors'],report['page_errors']
        report['status']='PASS';browser.close()
except Exception as error:
    report['status']='FAIL';report['error']=str(error);raise
finally:
    (OUT/'menu-cleanup-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2));server.shutdown()
