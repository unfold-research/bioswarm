import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('240 requests; cards only in the system prompt; priorities as described', () => {
  const rows = wave(); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240);
  for (const q of rows) { const s = q.params.system; assert.ok(!q.params.messages[0].content.includes('INSTINCT')); assert.ok(s.includes('quarantine-lone-unverified')); assert.equal(s.includes('escalate-lone-unverified'), q.meta.arm !== 'solo');
    if (q.meta.arm === 'priority') assert.match(s, /quarantine-lone-unverified, version 1\nPriority: 2\n/); if (q.meta.arm === 'priority-rev') assert.match(s, /escalate-lone-unverified, version 1\nPriority: 2\n/);
    if (q.meta.arm === 'rival') assert.ok(s.indexOf('quarantine-lone') < s.indexOf('escalate-lone')); if (q.meta.arm === 'rival-first') assert.ok(s.indexOf('quarantine-lone') > s.indexOf('escalate-lone')); }
});
test('decision rules', () => {
  const rows = wave(), run = (fires) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && fires.includes(m.arm); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  const a = run(['solo', 'priority']); assert.equal(a.arms.solo.effect, 16); assert.equal(a.arms.rival.rivalWon, 16); assert.deepEqual(a.tests, { P1: 'supported', P2: 'not supported', P3: 'supported', P4: 'supported' });
  const b = run(ARMS); assert.equal(b.tests.P1, 'refuted'); assert.equal(b.tests.P3, 'not supported');
  const c = run(['solo', 'rival']); assert.equal(c.tests.P1, 'not supported'); assert.equal(c.tests.P2, 'supported');
  assert.equal(run([]).tests.P1, 'inconclusive');
});
