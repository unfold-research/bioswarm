import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, score, summarize } from './protocol.mjs';
test('60 tasks, 180 requests; only the working arms have a working field', () => {
  assert.equal(tasks().length, 60); const rows = wave(); assert.equal(rows.length, 180); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 180);
  for (const q of rows) { assert.equal('working' in q.params.output_config.format.schema.properties, q.meta.arm !== 'direct'); assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); }
  const s = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.arm === 'direct' ? 'x' : q.meta.answer } }])))]); assert.equal(s.overall.direct, 0); assert.equal(s.overall.w150, 1);
});
