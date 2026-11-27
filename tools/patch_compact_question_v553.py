"""Compact past-exam question screen (v5.53). Safe to rerun; runs after the other patches.

- "자동 저장됨" status shows only when saving failed.
- The unified-mock hint and the keyboard-shortcut line are removed (already known).
- Less top padding; the app-wide Drive status text is hidden on a question screen
  and the settings button sits at the end of the question header row
  (the red unsynced-answers banner from drive-auth.js still shows).
"""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text(encoding='utf-8-sig')

PAIRS = [
    # header row: less space above and below
    ('<div style="padding-top:20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">\n      <button class="btn btn-outline" style="width:auto;font-size:13px;padding:8px 12px;display:inline-flex;align-items:center;gap:5px" onclick="goBackFromPastSession()">',
     '<div style="padding-top:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">\n      <button class="btn btn-outline" style="width:auto;font-size:13px;padding:6px 10px;display:inline-flex;align-items:center;gap:5px" onclick="goBackFromPastSession()">'),
    # saved status: only a failure is worth a line
    ('<div role="status" data-past-save-status style="font-size:12px;margin-bottom:10px;color:${progressSaved?\'#047857\':\'#B91C1C\'}">',
     '<div role="status" data-past-save-status style="font-size:12px;margin-bottom:10px;color:${progressSaved?\'#047857\':\'#B91C1C\'}${progressSaved?\';display:none\':\'\'}">'),
    # Keep the texts (earlier patches anchor on them) but hide them.
    ("'<p style=\"font-size:12px;color:#475569;margin:6px 0 12px\">원할 때 0 키",
     "'<p hidden style=\"font-size:12px;color:#475569;margin:6px 0 12px\">원할 때 0 키"),
    ("""    <div style="margin-top:10px;text-align:center;font-size:11px;color:var(--textMuted)">
      단축키: <b>1~4</b> 답 선택""",
     """    <div hidden style="margin-top:10px;text-align:center;font-size:11px;color:var(--textMuted)">
      단축키: <b>1~4</b> 답 선택"""),
]
changed = False
for old, new in PAIRS:
    if old in text:
        text = text.replace(old, new, 1)
        changed = True
    elif new in text:
        continue
    else:
        raise SystemExit('compact question anchor not found: ' + old[:70])

CSS_ID = 'md-compact-question-v553'
css = f"""<style id="{CSS_ID}">
/* v5.53 compact question screen */
body.md-question-mode #md-app-toolbar{{height:0;padding:0!important;position:relative;overflow:visible;z-index:5}}
body.md-question-mode #md-sync-summary{{display:none}}
body.md-question-mode #md-settings-button{{position:absolute;right:16px;top:6px;min-height:0!important;padding:6px 9px!important;font-size:12px}}
body.md-question-mode #app>div:first-child{{padding-right:72px}}
@media (max-width:480px){{body.md-question-mode #md-settings-button{{font-size:0!important;padding:6px!important}}body.md-question-mode #app>div:first-child{{padding-right:38px;gap:6px}}body.md-question-mode #app>div:first-child>button:first-child{{padding:6px 8px!important;font-size:12px!important}}body.md-question-mode #app>div:first-child>div{{gap:4px!important}}body.md-question-mode #app>div:first-child button[onclick="togglePastMark()"]{{padding:4px 6px!important}}body.md-question-mode #md-report-btn{{padding:5px 7px!important;font-size:11px!important}}}}
body.md-question-mode #app .card{{padding:14px 16px;margin-bottom:10px}}
body.md-question-mode #app .card .tag{{padding:2px 8px;font-size:11px}}
body.md-question-mode #app button[onclick^="choosePastAnswer"]{{padding:10px 12px!important}}
body.md-question-mode #md-report-btn{{padding:6px 9px!important;font-size:12px!important;margin-left:0!important;min-height:0!important;height:auto!important}}
body.md-question-mode #md-report-list-btn{{padding:6px 9px!important;font-size:12px!important;min-height:0!important;height:auto!important}}
</style>"""
if CSS_ID not in text:
    anchor = '</head>'
    if text.count(anchor) != 1:
        raise SystemExit('</head> anchor missing')
    text = text.replace(anchor, css + '\n' + anchor, 1)
    changed = True
if changed:
    path.write_text(text, encoding='utf-8')
print('compact question screen applied')
