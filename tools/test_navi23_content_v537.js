'use strict';
// 2·3급 항해사(상선) 기출 데이터·해설 보정 v5.37 회귀 검사.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const m of html.matchAll(/<script type="application\/gzip" id="md-bundle-([^"]+)">([\s\S]*?)<\/script>/g)) {
  if (!/^past-(?:20\d\d-navi[23]e?-\d|explain-20\d\d)_js$/.test(m[1])) continue;
  vm.runInContext(zlib.gunzipSync(Buffer.from(m[2].trim(), 'base64')).toString('utf8'), ctx, { filename: m[1] });
}
vm.runInContext(fs.readFileSync(path.join(root, 'explain-2026-navi3-3.js'), 'utf8'), ctx);
let checks = 0; const test = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
const merchant = Object.entries(ctx.MD_PAST).filter(([id]) => /^20\d\d-navi[23]-\d$/.test(id));
const key = (exam, q) => `${exam.meta.year}|${exam.meta.gradeShort}|${q['회차'] || exam.meta.session}|${q['과목']}|${q['번호']}`;
const explainOf = (exam, q) => {
  const e = ctx.MD_EXPLAIN[key(exam, q)];
  if (e) return e.html || '';
  const f = ctx.get2026Navi3Session3Explain && ctx.get2026Navi3Session3Explain({ ...q, _year: exam.meta.year, _short: exam.meta.gradeShort, _session: exam.meta.session });
  return f ? (f.html || '') : '';
};
const find = (id, subject, number) => ctx.MD_PAST[id].questions.filter(q => q['과목'] === subject && q['번호'] === number);

test('every 2·3급 상선 기출 question has an explanation and none is a generation-failure message', () => {
  let total = 0; const missing = [], failed = [];
  for (const [, exam] of merchant) for (const q of exam.questions) {
    total++; const h = explainOf(exam, q);
    if (!h.trim()) missing.push(key(exam, q)); else if (/생성 실패|Claude Code exit/.test(h.slice(0, 300))) failed.push(key(exam, q));
  }
  assert.ok(total > 5800, 'loaded ' + total);
  assert.deepEqual(missing, []); assert.deepEqual(failed, []);
});
test('PDF footer copyright text no longer sticks to the last choice', () => {
  for (const [id, exam] of Object.entries(ctx.MD_PAST)) for (const q of exam.questions)
    for (const c of q['선택지'] || []) assert.ok(!/◆\s*본 문제는|무단 복제/.test(String(c)), `${id} ${q['과목']} ${q['번호']}`);
});
test('parsing-merged questions are renumbered with verified stems and answers', () => {
  const cases = [['2020-navi2-4', '법규', 20, 2, /등화 규정/], ['2022-navi2-2', '운용', 18, 1, /방화 구획/], ['2023-navi2-1', '법규', 20, 3, /12미터 미만/], ['2025-navi2-4', '상선전문', 11, 1, /LNG 운반선/], ['2022-navi2e-2', '운용', 18, 1, /방화 구획/], ['2023-navi2e-1', '법규', 20, 3, /12미터 미만/]];
  for (const [id, subject, number, answer, stem] of cases) {
    const rows = find(id, subject, number); assert.equal(rows.length, 1, id); assert.equal(rows[0]['정답'], answer, id); assert.match(rows[0]['문제'], stem);
  }
  for (const [id, subject, number] of [['2020-navi2-4', '법규', 4], ['2022-navi2-2', '운용', 3], ['2023-navi2-1', '법규', 4], ['2025-navi2-4', '상선전문', 2]])
    assert.equal(find(id, subject, number).length, 1, `${id} ${subject} ${number} is unique again`);
});
test('answer keys that contradicted the same question in other years are corrected', () => {
  const cases = [['2020-navi2-3', '법규', 3, 2], ['2020-navi2-3', '법규', 4, 1], ['2020-navi3-3', '항해', 10, 3], ['2020-navi2-3', '상선전문', 8, 0], ['2022-navi2-3', '법규', 7, 3], ['2020-navi2-3', '영어', 23, 2], ['2020-navi2-2', '운용', 7, 3], ['2023-navi3-3', '상선전문', 17, 1], ['2025-navi3-1', '영어', 7, 1]];
  for (const [id, subject, number, answer] of cases) assert.equal(find(id, subject, number)[0]['정답'], answer, `${id} ${subject} ${number}`);
  assert.match(find('2026-navi3-2', '법규', 19)[0]['문제'], /옳지 않은 것은/);
});
test('corrected explanations teach the right gyro speed-error fact', () => {
  for (const k of ['2021|navi2|4|항해|3', '2023|navi2|4|항해|2', '2025|navi2|4|항해|2']) {
    const h = ctx.MD_EXPLAIN[k].html; assert.match(h, /남북 침로에서 가장 크며/); assert.doesNotMatch(h, /남북 방향일 때 오차가 최소/);
  }
});
console.log(`navi2/navi3 content v5.37: PASS (${checks} cases)`);
