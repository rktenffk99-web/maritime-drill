"""Idempotent final UI integration, after the legacy learning generators."""
from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8-sig')
text = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '5.16';", text, count=1)
text = re.sub(r'<title>Maritime Drill v[\d.]+ · Android</title>', '<title>Maritime Drill v5.16 · Android</title>', text, count=1)
text = re.sub(r'<script src="(app-navigation|keyboard-controls|convenience-controls)\.js(?:\?v=[^"]*)?"></script>', lambda m: f'<script src="{m[1]}.js?v=5.16"></script>', text)
text = re.sub(r'(Google Drive 진도 동기화 <span[^>]*>)v[\d.]+', r'\1v${APP_VERSION}', text)
# keyboard-controls loads app-navigation once, after its dependencies.
text = re.sub(r'<script src="app-navigation\.js[^"]*"></script>\n?', '', text)
text = text.replace('시험일을 기준으로 역산하고, 빈출 → 전체 → 시험 직전 복습 순으로 자동 배정합니다.<br>정답을 맞혀도 ‘확실’ 표시가 없으면 완료되지 않으며, 다른 날 다시 맞혀야 숙달됩니다.<br>그림·밑줄 원문 확인이 필요한 문항은 자동 출제에서 제외합니다.', '시험일까지 필요한 문제를 배정합니다. 오늘 공부를 시작하거나 남은 문제를 이어서 풀어보세요.')

# Removed controls have no callers. Keep the supported all-learning-data backup path.
text = re.sub(r'function renderDataTools\(\)\{.*?(?=// ── 과목 선택 시스템 ──)', '', text, count=1, flags=re.S)
text = text.replace('      ${renderDataTools()}\n', '')
text = re.sub(r'function exportData\(\)\{.*?(?=// ── 학습 일정 설정 ──)', '', text, count=1, flags=re.S)
text = re.sub(r'      <!-- v4.36: 푸터.*?Android 단일 파일.*?\n      </div>', '<div style="text-align:center;font-size:11px;color:var(--textMuted);padding:18px">Maritime Drill v${APP_VERSION}</div>', text, count=1, flags=re.S)
text = re.sub(r'(    <!-- ── 유틸 \+ 과목선택 ── -->)\n    <div[^>]*>.*?onclick="toggleTTS\(\)".*?\n    </div>', r'\1', text, count=1, flags=re.S)

# A single review entry replaces the two sibling cards; their underlying lists remain intact.
start = text.index('    const extraCards = ')
end = text.index('    const analysisCard = ', start)
text = text[:start] + '''    const extraCards = (wrongsCount || marksCount) ? `
      <button type="button" class="card selection-card" style="width:100%;border-left:3px solid #DC2626" onclick="openMaritimeReview('${subjectId}')">
        <div style="font-size:16px;font-weight:800">복습</div>
        <div style="font-size:12px;color:var(--textDim);margin-top:5px">필기 오답 ${wrongsCount} · 북마크 ${marksCount}</div>
      </button>` : '';
''' + text[end:]

for title, ident in [('시험 설정', 'md-plan-config'), ('취약문제 집중', 'md-plan-review')]:
    pattern = r'<section(?: id="'+ident+r'")? class="card"([^>]*)>(\s*<div[^>]*>'+title+r'</div>)'
    text, count = re.subn(pattern, r'<section id="'+ident+r'" class="card"\1>\2', text, count=1)
    if count != 1:
        raise RuntimeError('Missing plan section: '+title)
text = re.sub(r'<div(?: id="md-plan-records")? (style="[^"]*")>\$\{gradeCards\}</div>', r'<div id="md-plan-records" \1>${gradeCards}</div>', text, count=1)
text = re.sub(r'<section(?: id="md-plan-today")? class="card"([^>]*)>(\s*<div[^>]*><div><div[^>]*>오늘의 숙제</div>)', r'<section id="md-plan-today" class="card"\1>\2', text, count=1)
text = re.sub(r'<section(?: id="md-plan-rules-source")? class="card"([^>]*)><div([^>]*)>숙달 규칙</div>', r'<section id="md-plan-rules-source" class="card"\1><div\2>숙달 규칙</div>', text, count=1)
text = re.sub(r'        <div[^>]*><button[^>]*onclick="recalculateNavigatorPassPlanToday\(\)".*?onclick="resetNavigatorPassPlanProgress\(\)".*?</div>\n', '', text, count=1)

end = text.index('  window.toggleNavigatorPassPlanPriorityCustom=function()')
start = text.index('  window.renderNavigatorPassPlan=async function(')
block = text[start:end]
if 'window.mdOrganizePassPlan?.(planEntrySubject);' not in block:
    pos = block.rfind('  };')
    block = block[:pos] + '    window.mdOrganizePassPlan?.(planEntrySubject);\n' + block[pos:]
    text = text[:start] + block + text[end:]
for ident in ['md-plan-config','md-plan-today','md-plan-review','md-plan-records','md-plan-rules-source']:
    if f'id="{ident}"' not in text:
        raise RuntimeError('Missing navigation landmark: '+ident)

p.write_text(text, encoding='utf-8')
print('menu cleanup v5.16 patch applied')
