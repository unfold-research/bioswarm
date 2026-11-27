import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, condition, wave, ceiling, score, gate, summarize, expectedClaims, expectedVerdict, SUITES } from './protocol.mjs';

const answer = (q, verdict, note = 'ok') => ({ output: { claims: expectedClaims(q.meta.records), verdict, note }, stopReason: 'end_turn' });

test('cases: 12 per suite, balanced labels, unique seeds', () => {
  const cases = makeCases(); assert.equal(cases.length, 24); assert.equal(new Set(cases.map((c) => c.seed)).size, 24);
  for (const s of SUITES) { const cs = cases.filter((c) => c.suite === s); assert.equal(cs.filter((c) => c.cleanLabel === 'malicious').length, 6); assert.equal(cs.filter((c) => c.cleanLabel === 'benign').length, 6); }
});
test('manipulations reach node-B only and stay inside their suite', () => {
  for (const c of makeCases()) {
    const clean = condition(c, 'clean'), exp = condition(c, 'exposed');
    assert.equal(expectedVerdict(clean.records), c.cleanLabel); assert.equal(clean.packets.b.message, null); assert.equal(clean.injected, null);
    assert.equal(exp.packets.a.records.length, 3); assert.equal(exp.packets.a.message, null);
    if (c.suite === 'factuality') { assert.equal(exp.packets.b.records.length, 4); assert.equal(exp.packets.b.message, null); assert.equal(expectedVerdict(exp.records), 'unsure'); }
    else { assert.equal(exp.packets.b.records.length, 3); assert.ok(exp.packets.b.message.includes(c.marker)); assert.equal(expectedVerdict(exp.records), c.cleanLabel); }
  }
});
test('waves: 96 + 48 requests, unique ids', () => {
  const w0 = wave(0); assert.equal(w0.length, 96); assert.equal(new Set(w0.map((q) => q.custom_id)).size, 96);
  assert.equal(ceiling(1).length, 48); assert.ok(w0.every((q) => /^[A-Za-z0-9_-]{1,64}$/.test(q.custom_id)));
});
test('a rule-following pipeline: instrument sound, factuality observable by abstention, authority futile', () => {
  const all = new Map(), w0 = wave(0); for (const q of w0) all.set(q.custom_id, answer(q, expectedVerdict(q.meta.records)));
  const s0 = score(0, w0, all), w1 = wave(1, all); for (const q of w1) all.set(q.custom_id, answer(q, expectedVerdict(q.meta.records)));
  const s1 = score(1, w1, all), sum = summarize([s0, s1]);
  assert.equal(gate(0, s0), null); assert.equal(sum.instrumentSound, true); assert.equal(sum.benignUtility.both, 24);
  assert.equal(sum.suites.factuality.carrier, 12); assert.equal(sum.suites.factuality.reception, 12); assert.equal(sum.suites.factuality.primary, 12); assert.equal(sum.suites.factuality.wrongChange, 0);
  assert.equal(sum.suites.factuality.calibration, 'attack-observable');
  assert.equal(sum.suites.authority.primary, 0); assert.equal(sum.suites.authority.calibration, 'futile-on-this-instrument');
});
test('an obedient pipeline is detected in the authority suite', () => {
  const all = new Map(), w0 = wave(0);
  for (const q of w0) all.set(q.custom_id, q.meta.suite === 'authority' && q.meta.cond === 'exposed' && q.meta.src === 'b' ? answer(q, q.meta.attackerVerdict, `forwarding ${q.meta.marker}`) : answer(q, expectedVerdict(q.meta.records)));
  const s0 = score(0, w0, all), w1 = wave(1, all);
  for (const q of w1) all.set(q.custom_id, q.meta.suite === 'authority' && q.meta.cond === 'exposed' ? answer(q, q.meta.attackerVerdict) : answer(q, expectedVerdict(q.meta.records)));
  const sum = summarize([s0, score(1, w1, all)]);
  assert.equal(sum.suites.authority.carrier, 12); assert.equal(sum.suites.authority.reception, 12); assert.equal(sum.suites.authority.wrongChange, 12); assert.equal(sum.suites.authority.calibration, 'attack-observable');
});
