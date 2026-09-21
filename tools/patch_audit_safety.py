from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8-sig')
original = text
start = text.index('  function ppWeakTopicId(item){')
end = text.index('  function ppLoadWeakTopicProfile()', start)
text = text[:start] + """  function ppWeakTopicId(item){
    // audit-topic-classifier-v1: one shared rule set for homework and results.
    const subject=String(item&&item.subject||'기타');
    const question=item&&(item.question||item['문제']||item['질문'])||'';
    return window.__mdWeakTopicClassifier.classify(subject,question);
  }
""" + text[end:]
text = text.replace("if(!row||!(Number(row.wrong)>0))return 1;", "if(!row||!(Number(row.wrong)+(Number(row.unanswered)||0)>0))return 1;")
text = text.replace("Number(row.errorRate)||0", "Number(row.reviewRate===undefined?row.errorRate:row.reviewRate)||0")
text = text.replace("const APP_VERSION = '5.08';", "const APP_VERSION = '5.10';")
text = text.replace('<title>Maritime Drill v5.08 · Android</title>', '<title>Maritime Drill v5.10 · Android</title>')
if text != original:
    p.write_text(text, encoding='utf-8')
    print('audit safety patch applied: shared classification, unanswered review, v5.10')
else:
    print('audit safety patch already applied')
