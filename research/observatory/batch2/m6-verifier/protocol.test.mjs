import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize } from './protocol.mjs';
test('90 new tasks; 180 first-wave requests; verifiers share the proposal and differ in schema', () => {
  assert.equal(tasks().length, 90); const rows = wave(0); assert.equal(rows.length, 180); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 180);
  for (const q of rows) assert.equal('working' in q.params.output_config.format.schema.properties, q.meta.variant === 'sw');
  const c = ceiling(1); assert.equal(c.length, 180); for (const q of [...rows, ...c]) assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000);
  for (const q of c) assert.equal('working' in q.params.output_config.format.schema.properties, q.meta.variant === 'vw');
});
test('decision rule', () => {
  const rows = wave(0), out = new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.variant === 's0' && q.meta.seed % 2 ? q.meta.ids.find((x) => x !== q.meta.answer) : q.meta.answer } }]));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 180);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { accept: q.meta.variant === 'vw' ? q.meta.truthCorrect : true } }])))]);
  assert.equal(sum.overall.single, 0.5); assert.equal(sum.overall.sw, 1); assert.equal(sum.verifier.vw.sensitivity, 1); assert.equal(sum.verifier.v0.sensitivity, 0); assert.equal(sum.tests.P1, 'supported');
});
