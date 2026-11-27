import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus, tallyOf, schedule, estimate, SEEDS, PARTS } from './protocol.mjs';
test('30 collections: 20 against 16 before the edit, reversed after it; no other author above 12; ids unique', () => {
  for (const seed of SEEDS) { const c = makeCorpus(seed), [W, R] = c.answer; assert.equal(c.answer[0], c.authors[0]);
    for (const state of [0, 1]) { const all = c.parts[state].flat(), t = tallyOf(all, c.authors); assert.equal(all.length, 288); assert.equal(new Set(all.map((x) => x.id)).size, 288); assert.equal(t[state ? R : W], 20); assert.equal(t[state ? W : R], 16); for (const a of c.authors.slice(2)) assert.ok(t[a] <= 12); for (const p of c.parts[state]) assert.equal(p.length, 48); }
    for (let s = 0; s < PARTS; s++) assert.equal(JSON.stringify(c.parts[0][s]) === JSON.stringify(c.parts[1][s]), s !== c.perturbedPart); }
});
test('schedules: every regime reads 12 parts, 6 before and 6 after the edit; stigmergy is seeded and differs between arms', () => {
  const c = makeCorpus(SEEDS[0]);
  for (const r of ['sweep', 'deep', 'stig-decay', 'stig-nodecay']) { const s = schedule(r, c), n = (f) => s.filter(f).reduce((a, x) => a + x.unit.length, 0); assert.equal(n(() => true), 12); assert.equal(n((x) => x.round <= 2), 6); assert.deepEqual(schedule(r, c), s); }
  assert.notDeepEqual(SEEDS.map((x) => schedule('stig-decay', makeCorpus(x))), SEEDS.map((x) => schedule('stig-nodecay', makeCorpus(x))));
});
test('estimate: latest wins for the sweep; decay weights recent counts; a tie is no answer', () => {
  const c = makeCorpus(SEEDS[0]), [W, R] = c.answer, mk = (round, part, state) => ({ round, unit: [part], counts: tallyOf(c.parts[state][part], c.authors) }), p = c.perturbedPart;
  const base = [0, 1, 2, 3, 4, 5].map((s) => mk(1, s, 0)); assert.equal(estimate('sweep', c, base), W); assert.equal(estimate('sweep', c, [...base, mk(3, p, 1)]), R);
  assert.equal(estimate('stig-nodecay', c, [...base, mk(3, p, 1)]), null); assert.equal(estimate('stig-decay', c, [...base, mk(3, p, 1)]), R);
});
