"""Browser regression for the SVG visual explanation layer."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'browser-test-results'
OUT.mkdir(exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'cases':[],'page_errors':[]}

def set_case(page, question, choices, feedback=None, explanation=None):
    page.evaluate(
        """([question,choices,feedback,explanation])=>{
          const root=document.getElementById('app');
          root.innerHTML='';
          const card=document.createElement('div');card.className='card';
          const q=document.createElement('div');q.textContent=question;q.style.fontWeight='800';card.appendChild(q);
          choices.forEach((text,i)=>{const b=document.createElement('button');b.textContent=text;b.setAttribute('onclick','chooseAnswer('+i+')');card.appendChild(b)});
          if(feedback!==null){const f=document.createElement('div');f.textContent=feedback;card.appendChild(f)}
          if(explanation!==null){const e=document.createElement('div');e.innerHTML='<b>해설</b><div>'+explanation+'</div>';card.appendChild(e)}
          root.appendChild(card);
        }""",
        [question,choices,feedback,explanation]
    )

try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(
            headless=True,
            executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
            args=['--no-sandbox','--disable-dev-shm-usage']
        )
        context=browser.new_context(viewport={'width':390,'height':844})
        origin=f'http://127.0.0.1:{server.server_port}/'
        context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=context.new_page()
        page.on('pageerror',lambda e:report['page_errors'].append(str(e)))
        page.goto(origin,wait_until='load')
        page.get_by_role('button',name='동의합니다',exact=True).click()
        page.wait_for_function("hasAgreedTerms() && !document.getElementById('md-modal-wrap')")
        page.wait_for_function("window.__mdVisualExplanationsV1===true")

        question='국제해상충돌방지규칙상 항행 중 가장 잘 보이는 곳에 수직으로 둥근꼴 2개를 표시하여야 하는 선박은?'
        choices=['㉠ 조종불능선','㉡ 예인선열의 길이가 200미터를 초과할 때의 피예인선','㉢ 흘수제약선','㉣ 그물을 끌고 있는 어선']
        set_case(page,question,choices)
        page.wait_for_timeout(100)
        assert page.locator('#md-visual-explanation').count()==0
        report['cases'].append('visual answer is hidden before grading')

        set_case(page,question,choices,'오답 · 정답 ㉠','조종불능선은 둥근꼴 2개를 수직으로 표시한다.')
        page.wait_for_selector('#md-visual-explanation')
        text=page.locator('#md-visual-explanation').inner_text()
        assert '조종불능선 (NUC)' in text,text
        assert '공 2개' in text,text
        assert page.locator('#md-visual-explanation svg').count()==1
        assert page.locator('#md-visual-explanation svg circle').count()>=4
        assert page.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)')==0
        page.screenshot(path=str(OUT/'visual-nuc-mobile.png'),full_page=True)
        report['cases'].append('NUC example renders inline SVG and memory cue without mobile overflow')

        set_case(
            page,
            '주간에 공-마름모-공을 수직으로 표시하는 선박은?',
            ['㉠ 조종불능선','㉡ 운전제한선','㉢ 흘수제약선','㉣ 정박선'],
            '오답 · 정답 ㉡',
            '운전제한선은 공-마름모-공을 수직으로 표시한다.'
        )
        page.evaluate("document.dispatchEvent(new MouseEvent('click',{bubbles:true}))")
        page.wait_for_function("""()=>{
          const el=document.getElementById('md-visual-explanation');
          return el && el.textContent.includes('운전제한선 (RAM)');
        }""")
        assert '공-마름모-공' in page.locator('#md-visual-explanation').inner_text()
        report['cases'].append('RAM example renders a second vessel-state SVG')

        assert not report['page_errors'],report['page_errors']
        report['status']='PASS'
        browser.close()
except Exception as error:
    report['status']='FAIL'
    report['error']=str(error)
    raise
finally:
    (OUT/'visual-explanations-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    server.shutdown()
