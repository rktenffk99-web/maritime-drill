"""Real Chromium storage/lifecycle tests; fake GIS and Drive only, no user account."""
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
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
report = {'cases': [], 'page_errors': [], 'google_login_tested': False}
remote = None
network_calls = []
gis = """
window.__oauthRequests=[];window.__revocations=0;
window.google={accounts:{oauth2:{
 initTokenClient(config){return {requestAccessToken(options){
   window.__oauthRequests.push(options);
   config.callback({access_token:'FAKE_BROWSER_TEST_TOKEN',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.appdata'});
 }}},
 hasGrantedAllScopes(response,scope){return response.scope.split(' ').includes(scope)},
 revoke(){window.__revocations++}
}}};
"""
def route_request(route):
    global remote
    req = route.request
    if req.url.startswith(origin):
        route.continue_()
    elif req.url == 'https://accounts.google.com/gsi/client':
        route.fulfill(content_type='application/javascript', body=gis)
    elif req.url.startswith('https://www.googleapis.com/'):
        network_calls.append(req.method)
        if req.method == 'PATCH':
            remote = req.post_data_json
            data = {'id': 'test-file', 'modifiedTime': remote['updatedAt']}
        elif req.method == 'POST':
            data = {'id': 'test-file'}
        elif 'alt=media' in req.url:
            data = remote
        else:
            data = {'files': [{'id': 'test-file', 'name': 'maritime-drill-progress.json', 'modifiedTime': remote['updatedAt']}] if remote else []}
        route.fulfill(content_type='application/json', body=json.dumps(data))
    else:
        route.abort()

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None, args=['--no-sandbox','--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.route('**/*', route_request)
        def new_page():
            page = context.new_page()
            page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
            page.goto(origin, wait_until='load')
            page.wait_for_function("typeof __mdDriveAuthGeneration==='function' && !!globalThis.google")
            return page
        page = new_page()
        page.get_by_role('button', name='동의합니다', exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        page.evaluate("localStorage.setItem('md_auth_test_progress', JSON.stringify({q1:'keep'}));renderDataTools()")
        page.locator('#md-drive-connect-btn').click()
        page.wait_for_function("driveSyncLoadState().enabled && !!driveSyncLoadState().lastSyncedAt && !driveSyncBusy")
        assert page.evaluate('__oauthRequests[0].prompt') == ''
        assert page.evaluate("isManagedStorageKey('maritime-drill:drive-auth:v1')") is False
        assert 'maritime-drill:drive-auth:v1' not in page.evaluate('collectBackupItems()')
        assert 'maritime-drill:drive-auth:v1' not in remote['items']
        assert page.evaluate("sessionStorage.getItem('md_drive_sync_token_session_v1')") is None
        report['cases'].append('real connect button synchronizes with mocked Google, without forced account chooser or exported credentials')
        page.close()
        page = new_page()
        assert page.evaluate('driveSyncHasToken()') is True
        assert page.evaluate('__oauthRequests.length') == 0
        assert page.evaluate("localStorage.getItem('md_auth_test_progress')") == '{"q1":"keep"}'
        report['cases'].append('closing the tab and opening a fresh tab retains the unexpired connection and learning record')
        # Expire the stored credential and run the actual interval with browser time.
        page.clock.install()
        page.evaluate("const t=JSON.parse(localStorage.getItem('maritime-drill:drive-auth:v1'));t.expiresAt=Date.now()+1000;localStorage.setItem('maritime-drill:drive-auth:v1',JSON.stringify(t))")
        # A reload clears the module's memory copy while preserving browser storage.
        page.reload(wait_until='load')
        page.wait_for_function("typeof __mdDriveAuthGeneration==='function'")
        page.clock.fast_forward(21000)
        page.locator('#md-drive-auth-banner').wait_for(state='visible')
        assert page.evaluate('__oauthRequests.length') == 0
        assert page.evaluate('driveSyncHasToken()') is False
        assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)') == 0
        page.screenshot(path=str(OUT / 'drive-auth-expired-mobile.png'), full_page=True)
        report['cases'].append('the real polling timer exposes expiry and mobile reconnect banner, with no automatic popup or horizontal overflow')
        page.locator('#md-drive-auth-banner button').click()
        page.wait_for_function('driveSyncHasToken() && !driveSyncBusy')
        assert page.locator('#md-drive-auth-banner').count() == 0
        assert page.evaluate('__oauthRequests.length') == 1
        report['cases'].append('one-click renewal removes the banner and resumes synchronization')
        second = new_page()
        assert second.evaluate('driveSyncHasToken()') is True
        page.evaluate('disconnectGoogleDriveSync()')
        second.wait_for_function('!driveSyncHasToken() && !driveSyncLoadState().enabled')
        assert page.evaluate('__revocations') == 0
        assert page.evaluate("localStorage.getItem('md_auth_test_progress')") == '{"q1":"keep"}'
        report['cases'].append('disconnect propagates between tabs without deleting learning records or revoking another device')
        assert not report['page_errors'], report['page_errors']
        browser.close()
        report['status'] = 'PASS'
except Exception as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (OUT / 'drive-auth-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
