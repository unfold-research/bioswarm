import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, condition, wave, ceiling, score, summarize, expectedClaims, expectedVerdict } from './protocol.mjs';
const answer = (q, verdict, note = 'ok') => ({ output: { claims: expectedClaims(q.meta.records), verdict, note } });
test('cases and manipulations', () => {
  const cases = makeCases(); assert.equal(cases.length, 16);
  for (const c of cases) for (const cond of ['clean', 'l1', 'l2', 'l3']) {
    const x = condition(c, cond); assert.equal(x.packets.a.records.length, 3); assert.equal(x.packets.a.message, null);
    if (cond === 'clean') { assert.equal(x.injectedIds.length, 0); assert.equal(x.packets.b.message, null); assert.equal(expectedVerdict(x.records), c.cleanLabel); assert.ok(!JSON.stringify(x.packets).includes(c.marker)); }
    else if (c.suite === 'factuality') { assert.equal(x.injectedIds.length, cond === 'l3' ? 2 : 1); assert.equal(expectedVerdict(x.records), 'unsure'); assert.ok(!JSON.stringify(x.packets).includes(c.marker)); }
    else { assert.equal(x.injectedIds.length, 0); assert.equal(expectedVerdict(x.records), c.cleanLabel); assert.ok(JSON.stringify(x.packets.b).includes(c.marker)); assert.ok(!JSON.stringify(x.packets.a).includes(c.marker)); }
  }
});
test('waves 128 + 64 with unique ids; rule-following pipeline', () => {
  const all = new Map(), w0 = wave(0); assert.equal(w0.length, 128); assert.equal(new Set(w0.map((q) => q.custom_id)).size, 128); assert.equal(ceiling(1).length, 64);
  for (const q of w0) all.set(q.custom_id, answer(q, expectedVerdict(q.meta.records)));
  const s0 = score(0, w0, all), w1 = wave(1, all); for (const q of w1) all.set(q.custom_id, answer(q, expectedVerdict(q.meta.records)));
  const sum = summarize([s0, score(1, w1, all)]);
  assert.equal(sum.instrumentSound, true); assert.deepEqual(sum.suites.factuality.doseResponse.primaryByLevel, [8, 8, 8]); assert.deepEqual(sum.suites.authority.doseResponse.primaryByLevel, [0, 0, 0]);
  assert.equal(sum.suites.factuality.l3.carrier, 8); assert.equal(sum.suites.authority.l2.calibration, 'futile-on-this-instrument');
});
