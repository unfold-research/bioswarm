import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize, CARDS } from './protocol.mjs';
import { expectedClaims } from '../i1-transplant/protocol.mjs';
test('288 requests, 32 exposed cases per arm, 12 of them about indicator 0; the two branch cards are mirror images', () => {
  const rows = wave(); assert.equal(rows.length, 288); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 288);
  const ex = rows.filter((q) => q.meta.arm === 'solo' && q.meta.type === 'exposed'); assert.equal(ex.length, 32); assert.equal(ex.filter((q) => q.meta.onZero).length, 12);
  assert.ok(CARDS.branchA.includes('Action, if that record is about indicator 0: treat it as a real conflict')); assert.ok(CARDS.branchB.includes('Action, if that record is about indicator 0: do not treat it as a conflict')); assert.equal(CARDS.branchA.length, CARDS.branchB.length);
});
test('decision rules', () => {
  const rows = wave(), run = (q8) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, f = m.type === 'exposed' && q8(m); return [q.custom_id, { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }]; })))]);
  assert.deepEqual(run((m) => m.arm === 'solo' || (m.arm === 'branchA' ? !m.onZero : m.onZero)).tests, { P1: 'supported', P2: 'supported', P3: 'supported' });
  const biased = run((m) => m.arm === 'solo' || !m.onZero).tests; assert.equal(biased.P1, 'supported'); assert.equal(biased.P2, 'not supported');
  assert.equal(run(() => false).tests.P1, 'inconclusive');
});
