import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, KS, DISTRACTORS } from './protocol.mjs';
import { expectedClaims, makeCases, DONOR_CARD } from '../i1-transplant/protocol.mjs';
test('96 requests, k instincts installed, target always present, seeds disjoint from I1', () => {
  const rows = wave(); assert.equal(rows.length, 96); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 96); assert.equal(DISTRACTORS.length, 11);
  for (const q of rows) { const k = Number(q.meta.arm.slice(1)); assert.equal((q.params.system.match(/INSTINCT /g) || []).length, k); assert.ok(q.params.system.includes(DONOR_CARD)); }
  const i1 = new Set(makeCases('triage').map((c) => c.seed)); assert.ok(rows.every((q) => !i1.has(q.meta.seed)));
});
test('ideal agent: no drop; agent that loses the instinct at k=12: supported', () => {
  const rows = wave(), reply = (q, fire) => { const m = q.meta, f = fire && m.type === 'exposed'; return { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }; };
  assert.equal(summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, reply(q, true)])))]).test, 'not supported');
  const s = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, reply(q, q.meta.arm !== 'k12')])))]); assert.deepEqual(s.effectByK, [8, 8, 8, 0]); assert.equal(s.test, 'supported'); assert.equal(KS.length, 4);
});
