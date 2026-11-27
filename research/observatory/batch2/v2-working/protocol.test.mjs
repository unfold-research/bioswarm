import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, score, gate, summarize } from './protocol.mjs';
test('90 new tasks, 540 requests under the byte ceiling', () => {
  assert.equal(tasks().length, 90); const rows = wave(); assert.equal(rows.length, 540); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 540);
  for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.equal('working' in q.params.output_config.format.schema.properties, q.meta.arm !== 'a'); }
});
test('decision rules', () => {
  const rows = wave(), half = (m) => Math.floor((m.seed - 17001) / 3) % 2 === 0, wrong = (m) => m.ids.find((x) => x !== m.answer);
  const run = (right) => summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { ...(q.meta.arm === 'a' ? {} : { working: 'one two three' }), id: right(q.meta) ? q.meta.answer : wrong(q.meta) } }])))]);
  const a = run((m) => (m.arm === 'a' || m.arm === 'w20' ? half(m) : true)); assert.equal(a.pooled.single, 0.5); assert.equal(a.pooled.vote3, 0.5); assert.equal(a.pooled.w60, 1); assert.equal(a.meanWorkingWords.w60, 3);
  assert.deepEqual(a.tests, { P1: 'supported', P2: 'supported', P3: 'not supported' });
  const b = run((m) => (m.arm === 'a' ? half(m) : !half(m))); assert.equal(b.tests.P1, 'not supported'); assert.equal(b.tests.P2, 'not supported');
  assert.equal(run(() => true).tests.P1, 'inconclusive'); assert.equal(gate(0, score(0, rows, new Map())), 'invalid-output-stop');
});
