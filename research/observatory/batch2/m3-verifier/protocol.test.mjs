import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, wave, score, gate, summarize, faithful, ERRORS } from './protocol.mjs';

test('48 cases, 12 per error type; clean reports are faithful and corrupted ones are not', () => {
  const cases = makeCases(); assert.equal(cases.length, 48);
  for (const e of ERRORS) assert.equal(cases.filter((c) => c.error === e).length, 12);
  for (const c of cases) { assert.equal(new Set(c.records.map((r) => r.id)).size, 6); assert.equal(faithful(c.reports.clean, c.records), true); assert.equal(faithful(c.reports.corrupted, c.records), false, `${c.id} ${c.error}`); }
});
test('192 requests, unique ids; the blind arm never sees records', () => {
  const rows = wave(); assert.equal(rows.length, 192); assert.equal(new Set(rows.map((r) => r.custom_id)).size, 192);
  for (const r of rows) assert.equal('records' in JSON.parse(r.params.messages[0].content), r.meta.arm === 'grounded');
});
test('a perfect grounded verifier and a blind one that never flags', () => {
  const rows = wave(), out = new Map(rows.map((q) => [q.custom_id, { output: q.meta.arm === 'grounded' && q.meta.kind === 'corrupted' ? { faithful: false, issues: [{ indicator: q.meta.errorIndicator, kind: 'wrong-value' }] } : { faithful: true, issues: [] } }]));
  const s = score(0, rows, out), sum = summarize([s]); assert.equal(gate(0, s), null);
  assert.equal(sum.arms.grounded.sensitivity, 1); assert.equal(sum.arms.grounded.specificity, 1); assert.equal(sum.arms.grounded.localised, 48);
  assert.equal(sum.arms.blind.sensitivity, 0); assert.equal(sum.tests.P1, 'supported'); assert.equal(sum.tests.P2, 'supported');
});
