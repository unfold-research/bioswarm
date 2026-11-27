import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTasks, wave, score, gate, summarize, icc, LEVELS, MOD } from './protocol.mjs';

test('48 tasks, 8 per level, answers in range and recomputable', () => {
  const t = makeTasks(); assert.equal(t.length, 48);
  for (const L of LEVELS) assert.equal(t.filter((x) => x.level === L).length, 8);
  for (const x of t) { let v = BigInt(x.start); for (const o of x.ops) v = o.op === 'add' ? v + BigInt(o.n) : o.op === 'subtract' ? v - BigInt(o.n) : v * BigInt(o.n); assert.equal(Number(((v % 97n) + 97n) % 97n), x.answer); assert.ok(x.answer >= 0 && x.answer < MOD); }
});
test('480 requests, unique ids; ident samples share one prompt, diverse samples have five', () => {
  const rows = wave(); assert.equal(rows.length, 480); assert.equal(new Set(rows.map((r) => r.custom_id)).size, 480);
  const one = rows.filter((r) => r.meta.seed === 8001);
  assert.equal(new Set(one.filter((r) => r.meta.arm === 'ident').map((r) => r.params.messages[0].content)).size, 1);
  assert.equal(new Set(one.filter((r) => r.meta.arm === 'diverse').map((r) => r.params.messages[0].content)).size, 5);
});
test('icc: 1 for all-or-nothing tasks, about 0 for independent samples', () => {
  assert.equal(icc([[1, 1, 1, 1, 1], [0, 0, 0, 0, 0]]), 1);
  let s = 7; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const iid = Array.from({ length: 4000 }, () => Array.from({ length: 5 }, () => (r() < 0.6 ? 1 : 0)));
  assert.ok(Math.abs(icc(iid)) < 0.03);
});
test('scoring and summary on a perfect and on a fully correlated model', () => {
  const rows = wave(), perfect = new Map(rows.map((q) => [q.custom_id, { output: { answer: q.meta.answer } }]));
  const s = score(0, rows, perfect); assert.ok(s.every((x) => x.correct)); assert.equal(gate(0, s), null);
  assert.equal(summarize([s]).tests.P1, 'inconclusive');
  const corr = new Map(rows.map((q) => [q.custom_id, { output: { answer: q.meta.level >= 5 ? -1 : q.meta.answer } }]));
  const sum = summarize([score(0, rows, corr)]); assert.equal(sum.overall.ident.icc, 1); assert.equal(sum.tests.P1, 'supported'); assert.equal(sum.tests.P3, 'supported');
});
