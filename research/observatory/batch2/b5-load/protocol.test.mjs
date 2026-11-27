import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, wave, ceiling, score, gate, summarize, expectedClaims, WAVES } from './protocol.mjs';
const perfect = (rows) => new Map(rows.map((q) => [q.custom_id, { output: { briefing: 'b', claims: expectedClaims(q.meta.records) } }]));
test('24 cases with unique opaque ids, every shape used, non-trivial load', () => {
  const cases = makeCases(); assert.equal(cases.length, 24);
  for (const c of cases) { assert.equal(new Set(c.records.map((r) => r.id)).size, c.records.length); assert.ok(c.records.length >= 4 && c.records.length <= 12); }
  assert.equal(new Set(cases.flatMap((c) => c.shapes)).size, 5);
  assert.ok(cases.reduce((n, c) => n + c.records.length, 0) / 24 > 6);
});
test('waves 144 + 48 + 48 + 48, perfect relay is exact and passes the gate', () => {
  const all = new Map(), sizes = [], scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, all); sizes.push(rows.length); for (const [id, v] of perfect(rows)) all.set(id, v); const s = score(k, rows, all); scored.push(s); assert.ok(s.every((x) => x.exact)); assert.equal(gate(k, s), null); }
  assert.deepEqual(sizes, [144, 48, 48, 48]); assert.equal(new Set([...all.keys()]).size, 288); assert.equal(ceiling(3).length, 48); assert.equal(summarize(scored).verdict, 'refuted');
});
