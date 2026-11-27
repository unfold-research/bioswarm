// Analysis of the T2 redundancy study: every policy scored on the five attempts of each instance in their fixed order,
// the five registered predictions, the judge's verdicts and how often wrong attempts coincide.
// Usage: node observatory/batch2/t2r/analyze.mjs   (writes results/batch2-t2r/analysis.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS, SIZES, ATTEMPTS, POLICIES } from './protocol.mjs';
import { mulberry32 } from '../littask.mjs';

const RES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../results'), OUT = path.join(RES, 'batch2-t2r');
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8')), lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null), sum = (a, f) => a.reduce((n, x) => n + f(x), 0), key = (x) => `${x.task}/${x.M}/${x.i}`;
const first = path.join(RES, 'batch2-t2r-first'), more = path.join(RES, 'batch2-t2r-more');
const cost = new Map([...lines(path.join(first, 'ledger.jsonl')), ...lines(path.join(more, 'ledger.jsonl'))].map((x) => [x.customId, { tokens: x.usage.input_tokens + x.usage.output_tokens, usd: x.usageCostUsd }]));
const inst = new Map();
for (const x of [...json(path.join(first, 'wave-0.scored.json')), ...json(path.join(more, 'wave-0.scored.json'))]) { const r = inst.get(key(x)) || { task: x.task, M: x.M, i: x.i, expected: x.expected, answers: Array(ATTEMPTS).fill(null), cost: Array(ATTEMPTS).fill(null) }; r.answers[x.attempt - 1] = x.answer; r.cost[x.attempt - 1] = cost.get(x.customId); inst.set(key(x), r); }
for (const x of json(path.join(first, 'wave-1.scored.json'))) { const r = inst.get(key(x)); r.repeat = x.repeat; r.judgeCost = cost.get(x.customId); }
const all = [...inst.values()], falling = (x) => ['I-05', 'I-06'].includes(x.task), control = (x) => !falling(x);
for (const r of all) { r.policy = {}; for (const [name, f] of Object.entries(POLICIES)) { const p = f(r.answers, r.repeat), used = r.cost.slice(0, p.used), j = p.judged ? r.judgeCost : { tokens: 0, usd: 0 };
  r.policy[name] = { answer: p.answer, right: p.answer !== null && p.answer === r.expected, none: p.answer === null, used: p.used, tokens: sum(used, (c) => c.tokens) + j.tokens, usd: sum(used, (c) => c.usd) + j.usd }; } }
const names = Object.keys(POLICIES);
const row = (rows) => Object.fromEntries(names.map((n) => { const p = rows.map((r) => r.policy[n]), right = p.filter((x) => x.right).length; return [n, { n: p.length, right, share: +(right / p.length).toFixed(3), none: p.filter((x) => x.none).length, attempts: +mean(p.map((x) => x.used)).toFixed(2), tokens: Math.round(mean(p.map((x) => x.tokens))), usdPerRight: right ? +(sum(p, (x) => x.usd) / right).toFixed(6) : null }]; }));
const rnd = mulberry32(20261114), boot = (d) => { const draws = Array.from({ length: 4000 }, () => mean(d.map(() => d[Math.floor(rnd() * d.length)]))).sort((a, b) => a - b); return { n: d.length, value: +mean(d).toFixed(3), low: +draws[100].toFixed(3), high: +draws[3899].toFixed(3) }; };
const diff = (a, b, rows) => boot(rows.map((r) => (r.policy[a].right ? 1 : 0) - (r.policy[b].right ? 1 : 0)));
const same12 = all.filter((r) => r.answers[0] !== null && r.answers[0] === r.answers[1]), p1 = boot(same12.map((r) => (r.answers[0] === r.expected ? 1 : 0)));
const p2 = boot(all.filter(control).map((r) => (r.answers[0] === r.answers[1] && r.answers[0] !== null ? 0 : 1)));
const p3 = diff('agree', 'one', all.filter(falling)), p4 = diff('agree', 'three', all), p5 = diff('judge', 'agree', all), overall = row(all);
const predictions = { P1: { ...p1, verdict: p1.value >= 0.95 && p1.low >= 0.9 ? 'supported' : 'not supported' }, P2: { ...p2, verdict: p2.high < 0.1 ? 'supported' : 'not supported' }, P3: { ...p3, verdict: p3.low > 0 ? 'supported' : p3.high < 0 ? 'refuted' : 'not supported' },
  P4: { ...p4, verdict: p4.high < 0 ? 'refuted' : 'supported', attemptsAgree: overall.agree.attempts, forLess: overall.agree.attempts < 3 }, P5: { ...p5, verdict: p5.low > 0 ? 'refuted' : 'supported' } };
const judge = { repeatRightAttempt: all.filter((r) => r.repeat !== false && r.answers[0] === r.expected).length, acceptRightAttempt: all.filter((r) => r.repeat === false && r.answers[0] === r.expected).length, repeatWrongAttempt: all.filter((r) => r.repeat !== false && r.answers[0] !== r.expected).length, acceptWrongAttempt: all.filter((r) => r.repeat === false && r.answers[0] !== r.expected).length, invalid: all.filter((r) => r.repeat === null || r.repeat === undefined).length };
let wrongPairs = 0, wrongSame = 0; for (const r of all) for (let a = 0; a < ATTEMPTS; a++) for (let b = a + 1; b < ATTEMPTS; b++) { const x = r.answers[a], y = r.answers[b]; if (x !== null && y !== null && x !== r.expected && y !== r.expected) { wrongPairs++; if (x === y) wrongSame++; } }
const stimulus = { fallingDisagree12: all.filter(falling).filter((r) => r.answers[0] !== r.answers[1] || r.answers[0] === null).length, controlDisagree12: all.filter(control).filter((r) => r.answers[0] !== r.answers[1] || r.answers[0] === null).length, firstWrongFalling: all.filter(falling).filter((r) => r.answers[0] !== r.expected).length, firstWrongControl: all.filter(control).filter((r) => r.answers[0] !== r.expected).length,
  firedWhenFirstWrong: all.filter((r) => r.answers[0] !== r.expected && r.answers[0] !== r.answers[1]).length, firstWrong: all.filter((r) => r.answers[0] !== r.expected).length };
const result = { predictions, overall, falling: row(all.filter(falling)), controls: row(all.filter(control)), byTask: Object.fromEntries(TASKS.map((t) => [t, row(all.filter((r) => r.task === t))])), bySize: Object.fromEntries(SIZES.map((M) => [M, row(all.filter((r) => r.M === M))])),
  byCell: Object.fromEntries(TASKS.flatMap((t) => SIZES.map((M) => [`${t}/${M}`, row(all.filter((r) => r.task === t && r.M === M))]))), judge, stimulus, wrongPairs, wrongSame, anyRight: all.filter((r) => r.answers.includes(r.expected)).length, rightByAttempt: Array.from({ length: ATTEMPTS }, (_, a) => all.filter((r) => r.answers[a] === r.expected).length),
  usd: +(sum([...cost.values()], (c) => c.usd)).toFixed(4) };
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(predictions, null, 1)); for (const [name, t] of [['overall', result.overall], ['falling', result.falling], ['controls', result.controls]]) { console.log(name); console.table(t); }
console.log(JSON.stringify({ judge, stimulus, wrongPairs, wrongSame, anyRight: result.anyRight, rightByAttempt: result.rightByAttempt, usd: result.usd }));
