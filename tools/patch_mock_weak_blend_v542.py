"""Let the regular mock exam lean slightly toward weak parts (v5.42). Safe to rerun.

The weak-part multiplier from the pass plan (1.00~1.75) is reduced to 60% of its
increase (max 1.45) and only reorders choices among equally exposed questions, so
the paper keeps its subject counts, topic spread and exposure rotation.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'index.html'
text = path.read_text(encoding='utf-8-sig')
old = "const draw=engine.select(candidates,{gradeId,data,state:exposure,identity,count:PAST_MOCK_PER_SUBJECT});"
new = "const draw=engine.select(candidates,{gradeId,data,state:exposure,identity,count:PAST_MOCK_PER_SUBJECT,boost:item=>1+0.6*(ppWeakTopicBoost(item)-1)}); // mock-weak-blend-v542"
if new not in text:
    if text.count(old) != 1:
        raise SystemExit('mock selection anchor not found exactly once')
    text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
print('mock weak-part blend integrated')
