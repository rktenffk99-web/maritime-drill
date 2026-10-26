"""Keep past-paper variant filters aligned with the visible selection."""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'index.html'
text = path.read_text(encoding='utf-8-sig')
replacements = [
    ("if(!showVariantFilter) pastYearPickVariant = 'all';", "if(!showVariantFilter||!vc.choices.includes(pastYearPickVariant)) pastYearPickVariant = 'all';"),
    ("if(!showVariantFilter) pastVariant = 'all';", "if(!showVariantFilter||!vc.choices.includes(pastVariant)) pastVariant = 'all';"),
    ("  const exams = getPastExamsByBase(pastBaseShort, pastVariant||'all')\n    .filter(p => years.includes(p.meta.year));",
     "  const curV = pastYearPickVariant || 'all'; // past-variant-navigation-v527\n  const exams = getPastExamsByBase(pastBaseShort, curV)\n    .filter(p => years.includes(p.meta.year));"),
    ("  await ensurePastExplainForYears(years);\n  pastAllYears=true;", "  await ensurePastExplainForYears(years);\n  pastVariant=curV;\n  pastAllYears=true;"),
    ("  await ensurePastExplainForYears(exams.map(p=>p.meta.year));\n  pastQueue = pool;", "  await ensurePastExplainForYears(exams.map(p=>p.meta.year));\n  pastVariant=curV;\n  pastQueue = pool;"),
    ("원하는 년도만 골라서 랜덤 출제</div>", "원하는 년도만 골라서 랜덤 출제 · 현재 구분: ${curV==='all'?'전체':escapeHtml(curV)}</div>"),
]
for old, new in replacements:
    if new in text:
        continue
    if text.count(old) != 1:
        raise RuntimeError('missing or ambiguous variant navigation anchor: ' + old[:100])
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('past-paper variant navigation integration ready')
