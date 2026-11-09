"""Real question-card pronunciation regressions in a fresh, offline profile."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'browser-test-results'
OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}/'
report={'pageErrors':[],'cases':[],'network':'local app only','profile':'fresh isolated; no user data'}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1440,'height':1000})
        context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
        page=context.new_page()
        page.add_init_script("localStorage.setItem('md_terms_agreed_v1',JSON.stringify({agreed:true,at:'2026-01-01T00:00:00Z',v:'test-fixture'}))")
        page.set_default_timeout(60000)
        page.on('pageerror',lambda error:report['pageErrors'].append(str(error)))
        page.goto(origin,wait_until='load')
        # Seed the isolated fixture's existing state; do not accept legal terms.
        page.evaluate("localStorage.setItem('pronunciation_test_preserve','existing-history-sentinel')")
        page.evaluate('''async()=>{
          await ensurePastDataForSubject('navi2');await ensurePastDataForSubject('navi3');
          await ensurePastExplainForYears([2020,2021,2022,2023,2024,2025,2026]);
        }''')
        report['corpus']=page.evaluate('''()=>{
          const before=JSON.stringify(MD_PAST),explains=JSON.stringify(MD_EXPLAIN),storage=JSON.stringify({...localStorage});
          let questions=0,rows=0,unknown=0;
          for(const [id,paper] of Object.entries(MD_PAST)){
            if(!/^20\\d\\d-navi[23]-\\d+$/.test(id))continue;
            const [year,grade,session]=id.split('-');
            for(const source of paper.questions){
              if(source['과목']!=='영어')continue;
              const q={...source,_year:Number(year),_short:grade,_session:Number(session)};
              const html=MDEnglishWordStudy.supplement(q),host=document.createElement('div');host.innerHTML=html;
              const expected=[q['문제'],...q['선택지']].reduce((n,s)=>n+new Set(MDEnglishWordStudy.tokens(s).map(w=>w.toLowerCase())).size,0);
              if(host.querySelectorAll('tbody tr').length!==expected)throw Error(id+' missing rows');
              if(/발음 미등록|단어 뜻 미등록/.test(host.textContent))throw Error(id+' missing word');
              unknown+=(host.textContent.match(/발음: 발음 미확정/g)||[]).length;
              questions++;rows+=expected;
            }
          }
          if(before!==JSON.stringify(MD_PAST)||explains!==JSON.stringify(MD_EXPLAIN)||storage!==JSON.stringify({...localStorage}))throw Error('source or learning storage mutated by rendering');
          return {questions,rows,unconfirmedRows:unknown,questionsAnswersExplanationsAndStorageUnchanged:true};
        }''')
        assert report['corpus']['questions']==1225,report['corpus']
        report['sourceGuard']=page.evaluate('''()=>{
          const q={...MD_PAST['2021-navi2-1'].questions.find(q=>q['과목']==='영어'&&Number(q['번호'])===23),_year:2021,_short:'navi2',_session:1};
          return {issue:mdQuestionContentIssue(q),reviewedPronunciation:MDEnglishWordStudy.supplement(q).includes('/ˈnɔɹ/')};
        }''')
        assert report['sourceGuard']=={'issue':'밑줄 위치 확인 필요','reviewedPronunciation':True}
        # The NOR source lacks its underline, so it must remain excluded by the
        # app guard. Test its supplement without weakening the production guard.
        fixtures=[('navi3',2024,2,14,'/ɪnˈvælɪd/'),('navi2',2022,2,9,'동사 /ˈjuz/'),('navi3',2022,2,8,'동사 /ˈkloʊz/'),('navi3',2021,3,21,'형용사 /ˈsɛpɚət/'),('navi3',2025,2,23,'명사·형용사 /ˈæbstɹækt/'),('navi2',2020,2,11,'완벽한 형용사 /ˈpɝfɛkt/'),('navi2',2021,3,19,'기록 명사 복수형 /ˈɹɛkɚdz/'),('navi3',2020,4,24,'운송 명사 /ˈtɹænspɔɹt/'),('navi3',2025,3,2,'saint의 축약형 /ˈseɪnt/')]
        for grade,year,session,number,expected in fixtures:
            page.evaluate('''({grade,year,session,number})=>{
              const paper=MD_PAST[`${year}-${grade}-${session}`];
              const source=paper.questions.find(q=>q['과목']==='영어'&&Number(q['번호'])===number);
              if(!source)throw Error('missing fixture');
              const q={...source,_year:year,_short:grade,_session:session,'회차':session};
              pastSubjectId=grade;pastBaseShort=grade;pastYear=year;pastSession=session;pastVariant='상선';
              pastQueue=[q];pastIdx=0;pastAnswers=[q['정답']];pastMode='study';pastStartedAt=Date.now();currentMode='past';renderPastCard();
            }''',{'grade':grade,'year':year,'session':session,'number':number})
            assert expected in page.locator('#app').inner_text(),(grade,year,session,number,expected)
            assert 'existing-history-sentinel'==page.evaluate("localStorage.getItem('pronunciation_test_preserve')")
            if number==9:
                assert '[백스]' not in page.locator('#app').inner_text()
                assert '훗스' not in page.locator('#app').inner_text()
                assert '[훅스 포 핸들링]' in page.locator('#app').inner_text()
                assert '/ˈbæɡz/' in page.locator('#app').inner_text()
                page.get_by_text('단어별 기본 뜻·형태',exact=False).last.scroll_into_view_if_needed()
                page.screenshot(path=str(OUT/'pronunciation-desktop.png'),full_page=False)
            report['cases'].append({'grade':grade,'year':year,'session':session,'question':number,'expected':expected})
        page.set_viewport_size({'width':390,'height':844})
        page.get_by_text('단어별 기본 뜻·형태',exact=False).last.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'mobile horizontal overflow'
        page.screenshot(path=str(OUT/'pronunciation-mobile.png'),full_page=False)
        assert not report['pageErrors'],report['pageErrors']
        context.close();browser.close()
finally:
    server.shutdown()
    (OUT/'pronunciation-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
