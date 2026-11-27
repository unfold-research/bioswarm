import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS, PRESERVE } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('240 review requests with no note; what the operator text contains', () => {
  const rows = wave(); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240);
  for (const q of rows) { const s = q.params.system, a = q.meta.arm; assert.ok(!q.params.messages[0].content.includes('note_from')); assert.ok(!s.includes('quarantine-lone')); assert.equal(s.includes('stale-record'), a === 'op-quarantine' || a === 'op-preserve'); assert.equal(s.includes('flag-long-case'), a === 'op-other'); assert.equal(s.includes(PRESERVE), a === 'op-preserve'); assert.equal(s.includes('British'), a === 'op-style'); }
});
test('decision rules', () => {
  const rows = wave(), run = (who) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && who.includes(m.arm); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run(['none', 'op-other', 'op-style', 'op-preserve']).tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported' });
  assert.deepEqual(run(['none']).tests, { P1: 'supported', P2: 'not supported', P3: 'not supported', P4: 'not supported' });
  assert.equal(run(ARMS).tests.P1, 'not supported'); assert.equal(run([]).tests.P4, 'inconclusive');
});
