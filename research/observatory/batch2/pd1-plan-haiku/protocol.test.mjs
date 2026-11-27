import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, gate, summarize } from './protocol.mjs';
import * as P from '../pd1-policy/protocol.mjs';
import { probe } from '../kernel/leak-probe.mjs';
test('fields: labels balanced, three edited parts that share the relation of the domain', () => {
  for (const d of P.DOMAINS) for (const f of P.testFields(d, 200)) { assert.equal(f.block.length, 3); assert.equal(new Set(f.block).size, 3);
    for (const [lab, n] of Object.entries(P.LABELS)) { const c = {}; for (const x of f.parts) c[x[lab]] = (c[x[lab]] || 0) + 1; assert.deepEqual(Object.values(c), Array(n).fill(24 / n)); }
    if (d === 'ring') { const s = f.block.find((p) => f.block.includes((p + 1) % 24) && f.block.includes((p + 2) % 24)); assert.ok(s !== undefined); } else assert.equal(new Set(f.block.map((p) => f.parts[p][d])).size, 1); }
});
test('policies: 85 distinct; the rule of each domain is the best of the family there, and the ring rule fails off the ring', () => {
  assert.equal(new Set(P.POLICIES.map(P.keyOf)).size, 85); assert.equal(P.POLICIES.length, 85);
  for (const d of P.DOMAINS) { const fs = P.testFields(d, 400, 410001), acc = P.POLICIES.map((p) => [p, P.accuracy(p, fs)]).sort((a, b) => b[1] - a[1]); assert.equal(acc[0][0].follow, d); assert.equal(acc[0][0].probe, 'spread_' + d); assert.ok(acc[0][1] > 0.55);
    if (d !== 'ring') assert.ok(P.accuracy(P.RING_RULE, fs) < 0.35); for (const f of fs.slice(0, 20)) for (const p of P.POLICIES.slice(0, 85)) { const r = P.run(f, p); assert.equal(r.touched.length, 8); assert.equal(new Set(r.touched).size, 8); } }
});
test('leak probe (empirical variance, the edited parts share a label): the edited parts cannot be located from the number or label values of a part', () => {
  const num = (s) => Number(s.slice(1));
  for (const d of P.DOMAINS) { const cases = [...P.testFields(d, 1000), ...P.CELLS.filter((c) => c.domain === d).flatMap(P.examplesOf)].map((f) => ({ targets: f.block, candidates: f.parts.map((x) => ({ id: x.part, features: { part: x.part, source: num(x.source), shelf: num(x.shelf), batch: num(x.batch) } })) })); assert.equal(probe(cases, { variance: 'empirical' }).leak, false, d); }
});
test('plans haiku: 90 cells, examples of the right size and domain, no domain name in the request; an invalid plan is scored as such', () => {
  const rows = wave(0); assert.equal(rows.length, 90); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 90); const out = new Map();
  for (const q of rows) { assert.equal(q.params.model, 'haiku' === 'sonnet' ? 'claude-sonnet-5-5' : 'claude-haiku-5-5'); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000);
    const c = JSON.parse(q.params.messages[0].content); assert.equal(c.examples.length, q.meta.k); assert.ok(!('domain' in c)); for (const e of c.examples) { assert.equal(e.parts.length, 24); assert.equal(e.parts.filter((x) => x.edited).length, 3); }
    out.set(q.custom_id, { output: q.meta.rep < 2 ? { working: '', follow: 'everything', follow_limit: 2, probe: 'in_order' } : { working: '', ...P.fit(P.examplesOf(q.meta)) } }); }
  const ex = new Set(P.CELLS.filter((c) => c.k).flatMap((c) => P.examplesOf(c).map((f) => f.seed))); assert.equal(ex.size, 4 * 10 * 5);
  const s = score(0, rows, out); assert.equal(gate(0, s), 'invalid-output-stop'); assert.equal(s.filter((x) => !x.valid).length, 18); assert.equal(summarize([s]).plans, 90);
  for (const q of rows) out.set(q.custom_id, { output: { working: '', ...P.RING_RULE } }); assert.equal(gate(0, score(0, rows, out)), null);
});
