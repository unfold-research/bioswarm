import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus, tallyOf, SEEDS, PARTS } from './protocol.mjs';
test('60 rings: 20 against 16 before the edit, 14 against 22 after; three neighbouring parts edited; others at most 12', () => {
  const starts = new Set();
  for (const seed of SEEDS) { const c = makeCorpus(seed), [W, R] = c.answer; starts.add(c.block[0]); assert.equal(c.block.length, 3); assert.equal((c.block[0] + 1) % PARTS, c.block[1]); assert.equal((c.block[1] + 1) % PARTS, c.block[2]);
    const t0 = tallyOf(c.parts[0].flat(), c.authors), t1 = tallyOf(c.parts[1].flat(), c.authors); assert.equal(t0[W], 20); assert.equal(t0[R], 16); assert.equal(t1[W], 14); assert.equal(t1[R], 22); for (const a of c.authors.slice(2)) assert.ok(t0[a] <= 12);
    for (let s = 0; s < PARTS; s++) { assert.equal(c.parts[0][s].length, 24); assert.equal(JSON.stringify(c.parts[0][s]) === JSON.stringify(c.parts[1][s]), !c.block.includes(s)); if (c.block.includes(s)) { const a = tallyOf(c.parts[0][s], c.authors), b = tallyOf(c.parts[1][s], c.authors); assert.equal(Math.abs(a[W] - b[W]) + Math.abs(a[R] - b[R]), 4); } }
    assert.equal(new Set(c.parts[0].flat().map((x) => x.id)).size, 288); }
  assert.ok(starts.size >= 10);
});
