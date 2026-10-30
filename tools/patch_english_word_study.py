"""Install the tested English supplement through the existing repository rebuild workflow.

The large generated index need not be uploaded through GitHub's contents API.
"""
from pathlib import Path
import re

def patch(source):
    replacements=[
        ("if(fallback)return fallback;\n    return null;", "if(fallback)return window.MDEnglishWordStudy ? window.MDEnglishWordStudy.augment(q,fallback) : fallback;\n    return window.MDEnglishWordStudy ? window.MDEnglishWordStudy.augment(q,null) : null;"),
        ("return { html: e.html, loading: !!e.loading };", "const result = { html: e.html, loading: !!e.loading };\n    return window.MDEnglishWordStudy ? window.MDEnglishWordStudy.augment(q,result) : result;"),
        ("""  return {
    해설: e['해설'] || e.explain || '',
    용어: e['용어'] || e.terms || {},
    키포인트: e['키포인트'] || e.keypoints || [],
  };
}
// 기본 해설""", """  const result = {
    해설: e['해설'] || e.explain || '',
    용어: e['용어'] || e.terms || {},
    키포인트: e['키포인트'] || e.keypoints || [],
  };
  return window.MDEnglishWordStudy ? window.MDEnglishWordStudy.augment(q,result) : result;
}
// 기본 해설"""),
        ("'text-align','white-space','letter-spacing','text-decoration'\n", "'text-align','white-space','letter-spacing','text-decoration',\n    'width','vertical-align','table-layout','overflow-wrap'\n"),
    ]
    for old,new in replacements:
        if old in source:source=source.replace(old,new,1)
        elif new not in source:raise RuntimeError('English supplement integration target changed')
    version=re.search(r"const APP_VERSION = '([^']+)'",source).group(1)
    for name in ['english-study-glossary.js','english-word-study.js']:
        source=re.sub(r'<script src="'+re.escape(name)+r'\?v=[^"]+"></script>\n?', '',source)
    anchor=re.search(r'<script src="convenience-controls\.js\?v=[^"]+"></script>',source)
    if not anchor:raise RuntimeError('English supplement loader anchor missing')
    addition=''.join(f'\n<script src="{name}?v={version}"></script>' for name in ['english-study-glossary.js','english-word-study.js'])
    return source[:anchor.end()]+addition+source[anchor.end():]

if __name__=='__main__':
    path=Path(__file__).resolve().parents[1]/'index.html'
    path.write_text(patch(path.read_text(encoding='utf-8-sig')))
    print('English lexical supplement integrated')
