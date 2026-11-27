import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize } from './protocol.mjs';
test('rep1 search: 300 tasks, 2,400 first-wave requests, decision rules', () => {
  const rows = wave(0); assert.equal(rows.length, 2400); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 2400); assert.equal(ceiling(1).length, 300);
  for (const q of [...rows, ...ceiling(1)]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
  for (const q of rows) assert.equal('working' in q.params.output_config.format.schema.properties, q.meta.agent[0] !== 'd');
  const key = 'search' === 'search' ? 'id' : 'author', half = (m) => m.seed % 2 === 0;
  // direct agents always wrong; s0 wrong on half the tasks; the rest right
  const out = new Map(rows.map((q) => { const m = q.meta, bad = m.agent[0] === 'd' || (m.agent === 's0' && half(m)); return [q.custom_id, { output: { working: '', [key]: bad ? 'zz-wrong' : m.answer } }]; }));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 150);
  const s = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { working: '', accept: q.meta.truthCorrect } }])))]);
  assert.equal(s.overall.direct, 0); assert.equal(s.overall.directVote3, 0); assert.equal(s.overall.single, 0.5); assert.equal(s.overall.vote3, 1); assert.equal(s.overall.verify3, 1); assert.equal(s.overall.w150, 1);
  assert.deepEqual(s.tests, { R1: 'supported', R2: 'supported', R3: 'not supported', R4: 'supported', R5: 'not supported' });
});
