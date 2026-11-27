import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus, tallyOf, SEEDS_OF, PARTS } from './protocol.mjs';
import { probe } from '../kernel/leak-probe.mjs';
test('scatter: three edited parts, none adjacent; poison: a contiguous block and one poisoned part outside it; totals as registered', () => {
  for (const sc of ['scatter', 'poison']) for (const seed of SEEDS_OF[sc]) { const c = makeCorpus(seed, sc), [W, R] = c.answer, t0 = tallyOf(c.parts[0].flat(), c.authors), t1 = tallyOf(c.parts[1].flat(), c.authors);
    assert.equal(t0[W], 20); assert.equal(t0[R], 16); assert.equal(t1[W], 20); assert.equal(t1[R], 25); assert.equal(c.block.length, 3); assert.equal(new Set(c.block).size, 3);
    const adj = (x, y) => Math.abs(x - y) === 1 || Math.abs(x - y) === PARTS - 1, anyAdj = c.block.some((x) => c.block.some((y) => x !== y && adj(x, y)));
    if (sc === 'scatter') { assert.equal(anyAdj, false); assert.equal(c.poison, null); } else { assert.equal(anyAdj, true); assert.ok(c.poison !== null && !c.block.includes(c.poison)); } }
});
test('leak probe: neither the edited parts nor the poisoned part can be located from the first counts', () => {
  for (const sc of ['scatter', 'poison']) { const feats = (c) => c.parts[0].map((recs, part) => { const t = tallyOf(recs, c.authors), [W, R] = c.answer; return { id: part, features: { leader: t[W], runnerUp: t[R], diff: t[W] - t[R], others: c.authors.slice(2).reduce((n, a) => n + t[a], 0) } }; });
    const cs = SEEDS_OF[sc].map((seed) => makeCorpus(seed, sc)); assert.equal(probe(cs.map((c) => ({ targets: c.block, candidates: feats(c) }))).leak, false, sc + ' block');
    if (sc === 'poison') assert.equal(probe(cs.map((c) => ({ targets: [c.poison], candidates: feats(c) }))).leak, false, 'poison part'); }
});
