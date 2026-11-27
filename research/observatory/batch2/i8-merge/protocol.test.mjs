import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('240 requests; which cards each arm installs', () => {
  const rows = wave(); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240);
  for (const q of rows) { const s = q.params.system, a = q.meta.arm; assert.equal((s.match(/INSTINCT /g) || []).length, a === 'rival' ? 2 : 1); assert.equal(s.includes('handle-lone-unverified, version 2'), a === 'merged' || a === 'branch'); assert.equal(s.includes('Refused at admission'), a === 'refused'); }
});
test('decision rules', () => {
  const rows = wave(), run = (act) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && act(m); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run((m) => (m.arm === 'rival' ? false : m.arm === 'branch' ? !m.onZero : true)).tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported', P5: 'supported' });
  const b = run((m) => m.arm === 'solo' || m.arm === 'rival' || m.arm === 'branch'); assert.deepEqual([b.tests.P1, b.tests.P2, b.tests.P3, b.tests.P4], ['not supported', 'not supported', 'not supported', 'not supported']);
  assert.equal(run(() => false).tests.P2, 'inconclusive');
});
