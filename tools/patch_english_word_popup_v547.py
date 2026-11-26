"""Tap/hover English word meanings in past-exam and pass-plan cards (v5.47). Safe to rerun."""
import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text(encoding='utf-8-sig')

def W(x):
    return "${(window.MDEnglishWordPopup?window.MDEnglishWordPopup.html(q," + x + "):escapeHtml(" + x + "))}"

FIG = "${window.__mdFigureImages?window.__mdFigureImages.html(q):''}"
HINT = "${window.MDEnglishWordPopup?window.MDEnglishWordPopup.hint(q):''}"
STEM_PAST = '<div style="font-size:16px;line-height:1.7;color:var(--text);margin-bottom:16px;white-space:pre-wrap">'
STEM_PLAN = '<div style="font-size:16px;line-height:1.7;margin-bottom:16px;white-space:pre-wrap">'
PAIRS = [
    (STEM_PAST + "${escapeHtml(q['문제'])}</div>" + FIG, STEM_PAST + W("q['문제']") + "</div>" + FIG + HINT),
    (STEM_PLAN + "${escapeHtml(q['문제'])}</div>" + FIG, STEM_PLAN + W("q['문제']") + "</div>" + FIG + HINT),
    ('<span style="font-weight:800;margin-right:8px">${optMarkers[i]}</span>${escapeHtml(pastChoiceText(opt))}',
     '<span style="font-weight:800;margin-right:8px">${optMarkers[i]}</span>' + W('pastChoiceText(opt)')),
    ('<b style="margin-right:8px">${markers[displayIdx]}</b>${escapeHtml(pastChoiceText(opt))}',
     '<b style="margin-right:8px">${markers[displayIdx]}</b>' + W('pastChoiceText(opt)')),
]
for old, new in PAIRS:
    if text.count(new) == 1:
        continue
    if text.count(old) != 1:
        raise SystemExit('english word popup anchor not found exactly once: ' + old[:80])
    text = text.replace(old, new)

text = re.sub(r'<script src="english-word-popup\.js\?v=[^"]+"></script>\n?', '', text)
anchor = re.search(r'<script src="english-word-study\.js\?v=[^"]+"></script>', text)
if not anchor:
    raise SystemExit('english-word-study.js loader missing')
# Same release stamp as the other loaders (patch_mock_answer_access.py checks it).
version = re.search(r"const APP_VERSION = '([^']+)'", text).group(1)
text = text[:anchor.end()] + f'\n<script src="english-word-popup.js?v={version}"></script>' + text[anchor.end():]
path.write_text(text, encoding='utf-8')
print('english word popup integrated')
