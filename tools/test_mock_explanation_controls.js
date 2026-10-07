'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('mock-explanation-controls.js','utf8');
const keyboard=fs.readFileSync('keyboard-controls.js','utf8');

assert.match(keyboard,/mdLoadAuxScript\('mock-explanation-controls\.js'\)/,'mock explanation script is not loaded');
assert.match(source,/currentMode[^\n]+==='past'/,'past-mode guard missing');
assert.match(source,/pastMode[^\n]+==='mock'/,'mock-mode guard missing');
assert.match(source,/button\[onclick="pastNext\(\)"\]/,'navigation-row anchor missing');
assert.match(source,/id="\$\{BUTTON_ID\}"/,'explanation button missing');
assert.match(source,/renderExplainBlock\(q,\{compact:true\}\)/,'existing explanation renderer is not reused');
assert.match(source,/panel\.querySelectorAll\('details'\).*open=true/,'nested explanation details are not expanded on request');
assert.match(source,/activeKey!==key/,'question change does not reset the explanation toggle');
assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem|clear)/,'explanation viewer must not mutate learning storage');
assert.doesNotMatch(source,/choosePastAnswer|pastAnswers\s*\[/,'explanation viewer must not submit or change answers');
console.log('mock in-exam explanation controls: PASS');
