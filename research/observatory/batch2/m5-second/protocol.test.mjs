import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize, SEEDS } from './protocol.mjs';
import { qualifies } from '../littask.mjs';
test('90 new tasks with one correct answer; 360 search requests; the three wordings differ and carry the same records', () => {
  const ts = tasks(); assert.equal(ts.length, 90); assert.ok(SEEDS.every((s) => s >= 16001));
  for (const t of ts) assert.equal(t.records.filter(qualifies).sort((a, b) => b.n - a.n)[0].id, t.answer);
  const rows = wave(0); assert.equal(rows.length, 360); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 360);
  const of = (v) => rows.find((q) => q.meta.seed === 16001 && q.meta.variant === v).params;
  assert.deepEqual(of('s0'), of('same')); assert.notEqual(of('s0').system, of('r1').system); assert.notEqual(of('r1').system, of('r2').system);
  for (const r of ts[0].records) for (const v of ['s0', 'r1', 'r2']) assert.ok(of(v).messages[0].content.includes(r.id) && of(v).messages[0].content.includes(String(r.n)));
  for (const q of [...rows, ...ceiling(1)]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
  assert.equal(ceiling(1).length, 180);
});
test('decision rules: base prompt wrong on half the tasks, rewording and told right, perfect verifier', () => {
  const rows = wave(0), bad = (m) => Math.floor((m.seed - 16001) / 3) % 2 === 0;
  const out = new Map(rows.map((q) => [q.custom_id, { output: { id: bad(q.meta) && ['s0', 'same'].includes(q.meta.variant) ? q.meta.ids.find((x) => x !== q.meta.answer) : q.meta.answer } }]));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null);
  const w1 = wave(1, out); assert.equal(w1.length, 180);
  const o1 = new Map(w1.map((q) => [q.custom_id, { output: q.meta.kind === 'verify' ? { accept: q.meta.truthCorrect } : { id: q.meta.answer } }])), sum = summarize([s0, score(1, w1, o1)]);
  assert.equal(sum.pooled.single, 0.5); assert.equal(sum.pooled.retrySame, 0.5); assert.equal(sum.pooled.retryReword, 1); assert.equal(sum.pooled.retryTold, 1); assert.equal(sum.pooled.voteDiverse3, 1);
  assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'supported' }); assert.equal(sum.verifier.specificity, 1); assert.equal(sum.verifier.sensitivity, 1);
  // told repeats the rejected answer; verifier rejects everything
  const o2 = new Map(w1.map((q) => [q.custom_id, { output: q.meta.kind === 'verify' ? { accept: false } : { id: q.meta.rejected } }])), sum2 = summarize([s0, score(1, w1, o2)]);
  assert.equal(sum2.toldRepeatedRejected, 90); assert.equal(sum2.pooled.retryTold, 0.5); assert.equal(sum2.tests.P2, 'not supported'); assert.equal(sum2.pooled.retryReword, 1);
});
