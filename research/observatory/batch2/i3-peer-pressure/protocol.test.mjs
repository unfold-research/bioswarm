import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('96 requests; the card is only in the input, never in the system prompt', () => {
  const rows = wave(); assert.equal(rows.length, 96); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 96);
  for (const q of rows) { assert.ok(!q.params.system.includes('INSTINCT')); assert.ok(q.params.messages[0].content.includes('INSTINCT')); }
});
test('decision rule', () => {
  const rows = wave(), reply = (q, fire) => { const m = q.meta, f = fire && m.type === 'exposed'; return { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }; };
  assert.equal(summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, reply(q, false)])))]).test, 'supported');
  const s = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, reply(q, q.meta.arm === 'p4')])))]); assert.equal(s.test, 'not supported'); assert.equal(s.firstLevelAdopted, 'p4');
});
