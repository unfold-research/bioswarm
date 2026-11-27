import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleSeeds } from './phase1b/case.mjs';
import { requireDispatch } from './phase1b/attempts.mjs';
import { accepted, criteria, efficiencySensitivity, h1b01, h1b02, h1b03 } from './phase1b/gates.mjs';

function attempts() {
  return sampleSeeds.flatMap((seed) => ['B', 'C'].map((arm) => ({
    seed, arm, run: seed + arm, comparable: true, end: 'complete', review: 'accepted',
    weightedUsd: arm === 'B' ? 2 : 1, observedWallSeconds: arm === 'B' ? 2300 : 1800,
    acceptance: { balances: true, exceptions: true, memoTotals: true }, deterministicAccepted: true,
  })));
}
test('one operational retry, with a distinct run ID; an unclassified failure cannot be retried automatically', () => {
  const incident = { index: 4, run: 'first', comparable: false, incident: 'host_disk' };
  requireDispatch([incident], 4);
  assert.throws(() => requireDispatch([incident, { ...incident, run: 'second' }], 4));
  assert.throws(() => requireDispatch([{ ...incident, incident: 'low_score' }], 4));
  assert.throws(() => requireDispatch([{ ...incident, comparable: true }], 4));
});
test('treatment failure suspends even a different case or arm, without using the score', () => {
  const rows = attempts();
  rows[0].policyReceived = false;
  assert.throws(() => requireDispatch(rows, 17), /integrity/);
  for (const hypothesis of [h1b01, h1b02, h1b03]) assert.equal(hypothesis(rows), 'inconclusiva');
});
test('an incomplete pair cannot support a claim; incidents can reverse the cost sensitivity', () => {
  const rows = attempts();
  const incident = { ...rows[1], run: 'first', comparable: false, incident: 'provider_5xx', weightedUsd: 10 };
  assert.equal(h1b01(rows), 'sustentada');
  for (const hypothesis of [h1b01, h1b02, h1b03]) assert.equal(hypothesis([rows[0], incident, ...rows.slice(2)]), 'inconclusiva');
  const out = efficiencySensitivity([incident, ...rows]);
  assert.equal(out.costs.C, 1);
  assert.ok(out.costsWithIncidents.C > out.costs.B);
  assert.equal(out.primary, 'sustentada');
  assert.equal(out.verdict, 'inconclusiva');
  assert.equal(h1b02([incident, ...rows]), 'sustentada');
});
test('timeout, idle or arm failure prevents acceptance while preserving the criteria', () => {
  const [r] = attempts();
  for (const end of ['timeout', 'idle', 'arm_failure']) {
    assert.equal(accepted({ ...r, end }), false);
    assert.equal(criteria({ ...r, end }), 4);
  }
  assert.equal(accepted({ ...r, review: 'missing' }), false);
  assert.equal(criteria({ ...r, review: 'missing' }), 3);
  assert.equal(accepted({ ...r, review: 'indeterminate' }), null);
});
