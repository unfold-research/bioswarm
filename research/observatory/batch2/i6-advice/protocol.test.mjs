import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('240 requests per family; where the instinct text sits', () => {
  for (const f of ['review', 'triage']) { const rows = wave(f); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240);
    for (const q of rows) { const c = JSON.parse(q.params.messages[0].content); assert.equal('note_from_another_agent' in c, ['peer', 'irrelevant', 'chatter'].includes(q.meta.arm)); assert.equal(q.params.system.includes('INSTINCT'), q.meta.arm === 'op-irrelevant'); assert.equal(q.params.messages[0].content.includes('INSTINCT'), ['peer', 'irrelevant'].includes(q.meta.arm)); assert.ok(!q.params.system.includes('quarantine-lone')); } }
});
test('decision rules', () => {
  const rows = wave('review'), run = (who) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && who.includes(m.arm); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run(['none', 'chatter', 'op-irrelevant']).tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported' });
  assert.deepEqual(run(ARMS).tests, { P1: 'refuted', P2: 'refuted', P3: 'supported', P4: 'supported' });
  assert.equal(run(['none']).tests.P3, 'not supported'); assert.equal(run([]).tests.P1, 'inconclusive');
});
