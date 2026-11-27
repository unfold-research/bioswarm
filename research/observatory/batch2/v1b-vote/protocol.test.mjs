import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTasks, wave, score, gate, summarize, icc, plurality, LEVELS } from './protocol.mjs';
test('96 tasks, 16 per level, answers recomputed, at most two multiplications', () => {
  const tasks = makeTasks(); assert.equal(tasks.length, 96);
  for (const L of LEVELS) assert.equal(tasks.filter((t) => t.level === L).length, 16);
  for (const t of tasks) { let v = t.start; for (const o of t.ops) v = o.op === 'add' ? v + o.n : o.op === 'subtract' ? v - o.n : v * o.n; assert.equal(v, t.answer); assert.equal(t.ops.length, t.level); assert.ok(t.ops.filter((o) => o.op === 'multiply').length <= 2); assert.ok(Math.abs(t.answer) < 2000); }
});
test('1536 requests; ident repeats one prompt, the other arms differ', () => {
  const rows = wave(); assert.equal(rows.length, 96 * 16); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length);
  const of = (arm) => rows.filter((q) => q.meta.seed === 15001 && q.meta.arm === arm).map((q) => q.params.messages[0].content);
  assert.equal(new Set(of('ident')).size, 1); assert.equal(new Set(of('present')).size, 5); assert.equal(new Set(of('strategy')).size, 5); assert.equal(of('work').length, 1);
});
test('icc and plurality', () => { assert.equal(icc([[1, 1, 1, 1, 1], [0, 0, 0, 0, 0]]), 1); assert.ok(Math.abs(icc([[1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 1], [0, 0, 1, 1, 0]])) < 0.3); assert.equal(icc([[1, 1], [1, 1]]), null); assert.equal(plurality([3, 4, 4, 5, 3]), 3); });
test('decision rules on synthetic responders', () => {
  const rows = wave();
  // ident: all-or-nothing per task (half the tasks right); strategy: each sample right independently on a fixed pattern; work: always right
  const out = new Map(rows.map((q) => { const m = q.meta, half = Math.floor((m.seed - 15001) / 6) % 2 === 0; let ok;
    if (m.arm === 'ident' || m.arm === 'present') ok = half; else if (m.arm === 'strategy') ok = (m.seed * 7 + m.sample * 3) % 5 < 3; else ok = true;
    return [q.custom_id, { output: { answer: ok ? m.answer : m.answer + 1 + m.sample } }]; }));
  const s = score(0, rows, out); assert.equal(gate(0, s), null); const sum = summarize([s]);
  assert.deepEqual(sum.analysisLevels, LEVELS); assert.equal(sum.pooled.ident.single, 0.5); assert.equal(sum.pooled.ident.meanIccWithinLevel, 1); assert.equal(sum.pooled.ident.vote, 0.5);
  assert.equal(sum.tests.P1, 'supported'); assert.equal(sum.tests.P2, 'supported'); assert.equal(sum.tests.P2p, 'not supported'); assert.equal(sum.pooled.strategy.vote, 1); assert.equal(sum.tests.P4, 'not supported'); assert.equal(sum.tests.P3, 'inconclusive');
  const allRight = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { answer: q.meta.answer } }])))]); assert.deepEqual(allRight.analysisLevels, []); assert.equal(allRight.tests.P1, 'inconclusive'); assert.equal(allRight.tests.P4, 'inconclusive');
});
