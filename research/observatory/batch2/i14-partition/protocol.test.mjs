import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, makeCases } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('9 admission requests asking for a partition; two case sets of 56 with distinct seeds', () => {
  const rows = wave(0); assert.equal(rows.length, 9); for (const q of rows) { assert.ok(q.params.system.includes('Action, if <condition A>')); assert.ok(q.params.system.includes('Never write "otherwise"')); }
  const cases = makeCases(); assert.equal(cases.length, 112); assert.equal(new Set(cases.map((c) => c.seed)).size, 112); for (const s of ['gate', 'held']) { const c = cases.filter((x) => x.set === s); assert.equal(c.length, 56); assert.equal(c.filter((x) => x.type === 'exposed').length, 16); assert.equal(c.filter((x) => x.type === 'agree').length, 8); }
  const c1 = ceiling(1); assert.equal(c1.length, 1120); assert.equal(new Set(c1.map((q) => q.custom_id)).size, 1120); for (const q of c1) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
});
test('gate on one set, check on the other', () => {
  const card = 'INSTINCT m, version 2\nTrigger: t\nAction, if a: x\nAction, if b: y', w0 = wave(0), out = new Map(w0.map((q) => [q.custom_id, { output: { collides: true, reason: '', resolution: 'merge', merged_card: card } }]));
  const s0 = score(0, w0, out); assert.equal(gate(0, s0), null); assert.ok(s0.every((x) => x.followsTemplate)); assert.equal(score(0, w0, new Map(w0.map((q) => [q.custom_id, { output: { collides: true, reason: '', resolution: 'merge', merged_card: card + '\nAction, otherwise: z' } }])))[0].followsTemplate, false);
  const w1 = wave(1, out);
  // narrow-s2 fails everywhere (refused at the gate); broad-s1 passes the gate and fails on the held-out set; broad sets escalate agree cases
  const reply = (q) => { const m = q.meta, f = m.type === 'exposed' && m.arm !== 'narrow-s2' && !(m.arm === 'broad-s1' && m.set === 'held'), esc = m.type === 'agree' && m.arm.startsWith('broad');
    return { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : esc ? 'unsure' : m.ruleOnlyVerdict, note: '' } }; };
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, reply(q)])))]);
  assert.equal(sum.solo.gate.effect, 16); assert.equal(sum.admittedSets, 8); assert.equal(sum.narrowAdmitted, 2); assert.equal(sum.admittedThatFailHeldOut, 1); assert.equal(sum.sets['broad-s1'].holds, false); assert.equal(sum.sets['narrow-s2'].holds, null);
  assert.deepEqual(sum.newcomerKeptAmongAdmitted, { kept: 48, of: 60 }); assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'supported' });
});
