import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, gate, summarize, SPEC } from './protocol.mjs';
import * as P from '../d5-decay/protocol.mjs';
import * as R from '../r1-regimes/protocol.mjs';
test('the module reproduces R1 with exact readers when given the R1 streams, and decay rates share one stream', () => {
  const h = P.HORIZONS.short; for (const seed of [61001, 61077, 61150]) { const c = R.makeCorpus(seed), a = P.schedule(c, 1, h), b = P.schedule(c, 0.5, h), z = P.schedule(c, 0, h); assert.equal(a.length, 12); assert.deepEqual(a.slice(0, 6), b.slice(0, 6)); assert.deepEqual(a.slice(0, 6), z.slice(0, 6)); }
  const sim = P.simulate(P.range(960001, 400), h); assert.ok(sim[0.5].edited - sim[1].edited > 0.2); assert.ok(sim[1].stable > 0.97); assert.ok(sim[0].stable < sim[1].stable);
});
test('rows lambda 1: 150 collections, 6 shared reads and 12 conditioned reads each, one part per read, exact readers give the simulation', () => {
  const rows = wave(0); assert.equal(rows.length, 150 * 18); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); const out = new Map();
  for (const q of rows) { assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); const c = JSON.parse(q.params.messages[0].content); assert.equal(c.records.length, 48); assert.ok(!JSON.stringify(c).includes('edited')); out.set(q.custom_id, { output: { working: '', counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } }); }
  const sc = score(0, rows, out); assert.equal(gate(0, sc), null); const s = summarize([sc]), sim = P.simulate(SPEC.seeds, P.HORIZONS.short)[SPEC.lambda];
  assert.equal(s.edited, sim.edited); assert.equal(s.stable, sim.stable); assert.equal(s.readsExact, 1);
  for (const q of rows.slice(0, 400)) out.set(q.custom_id, { output: { counts: 'x' } }); assert.equal(gate(0, score(0, rows, out)), 'invalid-output-stop');
});
