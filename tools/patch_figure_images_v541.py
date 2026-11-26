"""Show restored question figures under the stem (v5.41). Safe to rerun."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
text = path.read_text(encoding='utf-8-sig')
original = text
CALL = "${window.__mdFigureImages?window.__mdFigureImages.html(q):''}"
ANCHORS = [
    # paper / mock card
    """<div style="font-size:16px;line-height:1.7;color:var(--text);margin-bottom:16px;white-space:pre-wrap">${escapeHtml(q['문제'])}</div>""",
    # mock result review
    """<div style="font-size:15px;line-height:1.65;font-weight:700;color:var(--text);margin-bottom:10px">${escapeHtml(q['문제']||'')}</div>""",
    # pass-plan homework card
    """<div style="font-size:16px;line-height:1.7;margin-bottom:16px;white-space:pre-wrap">${escapeHtml(q['문제'])}</div>""",
]
# v5.47 wraps English stems for word meanings; the figure call stays right after the stem.
POPUP_STEM = "${(window.MDEnglishWordPopup?window.MDEnglishWordPopup.html(q,q['문제']):escapeHtml(q['문제']))}"
for anchor in ANCHORS:
    if text.count(anchor + CALL) == 1:
        continue
    if text.count(anchor.replace("${escapeHtml(q['문제'])}", POPUP_STEM) + CALL) == 1:
        continue
    if text.count(anchor) != 1:
        raise SystemExit('figure anchor not found exactly once: ' + anchor[:80])
    text = text.replace(anchor, anchor + CALL)
if text != original:
    path.write_text(text, encoding='utf-8')
print('question figures integrated')
