import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, wave, score, gate, summarize, triggerHolds, KINDS } from './protocol.mjs';
test('64 cases, 16 per kind, distinct seeds; the stale record agrees with the CI runs; the card is where the arm says', () => {
  const cases = makeCases(); assert.equal(cases.length, 64); assert.equal(new Set(cases.map((c) => c.seed)).size, 64); for (const k of KINDS) assert.equal(cases.filter((c) => c.kind === k).length, 16);
  for (const c of cases) { assert.equal(triggerHolds(c.records), c.kind.includes('stale')); assert.equal(new Set(c.records.map((r) => r.id)).size, c.records.length); if (c.staleId) { const s = c.records.find((r) => r.id === c.staleId), twin = c.records.find((r) => r.id !== c.staleId && r.check === s.check && r.origin === 'ci-run'); assert.equal(s.result, twin.result); assert.equal(s.origin, 'ci-run'); } }
  const rows = wave(); assert.equal(rows.length, 192); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 192);
  for (const q of rows) { const has = q.params.system.includes('stale-record'); assert.equal(has, q.meta.arm === 'always' || (q.meta.arm === 'on-trigger' && q.meta.kind.includes('stale'))); assert.equal(has, q.meta.card); }
  const same = (a, b, kind) => rows.filter((q) => q.meta.arm === a && q.meta.kind === kind).every((q) => JSON.stringify(q.params) === JSON.stringify(rows.find((x) => x.meta.arm === b && x.meta.seed === q.meta.seed).params));
  assert.ok(same('on-trigger', 'none', 'exposed')); assert.ok(same('on-trigger', 'always', 'stale'));
});
test('decision rules', () => {
  const rows = wave(), LABELS = ['approve', 'reject'];
  const run = (unprompted) => summarize([score(0, rows, new Map(rows.map((q) => { const m = q.meta, qu = []; if (m.card && m.staleId) qu.push(m.staleId); if (m.kind.startsWith('exposed') && unprompted(m)) qu.push(m.outsiderId);
    return [q.custom_id, { output: { claims: [], quarantined: qu, verdict: m.label, note: '' } }]; })))]);
  const s = run((m) => !m.card); assert.equal(gate(0, score(0, rows, new Map())), 'invalid-output-stop');
  assert.deepEqual(s.tests, { P1: 'supported', P2: 'supported', P3: 'supported', P4: 'not supported' }); assert.equal(s.table['on-trigger'].exposed.unverified, 16); assert.equal(s.table.always.exposed.unverified, 0);
  assert.deepEqual(run(() => true).tests, { P1: 'not supported', P2: 'supported', P3: 'supported', P4: 'supported' }); assert.ok(LABELS.length);
});
