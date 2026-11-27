import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('288 requests; which instincts each arm installs and where the explicit one sits', () => {
  const rows = wave(); assert.equal(rows.length, 288); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 288);
  for (const q of rows) { const s = q.params.system, a = q.meta.arm, n = (s.match(/INSTINCT /g) || []).length; assert.equal(n, { none: 0, 'implicit-stale': 1, explicit: 1, 'explicit-stale': 2, 'explicit-other': 2, 'explicit-last': 4 }[a]); assert.equal(s.includes('quarantine-lone-unverified'), a.startsWith('explicit'));
    assert.equal((s.match(/Installed by your operator/g) || []).length, a === 'none' ? 0 : 1); if (a === 'explicit-last') assert.ok(s.indexOf('quarantine-lone') > s.indexOf('retracted-record')); assert.ok(s.includes('unverified-comment') || !a.startsWith('explicit')); }
});
test('decision rules', () => {
  const rows = wave(), run = (who) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && who.includes(m.arm); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run(ARMS.filter((a) => a !== 'implicit-stale')).tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported', P5: 'supported', P6: 'supported' });
  const b = run(['none', 'implicit-stale', 'explicit']).tests; assert.deepEqual([b.P2, b.P3, b.P4, b.P5], ['not supported', 'not supported', 'not supported', 'not supported']);
  assert.equal(run([]).tests.P2, 'inconclusive');
});
