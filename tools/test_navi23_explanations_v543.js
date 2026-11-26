'use strict';
// 2·3급 항해사 보정 해설 확장 v5.43(v5.44 배포) 회귀 검사.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const m of html.matchAll(/<script type="application\/gzip" id="md-bundle-([^"]+)">([\s\S]*?)<\/script>/g)) {
  if (!/^past-(?:20\d\d-navi[23]-\d|explain-20\d\d)_js$/.test(m[1])) continue;
  vm.runInContext(zlib.gunzipSync(Buffer.from(m[2].trim(), 'base64')).toString('utf8'), ctx, { filename: m[1] });
}
const MARKS = '㉮㉯㉰㉱';
let checks = 0; const test = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };

// 원문 파일에 있는 키 목록
const src = path.join(root, 'tools', 'navi23_explanations_v543');
const keys = [];
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.txt')).sort())
  for (const m of fs.readFileSync(path.join(src, f), 'utf8').matchAll(/^@@ (.+)$/gm)) keys.push(m[1].trim());
const answerOf = k => {
  const [y, g, s, subj, n] = k.split('|');
  const q = ctx.MD_PAST[`${y}-${g}-${s}`].questions.find(x => x['과목'] === subj && x['번호'] === Number(n));
  return MARKS[q['정답']];
};

test('expanded explanation source covers at least 170 keys without duplicates', () => {
  assert.ok(keys.length >= 170, 'keys ' + keys.length);
  assert.equal(new Set(keys).size, keys.length);
});
test('every expanded explanation is in the bundle with the full section layout', () => {
  for (const k of keys) {
    const h = (ctx.MD_EXPLAIN[k] || {}).html || '';
    assert.match(h, /핵심 암기/, k);
    if (k.split('|')[3] === '영어') { assert.match(h, /지문 독해/, k); assert.match(h, /보기 해석/, k); assert.match(h, /왜 정답인가\?/, k); }
    else { assert.match(h, /용어 정리/, k); assert.match(h, /정답 해설/, k); }
    for (const mark of MARKS) assert.ok(h.includes(mark), `${k} ${mark}`);
  }
});
test('the stated answer matches the question data', () => {
  for (const k of keys) {
    const h = ctx.MD_EXPLAIN[k].html, ans = answerOf(k);
    assert.ok(h.includes('정답은 ' + ans), k);
    for (const other of MARKS) if (other !== ans) assert.ok(!h.includes('정답은 ' + other), `${k} ${other}`);
  }
});
test('corrected answer notes survive (2020 2급 3회 법규 3·4)', () => {
  assert.match(ctx.MD_EXPLAIN['2020|navi2|3|법규|3'].html, /풍우밀/);
  assert.match(ctx.MD_EXPLAIN['2020|navi2|3|법규|4'].html, /중형과 소형/);
});
console.log(`navi2/navi3 explanations v5.43: PASS (${checks} cases, ${keys.length} keys)`);
