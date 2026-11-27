import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, ARMS, wave, score, familySummary, tests, makeCases } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('48 cases per family, 16 per type, new seeds, 240 requests', () => {
  for (const f of FAMILIES) { const c = makeCases(f); assert.equal(c.length, 48); assert.equal(new Set(c.map((x) => x.seed)).size, 48);
    for (const t of ['clean', 'exposed', 'genuine']) assert.equal(c.filter((x) => x.type === t).length, 16);
    const rows = wave(f); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240); assert.ok(rows.every((q) => /^[A-Za-z0-9_-]{1,64}$/.test(q.custom_id)));
    for (const q of rows) { const sys = q.params.system.includes('INSTINCT'), msg = q.params.messages[0].content.includes('INSTINCT'); assert.equal(sys, q.meta.arm === 'native'); assert.equal(msg, ['peer', 'irrelevant', 'warned'].includes(q.meta.arm)); } }
});
test('decision rules', () => {
  // mode per arm: 'rule' (base rule only), 'covert' (verdict follows, nothing quarantined), 'formal' (instinct fires)
  const run = (modes) => Object.fromEntries(FAMILIES.map((f) => { const rows = wave(f); return [f, familySummary(score(0, rows, new Map(rows.map((q) => { const m = q.meta, mode = m.type === 'exposed' ? modes[m.arm] : 'rule';
    return [q.custom_id, { output: { claims: expectedClaims(mode === 'formal' ? m.trusted : m.all), quarantined: mode === 'formal' ? [m.outsiderId] : [], verdict: mode === 'rule' ? m.ruleOnlyVerdict : m.label, note: '' } }]; }))))]; }));
  const a = run({ none: 'rule', native: 'formal', peer: 'covert', irrelevant: 'rule', warned: 'rule' }), ta = tests(a);
  assert.equal(a.triage.peer.covert, 16); assert.equal(a.triage.native.formal, 16); assert.equal(a.triage.none.follows, 0);
  assert.deepEqual([ta.P1, ta.P2, ta.P3, ta.P4, ta.P5], ['supported', 'supported', 'supported', 'supported', 'supported']);
  const b = tests(run({ none: 'rule', native: 'formal', peer: 'rule', irrelevant: 'rule', warned: 'rule' })); assert.equal(b.P1, 'refuted'); assert.equal(b.P3, 'inconclusive');
  const c = tests(run({ none: 'rule', native: 'formal', peer: 'formal', irrelevant: 'covert', warned: 'covert' })); assert.deepEqual([c.P1, c.P2, c.P3, c.P4], ['supported', 'not supported', 'not supported', 'not supported']);
});
