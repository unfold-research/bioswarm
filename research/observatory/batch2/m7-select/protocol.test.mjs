import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize } from './protocol.mjs';
test('90 tasks, 720 first-wave requests, deep agents get the higher output limit', () => {
  assert.equal(tasks().length, 90); const rows = wave(0); assert.equal(rows.length, 720); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 720);
  for (const q of rows) assert.equal(q.params.max_tokens, q.meta.variant === 'deep' ? 1536 : 512);
  const c = ceiling(1); assert.equal(c.length, 450); for (const q of [...rows, ...c]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
});
test('decision rules: only the fourth sample is right, deep agents wrong, perfect verifier', () => {
  const rows = wave(0), wrong = (m, i) => m.ids.filter((x) => x !== m.answer)[i];
  const out = new Map(rows.map((q) => [q.custom_id, { output: { working: '', id: q.meta.variant === 'w20' && q.meta.sample === 3 ? q.meta.answer : wrong(q.meta, q.meta.variant === 'deep' ? 0 : q.meta.sample % 2) } }]));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 270);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { accept: q.meta.truthCorrect } }])))]);
  assert.equal(sum.overall.single, 0); assert.equal(sum.overall.vote5, 0); assert.equal(sum.overall.verify3, 0); assert.equal(sum.overall.select5, 1); assert.equal(sum.overall.deep, 0); assert.equal(sum.meanVerifierCalls, 3);
  assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'refuted', P4: 'not supported' });
});
