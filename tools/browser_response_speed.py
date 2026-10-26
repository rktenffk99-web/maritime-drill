"""Measure actual key-to-paint response and immediate mock checkpoints in isolation."""
import argparse
from datetime import date, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import statistics
import threading

from playwright.sync_api import sync_playwright
from browser_navigation_helpers import wait_plan

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--report', type=Path)
parser.add_argument('--measure-only', action='store_true')
args = parser.parse_args()
out = args.report or args.root / 'browser-test-results' / 'response-speed.json'
out.parent.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *values):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(args.root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
report = {'cases': [], 'page_errors': [], 'timings': {}}


def summary(values):
    ordered = sorted(values)
    return {'count': len(values), 'median_ms': round(statistics.median(values), 2),
            'p95_ms': round(ordered[max(0, int(len(ordered) * .95 + .999) - 1)], 2),
            'max_ms': round(max(values), 2)}


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True,
            executable_path=os.environ.get('MD_BROWSER_EXECUTABLE') or None,
            args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.route('**/*', lambda route: route.continue_()
                      if route.request.url.startswith(origin) else route.abort())
        # Register before the app's capture handlers, so the timer includes the
        # synchronous handler, observers, layout and the following paint frame.
        context.add_init_script("""(() => {
          window.__responseInputs = [];
          addEventListener('keydown', event => {
            if (typeof currentMode === 'undefined' || currentMode !== 'past' ||
                !['0','1','2','3','4','ArrowRight'].includes(event.key)) return;
            const started = performance.now(), key = event.key;
            requestAnimationFrame(() => requestAnimationFrame(() => {
              window.__responseInputs.push({key, ms: performance.now() - started});
            }));
          }, true);
        })()""")
        page = context.new_page()
        page.set_default_timeout(60000)
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.goto(origin, wait_until='load')
        page.get_by_role('button', name='동의합니다', exact=True).click()
        page.evaluate("renderNavigatorPassPlan('navi2')")
        wait_plan(page, configure=True)
        page.locator('#pp-enable-navi2').check()
        page.locator('#pp-enable-navi3').uncheck()
        page.locator('#pp-date-navi2').fill((date.today() + timedelta(days=30)).isoformat())
        for field in page.locator('input[data-pp-subject="navi2"]').all():
            field.check()
        page.locator('[onclick="saveNavigatorPassPlanSettings()"]').click()
        wait_plan(page, tab='mock')
        page.evaluate("""() => {
          let seed=20261026;
          Math.random=()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;
            let value=Math.imul(seed^(seed>>>15),1|seed);
            value=(value+Math.imul(value^(value>>>7),61|value))^value;
            return ((value^(value>>>14))>>>0)/4294967296;};
        }""")
        page.get_by_role('button', name='모의시험 시작', exact=True).click()
        page.wait_for_function("currentMode==='past'&&pastQueue.length===125&&window.__mdMockHintControls")
        report['paper_keys'] = page.evaluate('pastQueue.map(q=>q._planKey)')
        print('response: 125-question paper ready', flush=True)
        page.evaluate("""() => {
          window.__responseFunctions = {};
          window.__responseDurabilityErrors = [];
          for (const name of ['mdGuardPastQueue', 'savePastProgress', 'renderPastCard']) {
            const original = window[name];
            window[name] = function(...args) {
              const started = performance.now();
              try { return original.apply(this, args); }
              finally {
                (window.__responseFunctions[name] ||= []).push(performance.now()-started);
                if(name==='savePastProgress' && currentMode==='past') {
                  const saved=JSON.parse(localStorage.getItem('md_past_checkpoint_v2'));
                  if(saved?.state.idx!==pastIdx ||
                    JSON.stringify(saved?.state.answers)!==JSON.stringify(pastAnswers) ||
                    JSON.stringify(saved?.state.hintedIndices)!==JSON.stringify(
                      pastQueue.flatMap((q,i)=>q._mockHintViewed?[i]:[])))
                    window.__responseDurabilityErrors.push({idx:pastIdx, name});
                }
              }
            };
          }
          document.activeElement?.blur();
        }""")
        learning_before = page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')")

        def measure(label):
            page.evaluate("window.__responseInputs=[];window.__responseFunctions={};document.activeElement?.blur()")
            for i, key in enumerate(['1','ArrowRight','2','ArrowRight','3','ArrowRight',
                                      '4','ArrowRight','1','ArrowRight','2','ArrowRight','0','0']):
                page.keyboard.press(key)
                page.wait_for_function('count=>window.__responseInputs.length>=count', arg=i+1)
                # Every action must already be saved, without waiting for a
                # timer, blur, navigation, or a background network connection.
                assert page.evaluate("""() => {
                  const saved=JSON.parse(localStorage.getItem('md_past_checkpoint_v2'));
                  return saved.state.idx===pastIdx &&
                    JSON.stringify(saved.state.answers)===JSON.stringify(pastAnswers) &&
                    JSON.stringify(saved.state.hintedIndices)===JSON.stringify(
                      pastQueue.flatMap((q,i)=>q._mockHintViewed?[i]:[]));
                }"""), f'{label}: immediate checkpoint after {key}'
            values = page.evaluate('({inputs:window.__responseInputs, functions:window.__responseFunctions})')
            assert page.evaluate('window.__responseDurabilityErrors') == [], \
                f'{label}: checkpoint was not durable when savePastProgress returned'
            measured = {'key_to_paint': summary([row['ms'] for row in values['inputs']]),
                        'functions': {name: summary(times) for name,times in values['functions'].items()},
                        'keys': values['inputs']}
            report['timings'][label] = measured
            print(json.dumps({label: {k:v for k,v in measured.items() if k!='keys'}}, ensure_ascii=False), flush=True)
            if not args.measure_only:
                # Broad budgets catch the original ~0.8 s full-paper correction
                # on each key without depending on a particular CI CPU speed.
                assert measured['key_to_paint']['median_ms'] < 250, measured
                assert measured['functions']['mdGuardPastQueue']['p95_ms'] < 150, measured
                assert measured['functions']['savePastProgress']['p95_ms'] < 200, measured

        measure('normal_metadata')
        page.evaluate("""() => {
          const state=driveSyncLoadState(), fields={};
          const updatedAt='2026-01-01T00:00:00.000Z';
          for(let i=0;i<3000;i++)for(let j=0;j<10;j++)
            fields['question-'+i+'/field-'+j]={updatedAt,deleted:false};
          state.itemMeta={...state.itemMeta,
            md_nav23_pass_progress_v1:{updatedAt,deleted:false,fields,history:{}}};
          if(!driveSyncSaveState(state))throw new Error('metadata fixture could not be saved');
        }""")
        measure('30000_unrelated_clock_fields')
        assert page.evaluate("localStorage.getItem('md_nav23_pass_progress_v1')") == learning_before
        assert page.evaluate("Object.keys(driveSyncLoadState().itemMeta.md_nav23_pass_progress_v1.fields).length") == 30000
        report['cases'].append('real 1–4, next and 0 key input retains immediate atomic answers and per-question hint flags')
        report['cases'].append('30,000 unrelated clock fields retain every record while mock responses stay within the latency budget')
        assert not report['page_errors'], report['page_errors']
        report['status'] = 'MEASURED' if args.measure_only else 'PASS'
        browser.close()
finally:
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    server.shutdown()
