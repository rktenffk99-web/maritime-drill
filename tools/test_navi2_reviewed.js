// Runtime regressions for the final generated app, after recall/audit generators.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const reviewSource = fs.readFileSync('navi2-reviewed-content.js', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .map(m => ({name: (m[1].match(/data-bundled-src="([^"]+)"/) || [])[1], text:m[2]}))
  .filter(s => s.name && /^(data-|concepts-|audit-navi\.js$|navi2-reviewed-content\.js$)/.test(s.name));
const bundled = scripts.filter(s => s.name === 'navi2-reviewed-content.js');
assert.equal(bundled.length, 1, 'review must be bundled once');
assert.equal(bundled[0].text.trim(), reviewSource.trim(), 'bundled review must match maintained source');
assert(scripts.findIndex(s => s.name === 'navi2-reviewed-content.js') >
  scripts.findIndex(s => s.name === 'audit-navi.js'), 'review must run after generic official metadata');

function load(includeReview) {
  const context = vm.createContext({window:{}, console});
  for(const s of scripts) {
    if(!includeReview && s.name === 'navi2-reviewed-content.js') continue;
    vm.runInContext(s.text, context, {filename:s.name});
  }
  return context;
}
const snapshot = value => JSON.parse(JSON.stringify(value));
const before = load(false), after = load(true);
const data = after.window.MD_DATA, concepts = after.window.MD_CONCEPTS;
const questions = data.navi2.QUESTIONS;
const byId = new Map(questions.map(q => [q.id,q]));
assert.equal(questions.length, 111, 'keep all existing question IDs and learner progress');
assert.equal(byId.size, 111);
assert.deepEqual(questions.map(q => q.id).join(','), Array.from({length:111},(_,i)=>i+1).join(','));

for(const key of Object.keys(before.window.MD_DATA)) {
  if(key !== 'navi2') assert.deepEqual(snapshot(data[key]), snapshot(before.window.MD_DATA[key]), key+' data changed');
}
for(const key of Object.keys(before.window.MD_CONCEPTS)) {
  if(key !== 'navi2') assert.deepEqual(snapshot(concepts[key]), snapshot(before.window.MD_CONCEPTS[key]), key+' concepts changed');
}
const normal = new Set([5,22,26,28,46,49,51,53,54,60,76,77,83,84,85]);
for(const q of before.window.MD_DATA.navi2.QUESTIONS) {
  if((q.id >= 31 && q.id <= 45) || normal.has(q.id)) {
    assert.deepEqual(snapshot(byId.get(q.id)), snapshot(q), 'excluded/normal question changed: '+q.id);
    assert.deepEqual(snapshot(concepts.navi2[q.id]), snapshot(before.window.MD_CONCEPTS.navi2[q.id]));
  }
}
const pending = new Set([71,93,94,96,107,108,109,110,111]);
for(const q of questions) {
  for(const field of ['q','hint1','hint2','answer']) assert.equal(typeof q[field], 'string');
  if(pending.has(q.id)) {
    const visibleAnswer = q.oralAnswer || q.answer;
    assert.match(visibleAnswer, /미확정|질문 불확실/, 'stale answer still wins UI precedence: '+q.id);
    assert.equal(q.audit.answerGrade, 'C');
    assert.match(q.audit.answerStatus, /미확정/);
  }
  if(q.id >= 91) {
    assert.equal(q.source, '2026 최근 복기');
    assert.match(q.audit.questionStatus, /원문 미확보/);
    assert.doesNotMatch(q.audit.answerStatus, /2023년 공식 답변/);
  }
  if(q.id >= 108) {
    assert.match(q.q, /원문 미확보/);
    assert.doesNotMatch(q.q, /"[A-Za-z]/, 'fabricated English passage returned');
  }
}
const completed = [91,92,95,97,98,99,100,101,102,103,104,105,106];
for(const id of completed) {
  assert(concepts.navi2[id].terms.trim());
  assert(concepts.navi2[id].explanation.trim());
}
for(const id of pending) {
  if(id !== 71) assert.equal(concepts.navi2[id], undefined, 'unverified concept fabricated: '+id);
}
const once = JSON.stringify(after.window);
vm.runInContext(reviewSource, after);
assert.equal(JSON.stringify(after.window), once, 'review must be idempotent');
console.log('navi2 reviewed content: PASS (stable IDs, exclusions, 9 pending, 13 concepts, provenance, repeat-safe)');
