"""Real Chromium quota/migration regression with both grades and every subject."""
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
report={'cases':[],'page_errors':[]}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1440,'height':1000})
        origin=f'http://127.0.0.1:{server.server_port}/'
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=context.new_page();page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
        # Expose the real pool calculation only in the test response, to recreate
        # exactly the old redundant payload without committing a large fixture.
        html=(ROOT/'index.html').read_text()
        anchor='  window.renderNavigatorPassPlanResult=function(){'
        assert anchor in html
        hook="""  window.__dailyStorageFixture=function(){
          const today=ppDateKey(new Date()),plan=ppLoadPlan(),progress=ppLoadProgress();
          const assignment=JSON.parse(localStorage.getItem(DAILY_KEY))[today];
          return {today,assignment:{...assignment,phases:Object.fromEntries(PLAN_GRADES.map(g=>[g,ppPhaseForGrade(plan,g,planPools[g]||[],progress,today)]))}};
        };
"""
        html=html.replace(anchor,hook+anchor,1)
        page.route(origin,lambda r:r.fulfill(status=200,content_type='text/html',body=html))
        page.goto(origin,wait_until='load');page.get_by_role('button',name='동의합니다',exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        assert page.evaluate('APP_VERSION')=='5.14'
        page.evaluate("renderNavigatorPassPlan('navi3')")
        wait_plan(page, configure=True)
        for g in ('navi2','navi3'):
            page.locator(f'#pp-enable-{g}').check()
            page.locator(f'#pp-date-{g}').fill((date.today()+timedelta(days=10)).isoformat())
            for field in page.locator(f'input[data-pp-subject="{g}"]').all():field.check()
        page.locator('#pp-daily-cap').fill('250')
        page.evaluate('saveNavigatorPassPlanSettings()')
        assert page.locator('#md-storage-warning').count()==0
        report['new_daily_characters']=page.evaluate("localStorage.getItem('md_nav23_pass_daily_v1').length")
        assert report['new_daily_characters']<20000
        assert page.evaluate("!!JSON.parse(localStorage.getItem('md_drive_sync_state_v1')).itemMeta.md_nav23_pass_daily_v1")
        report['cases'].append('both grades, all subjects and maximum daily quota save without a storage warning')
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click();page.wait_for_function("currentMode==='pass-plan-session'")
        page.locator('[onclick="chooseNavigatorPassPlanAnswer(0)"]').click()
        unsure=page.locator('''[onclick="setNavigatorPassPlanConfidence('unsure')"]''')
        if unsure.is_visible():unsure.click()
        page.locator('[onclick="nextNavigatorPassPlanQuestion()"]').click()
        saved=page.evaluate("({progress:localStorage.getItem('md_nav23_pass_progress_v1'),checkpoint:localStorage.getItem('md_pass_plan_session_checkpoint_v2')})")
        page.evaluate("renderNavigatorPassPlan('navi3')")
        legacy=page.evaluate("""()=>{
          const k='md_nav23_pass_daily_v1',fixture=__dailyStorageFixture(),raw=JSON.stringify({[fixture.today]:fixture.assignment});
          const point={app:'Maritime Drill',schemaVersion:1,exportedAt:'2026-09-20T03:00:00Z',reason:'before-sync',items:{...collectBackupItems(),[k]:raw}};
          localStorage.setItem(k,raw);localStorage.setItem('md_restore_point_v1',JSON.stringify(point));
          // Fill the actual browser quota, rather than just throwing a mock error.
          let low=0,high=6*1024*1024;
          while(low<high){const mid=Math.ceil((low+high)/2);try{localStorage.setItem('storage-test-filler','x'.repeat(mid));low=mid}catch(e){if(e.name!=='QuotaExceededError')throw e;high=mid-1}}
          let error=null;try{localStorage.setItem(k,JSON.stringify({[fixture.today]:fixture.assignment,'2020-01-01':fixture.assignment}))}catch(e){error=e.name}
          return {characters:raw.length,error,filler:low,keys:fixture.assignment.keys};
        }""")
        report['legacy_daily_characters']=legacy['characters'];report['reproduced_error']=legacy['error']
        assert legacy['error']=='QuotaExceededError'
        report['cases'].append('old duplicated source pools reproduce QuotaExceededError with real browser storage')
        page.reload(wait_until='load')
        page.wait_for_function("(localStorage.getItem('md_nav23_pass_daily_v1')||'').length<20000")
        after=page.evaluate("({progress:localStorage.getItem('md_nav23_pass_progress_v1'),checkpoint:localStorage.getItem('md_pass_plan_session_checkpoint_v2')})")
        assert after==saved
        assert page.evaluate("localStorage.getItem('storage-test-filler').length")==legacy['filler']
        point=page.evaluate("JSON.parse(localStorage.getItem('md_restore_point_v1'))")
        assert point['items']['md_nav23_pass_progress_v1']==saved['progress']
        assert point['items']['md_pass_plan_session_checkpoint_v2']==saved['checkpoint']
        assert point['exportedAt']=='2026-09-20T03:00:00Z'
        assert len(point['items']['md_nav23_pass_daily_v1'])<20000
        assert page.evaluate("Object.values(JSON.parse(localStorage.getItem('md_nav23_pass_daily_v1')))[0].keys")==legacy['keys']
        report['cases'].append('startup shrinks a full legacy cache and restore point while preserving progress, checkpoint and unrelated data byte for byte')
        page.evaluate("renderNavigatorPassPlan('navi3')")
        page.locator('[onclick="startNavigatorPassPlanToday()"]').click();page.wait_for_function("currentMode==='pass-plan-session'")
        resumed=page.evaluate("JSON.parse(localStorage.getItem('md_pass_plan_session_checkpoint_v2'))")
        before=json.loads(saved['checkpoint'])
        for field in ('queueKeys','answers','confidence','nextIndex'):assert resumed[field]==before[field],field
        assert page.locator('#md-storage-warning').count()==0
        report['cases'].append('the same homework queue, answers and current position resume after migration')
        page.evaluate("renderNavigatorPassPlan('navi3')")
        # If a browser still refuses a write, do not display the success toast.
        old_daily=page.evaluate("localStorage.getItem('md_nav23_pass_daily_v1')")
        page.evaluate("""()=>{window.__storageTestToasts=[];showToast=m=>__storageTestToasts.push(m);const save=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='md_nav23_pass_daily_v1')throw new DOMException('full','QuotaExceededError');return save.call(this,k,v)}}""")
        page.evaluate('saveNavigatorPassPlanSettings()')
        assert '저장 공간이 가득' in page.locator('#md-storage-warning').inner_text()
        assert not any('설정을 저장했습니다' in m for m in page.evaluate('__storageTestToasts'))
        assert page.evaluate("localStorage.getItem('md_nav23_pass_daily_v1')")==old_daily
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")==saved['progress']
        report['cases'].append('failed saving keeps the old data, reports the quota cause and never shows a success toast')
        assert not report['page_errors'],report['page_errors']
        report['status']='PASS';browser.close()
except Exception as error:
    report['status']='FAIL';report['error']=str(error);raise
finally:
    (OUT/'daily-storage-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2));server.shutdown()
