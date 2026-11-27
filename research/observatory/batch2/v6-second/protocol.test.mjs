import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize } from './protocol.mjs';
import { tally, LEVELS } from '../grouptask.mjs';
test('90 tasks: the winner leads by exactly one qualifying study; the decoy has the most records', () => {
  const ts = tasks(); assert.equal(ts.length, 90);
  for (const t of ts) { assert.equal(t.records.length, t.level); assert.equal(new Set(t.records.map((r) => r.id)).size, t.level); const c = tally(t.records), sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
    assert.equal(sorted[0][0], t.answer); assert.equal(sorted[0][1], t.level / 8 + 1); assert.equal(sorted[1][1], t.level / 8); assert.notEqual(t.planted, t.answer); assert.ok(t.records.filter((r) => r.author === t.planted).length >= t.level / 6); }
  for (const L of LEVELS) assert.equal(ts.filter((t) => t.level === L).length, 30);
  const rows = wave(0); assert.equal(rows.length, 540); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 540); for (const q of [...rows, ...ceiling(1)]) assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000);
});
test('decision rules', () => {
  const rows = wave(0), half = (m) => Math.floor((m.seed - 24001) / 3) % 2 === 0;
  const out = new Map(rows.map((q) => { const m = q.meta, wrong = m.authors.find((a) => a !== m.answer), bad = m.agent === 'direct' || (m.agent === 's0' && half(m)); return [q.custom_id, { output: { working: '', author: bad ? wrong : m.answer } }]; }));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 90);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { working: '', accept: q.meta.truthCorrect } }])))]);
  assert.equal(sum.overall.direct, 0); assert.equal(sum.overall.single, 0.5); assert.equal(sum.overall.vote3, 1); assert.equal(sum.overall.verify3, 1); assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'not supported' });
});
