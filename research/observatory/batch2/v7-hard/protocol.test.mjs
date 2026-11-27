import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize, LEVELS } from './protocol.mjs';
import { tally } from '../grouptask.mjs';
test('90 tasks of 96, 144 and 168 records under the byte ceiling, one winner each', () => {
  const ts = tasks(); for (const L of LEVELS) assert.equal(ts.filter((t) => t.level === L && t.records.length === L).length, 30);
  for (const t of ts) { const c = Object.entries(tally(t.records)).sort((a, b) => b[1] - a[1]); assert.equal(c[0][0], t.answer); assert.ok(c[0][1] > c[1][1]); }
  const rows = wave(0); assert.equal(rows.length, 270); for (const q of [...rows, ...ceiling(1)]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000, String(Buffer.byteLength(JSON.stringify(q.params)))); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
});
test('decision rules', () => {
  const rows = wave(0), half = (m) => Math.floor((m.seed - 25001) / 3) % 2 === 0, wrong = (m, i) => m.authors.filter((a) => a !== m.answer)[i];
  // on half the tasks only the third sample is right and the two wrong ones differ
  const out = new Map(rows.map((q) => [q.custom_id, { output: { working: '', author: half(q.meta) && q.meta.sample < 2 ? wrong(q.meta, q.meta.sample) : q.meta.answer } }]));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 45 * 3 + 45);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { working: '', accept: q.meta.truthCorrect } }])))]);
  assert.equal(sum.overall.deep, 0.5); assert.equal(sum.overall.deepvote3, 0.5); assert.equal(sum.overall.select3, 1); assert.deepEqual(sum.tests, { P1: 'supported', P2: 'not supported', P3: 'supported' });
  const top = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { working: '', author: q.meta.answer } }]))), []]); assert.equal(top.tests.P1, 'inconclusive');
});
