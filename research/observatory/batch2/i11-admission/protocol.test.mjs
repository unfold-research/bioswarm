import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, installedFor, NEWCOMERS, COLLIDES, CARD_LIMIT } from './protocol.mjs';
import { expectedClaims, DONOR_CARD } from '../i1-transplant/protocol.mjs';
test('12 admission requests; what each decision installs', () => {
  const rows = wave(0); assert.equal(rows.length, 12); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 12);
  for (const q of rows) { const c = JSON.parse(q.params.messages[0].content); assert.equal(c.installed, DONOR_CARD); assert.equal(c.newcomer, NEWCOMERS[q.meta.newcomer]); }
  assert.equal((installedFor('rival', null).match(/INSTINCT /g) || []).length, 2);
  assert.equal((installedFor('rival', { collides: true, reason: '', resolution: 'refuse-newcomer', merged_card: '' }).match(/INSTINCT /g) || []).length, 1);
  const m = installedFor('broad', { collides: true, reason: '', resolution: 'merge', merged_card: 'INSTINCT m, version 1\nTrigger: t\nAction: a' + 'z'.repeat(5000) }); assert.ok(m.includes('INSTINCT m') && !m.includes('quarantine-lone') && m.length < CARD_LIMIT + 100);
  assert.equal((installedFor('broad', { collides: true, reason: '', resolution: 'merge', merged_card: ' ' }).match(/INSTINCT /g) || []).length, 2);
  const c = ceiling(1); assert.equal(c.length, 240); for (const q of c) assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000);
});
test('decision rules: a sound admission agent, then an executor that follows what is installed', () => {
  const w0 = wave(0), out = new Map(w0.map((q) => [q.custom_id, { output: { collides: COLLIDES[q.meta.newcomer], reason: '', resolution: q.meta.newcomer === 'control' ? 'install-both' : 'refuse-newcomer', merged_card: '' } }]));
  const s0 = score(0, w0, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 240);
  for (const q of w1) assert.equal((q.params.system.match(/INSTINCT /g) || []).length, q.meta.arm === 'control' ? 2 : 1);
  const reply = (q, fire) => { const m = q.meta, f = fire && m.type === 'exposed'; return { output: { claims: expectedClaims(f ? m.trusted : m.all), quarantined: f ? [m.outsiderId] : [], verdict: f ? m.label : m.ruleOnlyVerdict, note: '' } }; };
  const good = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, reply(q, true)])))]); assert.deepEqual([good.tests.P1, good.tests.P2, good.tests.P3, good.tests.P4], ['supported', 'supported', 'supported', 'supported']); assert.equal(good.admission.rival.installed, 'refuse-newcomer');
  const bad = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, reply(q, q.meta.arm === 'solo' || q.meta.arm === 'control')])))]); assert.equal(bad.tests.P2, 'not supported'); assert.equal(bad.tests.P3, 'supported');
  const blind = new Map(w0.map((q) => [q.custom_id, { output: { collides: false, reason: '', resolution: 'install-both', merged_card: '' } }])); assert.equal(summarize([score(0, w0, blind)]).tests.P1, 'not supported');
  assert.equal(gate(0, score(0, w0, new Map())), 'invalid-output-stop');
});
