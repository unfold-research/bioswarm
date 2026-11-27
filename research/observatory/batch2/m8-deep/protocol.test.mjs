import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize, LEVELS } from './protocol.mjs';
import { qualifies } from '../littask.mjs';
test('90 tasks of 96, 144 and 192 records under the byte ceiling', () => {
  const ts = tasks(); for (const L of LEVELS) assert.equal(ts.filter((t) => t.level === L && t.records.length === L).length, 30);
  for (const t of ts) assert.equal(t.records.filter(qualifies).sort((a, b) => b.n - a.n)[0].id, t.answer);
  const rows = wave(0); assert.equal(rows.length, 180); for (const q of [...rows, ...ceiling(1)]) assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000, String(Buffer.byteLength(JSON.stringify(q.params))));
});
test('decision rules: d0 wrong on half, d1 right, v150 perfect, v40 accepts everything', () => {
  const rows = wave(0), half = (m) => Math.floor((m.seed - 23001) / 3) % 2 === 0, out = new Map(rows.map((q) => [q.custom_id, { output: { working: '', id: q.meta.variant === 'd0' && half(q.meta) ? 's-zzz9' : q.meta.answer } }]));
  // an unknown id gets no verifier call and is treated as rejected
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 90);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { working: '', accept: true } }])))]);
  assert.equal(sum.overall.deep, 0.5); assert.equal(sum.overall.verify40, 1); assert.equal(sum.overall.verify150, 1); assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'not supported' });
});
