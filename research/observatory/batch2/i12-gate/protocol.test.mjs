import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, makeCases, ARMS } from './protocol.mjs';
import { expectedClaims, DONOR_CARD } from '../i1-transplant/protocol.mjs';
test('9 admission requests with the template; 56 cases including 8 agree cases, 3 of them about indicator 0', () => {
  const rows = wave(0); assert.equal(rows.length, 9); for (const q of rows) assert.ok(q.params.system.includes('Otherwise, trigger:'));
  const cases = makeCases(), agree = cases.filter((c) => c.type === 'agree'); assert.equal(cases.length, 56); assert.equal(new Set(cases.map((c) => c.seed)).size, 56); assert.equal(agree.length, 8); assert.equal(agree.filter((c) => c.target === 0).length, 3);
  for (const c of agree) { const x = c.records.find((r) => !r.trusted); assert.equal(x.value, c.records.find((r) => r.trusted && r.item === x.item).value); }
  const c1 = ceiling(1); assert.equal(c1.length, 560); assert.equal(new Set(c1.map((q) => q.custom_id)).size, 560); for (const q of c1) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
});
test('gate and decision rules', () => {
  const card = DONOR_CARD.replace('quarantine-lone-unverified, version 1', 'merged, version 2'), w0 = wave(0), out = new Map(w0.map((q) => [q.custom_id, { output: { collides: true, reason: '', resolution: 'merge', merged_card: card } }]));
  const s0 = score(0, w0, out); assert.equal(gate(0, s0), null); assert.ok(s0.every((x) => x.followsTemplate)); const w1 = wave(1, out); assert.equal(w1.length, 560);
  // executor: solo and every set fire on exposed cases, except narrow-s2 which escalates; on agree cases broad sets escalate, the rest give the label
  const reply = (q) => { const m = q.meta, f = m.type === 'exposed' && q.meta.arm !== 'narrow-s2', esc = m.type === 'agree' && m.arm.startsWith('broad');
    return { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : esc ? 'unsure' : m.ruleOnlyVerdict, note: '' } }; };
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, reply(q)])))]);
  assert.equal(sum.solo.effect, 16); assert.equal(sum.admittedSets, 8); assert.equal(sum.sets['narrow-s2'].admitted, false); assert.equal(sum.narrowAdmitted, 2);
  assert.deepEqual(sum.newcomerKeptAmongAdmitted, { kept: 24, of: 30 }); assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'supported' }); assert.equal(ARMS.length, 10);
});
