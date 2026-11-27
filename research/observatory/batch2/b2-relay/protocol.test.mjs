import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, wave, ceiling, score, gate, summarize, verdict, expectedClaims, scoreClaims, ARMS, SEEDS, WAVES } from './protocol.mjs';

const perfect = (rows) => new Map(rows.map((q) => [q.custom_id, { output: { briefing: 'b', claims: expectedClaims(q.meta.records) }, stopReason: 'end_turn' }]));

test('cases: 24 unique seeds, 8 archetypes x 3, ids unique', () => {
  const cases = makeCases();
  assert.equal(cases.length, 24); assert.equal(new Set(cases.map((c) => c.seed)).size, 24);
  assert.equal(new Set(cases.flatMap((c) => c.records.map((r) => r.id))).size, cases.reduce((n, c) => n + c.records.length, 0));
  for (let p = 0; p < 8; p++) assert.equal(cases.filter((c) => c.pattern === p).length, 3);
});
test('waves: 96 + 48 + 48 + 48 requests with unique ids, arms differ only by forwarded field', () => {
  const all = new Map(); const sizes = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, all); sizes.push(rows.length); for (const [id, v] of perfect(rows)) all.set(id, v); if (k > 0) for (const q of rows) { const up = JSON.parse(q.params.messages[0].content).upstream; assert.ok(up.every((u) => (q.meta.arm === 'struct' ? 'claims' in u && !('briefing' in u) : 'briefing' in u && !('claims' in u)))); } }
  assert.deepEqual(sizes, [96, 48, 48, 48]); assert.equal(all.size, 240);
  for (let k = 1; k < WAVES; k++) assert.equal(ceiling(k).length, 48);
});
test('deterministic relay of perfect outputs scores exact at every hop and passes the gate', () => {
  const all = new Map(), scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, all); for (const [id, v] of perfect(rows)) all.set(id, v); const s = score(k, rows, all); scored.push(s); assert.ok(s.every((x) => x.exact && x.citationSupported)); assert.equal(gate(k, s), null); }
  assert.equal(summarize(scored).verdict, 'refuted'); // identical arms = no difference
});
test('scoring catches a dropped id, a wrong citation and a lost conflict', () => {
  const c = makeCases().find((x) => x.archetype === 'single-conflict'), want = expectedClaims(c.records);
  const dropped = want.map((x, i) => (i === 0 ? { ...x, evidence_ids: x.evidence_ids.slice(1) } : x));
  assert.equal(scoreClaims(dropped, c.records).exact, false); assert.equal(scoreClaims(dropped, c.records).missingIds, 1);
  const wrong = want.map((x, i) => (i === 0 ? { ...x, evidence_ids: ['rl-0000-q0-A'] } : x));
  assert.equal(scoreClaims(wrong, c.records).citationSupported, false);
  const collapsed = want.filter((x) => !(x.value === 0));
  assert.ok(scoreClaims(collapsed, c.records).missingPairs >= 1);
});
test('gate and decision rule', () => {
  const rows = wave(0), bad = new Map(rows.map((q, i) => [q.custom_id, { output: i < 20 ? null : { briefing: 'b', claims: expectedClaims(q.meta.records) } }]));
  assert.equal(gate(0, score(0, rows, bad)), 'invalid-output-stop');
  const h = (s, p) => ({ struct: { exact: s }, prose: { exact: p } });
  assert.equal(verdict({ 1: h(24, 20), 2: h(24, 15), 3: h(23, 10) }), 'supported');
  assert.equal(verdict({ 1: h(24, 24), 2: h(24, 23), 3: h(23, 22) }), 'refuted');
  assert.equal(verdict({ 1: h(24, 22), 2: h(24, 20), 3: h(24, 19) }), 'inconclusive');
  assert.equal(ARMS.length * SEEDS.length, 48);
});
