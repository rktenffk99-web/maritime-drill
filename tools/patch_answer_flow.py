"""Final answer-only homework UI; retain legacy progress/checkpoint compatibility."""
from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')
start = text.index('// ── v5.07: 2·3급 항해사 합격 플랜 / 오늘의 숙제')
prefix, text = text[:start], text[start:]

def replace(old, new):
    global text
    if old in new and new in text:
        return
    if old not in text:
        if new in text:
            return
        raise RuntimeError('Missing answer-flow anchor: ' + old[:90])
    text = text.replace(old, new)

replace('const canNext=showFeedback&&!!confidence;', 'const canNext=showFeedback;')
replace("planSessionConfidence[planSessionIdx]=i===q['정답']?null:'wrong';",
        "// 'sure' is the legacy successful-answer code, no longer a self-rating.\n    planSessionConfidence[planSessionIdx]=i===q['정답']?'sure':'wrong';")

# Remove the self-rating controls and handler, rather than hiding active controls.
anchor = '${window.__mdLearningIntegrity.remapExplanation(renderExplainBlock(q),order)}'
a = text.index(anchor) + len(anchor)
b = text.index("`:''}", a)
text = text[:a] + text[b:]
a = text.find('  window.setNavigatorPassPlanConfidence=function(value){')
if a >= 0:
    b = text.index('  function ppCommitOutcome(q,answer,confidence){', a)
    text = text[:a] + text[b:]

# An older checkpoint can have an answer but no confidence value. Derive the new
# outcome only when committing; never rewrite already committed legacy attempts.
replace("const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx],confidence=planSessionConfidence[planSessionIdx];\n    if(answer===null||!confidence)return;",
        "const q=planSessionQueue[planSessionIdx],answer=planSessionAnswers[planSessionIdx];\n    if(!q||!Number.isInteger(answer)||answer<0||answer>=q['선택지'].length)return;\n    const confidence=answer===q['정답']?'sure':'wrong';")
replace('if(!planSessionCommitted.has(planSessionIdx)){\n      ppCommitOutcome(q,answer,confidence);',
        'if(!planSessionCommitted.has(planSessionIdx)){\n      planSessionConfidence[planSessionIdx]=confidence;\n      ppCommitOutcome(q,answer,confidence);')

# Match on-screen instructions to the existing repeated-recall schedule.
replace('완료 조건: 정답 + ‘확실히 안다’. 오답 또는 ‘애매·찍음’은 오늘 미해결로 남습니다. 첫 통과 후 다른 날 다시 정답+확실이면 숙달됩니다.',
        '답을 선택하면 정답·오답이 기록됩니다. 첫 정답 후 같은 날 재확인까지 맞히면 오늘 확인 완료, 다른 날 다시 맞히면 숙달됩니다.')
replace('① 처음 정답+확실 → 당일 통과, 다음 날 다시 출제<br>② 다른 날 정답+확실 → 숙달<br>③ 숙달 문제도 3일 뒤 유지복습<br>④ 오답/애매 → 그날 미해결, 다시 풀어서 정답+확실해야 오늘 숙제에서 제거',
        '① 첫 정답 → 학습 중, 같은 날 재확인 정답 → 오늘 확인 완료<br>② 확인 완료 후 다른 날 다시 정답 → 숙달<br>③ 숙달 문제도 정답률과 시험일에 따라 유지복습<br>④ 오답 → 미해결, 다시 풀고 재확인')
replace('정답 + 확실 통과', '정답')
replace('${sure} / ${planSessionQueue.length}', '${sure+unsure} / ${planSessionQueue.length}')
replace('애매 ${unsure} · 오답 ${wrong}', '오답 ${wrong}')
replace('같은 날 다시 맞혀 ‘확실’까지 만들 수 있지만, 숙달 판정은 다른 날 재확인이 필요합니다.',
        '같은 날 다시 풀어 확인을 완료할 수 있으며, 숙달 판정은 다른 날 재확인이 필요합니다.')
replace('onclick="nextNavigatorPassPlanQuestion()">',
        'title="다음 문제 (Space / Enter / →)" aria-keyshortcuts="Space Enter ArrowRight" onclick="nextNavigatorPassPlanQuestion()">')

if any(label in text for label in ['setNavigatorPassPlanConfidence', '확실히 안다', '정답 + 확실 통과', '애매 ${unsure}']):
    raise RuntimeError('Self-rating control remains in homework')
p.write_text(prefix + text, encoding='utf-8')
print('answer-only homework flow applied')
