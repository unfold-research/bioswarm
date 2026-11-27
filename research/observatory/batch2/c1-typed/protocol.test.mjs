import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, ARMS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('384 requests, 32 exposed cases per arm, one system prompt, no rule anywhere', () => {
  const rows = wave(); assert.equal(rows.length, 384); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 384); assert.equal(new Set(rows.map((q) => q.params.system)).size, 1); assert.equal(rows.filter((q) => q.meta.arm === 'none' && q.meta.type === 'exposed').length, 32);
  for (const q of rows) { const c = JSON.parse(q.params.messages[0].content), s = JSON.stringify(q.params); assert.ok(!s.includes('INSTINCT')); assert.equal('note_from_another_agent' in c, q.meta.arm === 'note'); assert.equal((c.field_traces || []).length, { none: 0, note: 0, table: 3, 'table-large': 9 }[q.meta.arm]); }
});
test('decision rules', () => {
  const rows = wave(), run = (who) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && who(m); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  const half = (m) => m.seed % 2 === 0;
  assert.deepEqual(run((m) => m.arm !== 'note' && half(m)).tests, { P1: 'supported', P2: 'supported', P3: 'supported' });
  assert.deepEqual(run((m) => m.arm === 'none' && half(m)).tests, { P1: 'supported', P2: 'not supported', P3: 'not supported' });
  assert.equal(run(() => false).tests.P1, 'inconclusive'); assert.equal(ARMS.length, 4);
});
