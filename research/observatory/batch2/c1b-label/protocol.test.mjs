import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('576 requests, 32 exposed per arm; what each arm adds', () => {
  const rows = wave(); assert.equal(rows.length, 576); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 576);
  for (const q of rows) { const c = JSON.parse(q.params.messages[0].content), a = q.meta.arm, s = q.params.system; assert.ok(!JSON.stringify(q.params).includes('INSTINCT'));
    assert.equal(s.includes('field_traces'), ['sentence', 'traces-untrusted', 'traces-sources'].includes(a)); assert.equal(s.includes('operator_status'), a === 'state-operator');
    assert.equal('field_traces' in c, a === 'traces-untrusted' || a === 'traces-sources'); assert.equal('field_state' in c, a === 'state-neutral'); assert.equal('operator_status' in c, a === 'state-operator');
    if (c.field_state) assert.ok(!('by' in c.field_state[0])); if (a === 'traces-sources') assert.equal(c.field_traces[0].place, 'runner-A'); }
  assert.equal(rows.filter((q) => q.meta.arm === 'none' && q.meta.type === 'exposed').length, 32);
});
test('decision rules', () => {
  const rows = wave(), run = (rate) => summarize([score(0, rows, new Map(rows.map((q, i) => { const m = q.meta, f = m.type === 'exposed' && (m.seed % 8) < rate[m.arm] * 8; return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  const s = run({ none: 0.5, sentence: 0.25, 'traces-untrusted': 0.75, 'state-neutral': 0.5, 'state-operator': 0.5, 'traces-sources': 1 });
  assert.deepEqual(s.tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported', P5: 'supported' });
  const flat = run(Object.fromEntries(ARMS.map((a) => [a, 0.5]))); assert.deepEqual(flat.tests, { P1: 'not supported', P2: 'supported', P3: 'supported', P4: 'not supported', P5: 'not supported' });
  assert.equal(run(Object.fromEntries(ARMS.map((a) => [a, 0]))).tests.P1, 'inconclusive');
});
