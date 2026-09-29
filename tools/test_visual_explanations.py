from pathlib import Path

visual=Path('visual-explanations.js').read_text(encoding='utf-8')
convenience=Path('convenience-controls.js').read_text(encoding='utf-8')
patch=Path('tools/patch_convenience.py').read_text(encoding='utf-8')

assert 'md-visual-explanations-loader-v1' in convenience
assert "new URL('visual-explanations.js',base).href" in convenience
assert "if(!feedback)return null; // never reveal visuals before grading" in visual
assert '<svg class="mdv-svg"' in visual
assert '<img' not in visual.lower(), 'prototype should remain offline/self-contained SVG'

for token in [
    "key:'nuc'",
    "key:'ram'",
    "key:'cbd'",
    "key:'anchor'",
    "key:'aground'",
    "key:'fishing'",
    "key:'trawling'",
    "key:'tow200'",
    "key:'sail-motor'",
    "key:'mine'",
    "key:'dredging'",
    "key:'head-on'",
    "key:'crossing'",
    "key:'overtaking'",
]:
    assert token in visual, f'missing visual rule: {token}'

assert 'visual_tag=\'<script src="visual-explanations.js"></script>\'' in patch
assert 'convenience_tag=\'<script src="convenience-controls.js"></script>\'' in patch
assert "visual_tag+'\\n'+convenience_tag" in patch

print('visual explanations regression: PASS')
