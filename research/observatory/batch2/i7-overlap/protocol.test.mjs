import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('192 requests; some exposed cases are about indicator 0 and some are not', () => {
  const rows = wave(); assert.equal(rows.length, 192); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 192);
  const ex = rows.filter((q) => q.meta.arm === 'solo' && q.meta.type === 'exposed'), z = ex.filter((q) => q.meta.onZero).length; assert.equal(ex.length, 16); assert.ok(z >= 3 && z <= 10, String(z));
  for (const q of ex) assert.equal(q.meta.onZero, q.meta.all.find((r) => r.id === q.meta.outsiderId).item === 0);
  for (const q of rows) { assert.equal(q.params.system.includes('escalate-'), q.meta.arm !== 'solo'); assert.equal(q.params.system.includes('handles that case'), q.meta.arm === 'disjoint'); }
});
test('decision rules', () => {
  const rows = wave(), run = (fires) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && fires(m); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run((m) => m.arm === 'solo' || m.arm === 'disjoint' || (m.arm === 'narrow' && !m.onZero)).tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported' });
  assert.deepEqual(run(() => true).tests, { P1: 'refuted', P2: 'not supported', P3: 'supported', P4: 'supported' });
  assert.equal(run(() => false).tests.P1, 'inconclusive'); assert.equal(ARMS.length, 4);
});
