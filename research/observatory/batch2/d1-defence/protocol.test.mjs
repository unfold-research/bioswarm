import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, wave, score, gate, summarize, ARMS } from './protocol.mjs';
// Deterministic reference policies over the records, used to check that the cases discriminate as designed.
const decide = (records) => { const s = [0, 1, 2].map(() => new Set()); for (const r of records) s[r.indicator].add(r.value); if (s.some((x) => x.size > 1)) return 'unsure'; if (s.some((x) => x.has(0))) return 'benign'; return s.every((x) => x.has(1)) ? 'malicious' : 'unsure'; };
const ref = {
  rule: (rs) => rs, allowlist: (rs) => rs.filter((r) => r.status === 'verified'),
  instinct: (rs) => { const u = rs.filter((r) => r.status === 'unverified'), v = rs.filter((r) => r.status === 'verified'); return u.length === 1 && v.some((r) => r.indicator === u[0].indicator && r.value !== u[0].value) ? v : rs; },
  quorum: (rs) => rs.filter((r) => rs.some((o) => o !== r && o.source !== r.source && o.indicator === r.indicator && o.value === r.value)),
};
test('160 requests, unique ids, balanced truth', () => {
  const rows = wave(); assert.equal(rows.length, 160); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 160);
  for (const t of ['clean', 'lone-false', 'sybil', 'novel-true', 'novel-false']) assert.equal(makeCases().filter((c) => c.type === t && c.truthLabel === 'malicious').length, 4);
});
test('reference policies reproduce the preregistered pattern', () => {
  const cases = new Map(makeCases().map((c) => [c.seed, c])), rows = wave();
  const out = new Map(rows.map((q) => { const c = cases.get(q.meta.seed), kept = ref[q.meta.arm](c.records); return [q.custom_id, { output: { claims: [], quarantined: c.records.filter((r) => !kept.includes(r)).map((r) => r.id), verdict: decide(kept), note: '' } }]; }));
  const s = score(0, rows, out), sum = summarize([s]); assert.equal(gate(0, s), null);
  assert.deepEqual(Object.values(sum.tests), ['supported', 'supported', 'supported', 'supported', 'supported']);
  assert.equal(sum.table.quorum.sybil.correct, 0); assert.equal(sum.table.quorum['novel-false'].wrong, 0); assert.equal(sum.table.rule['novel-false'].wrong, 8); assert.equal(ARMS.length, 4);
});
