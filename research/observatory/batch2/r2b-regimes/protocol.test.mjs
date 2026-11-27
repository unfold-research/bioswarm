import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCorpus, tallyOf, SEEDS, PARTS } from './protocol.mjs';
test('60 rings: 20 against 16 before the edit, 20 against 25 after; the block cannot be told from the first counts', () => {
  let leaderInBlock = 0, runnerInBlock = 0;
  for (const seed of SEEDS) { const c = makeCorpus(seed), [W, R] = c.answer; assert.equal((c.block[0] + 1) % PARTS, c.block[1]); assert.equal((c.block[1] + 1) % PARTS, c.block[2]);
    const t0 = tallyOf(c.parts[0].flat(), c.authors), t1 = tallyOf(c.parts[1].flat(), c.authors); assert.equal(t0[W], 20); assert.equal(t0[R], 16); assert.equal(t1[W], 20); assert.equal(t1[R], 25); for (const a of c.authors.slice(2)) { assert.ok(t0[a] <= 12); assert.equal(t0[a], t1[a]); }
    for (let s = 0; s < PARTS; s++) { assert.equal(c.parts[1][s].length, 24); const a = tallyOf(c.parts[0][s], c.authors), b = tallyOf(c.parts[1][s], c.authors); assert.equal(b[R] - a[R], c.block.includes(s) ? 3 : 0); assert.equal(b[W], a[W]); assert.deepEqual(c.parts[0][s].map((x) => x.id), c.parts[1][s].map((x) => x.id)); }
    for (const s of c.block) { leaderInBlock += tallyOf(c.parts[0][s], c.authors)[W]; runnerInBlock += tallyOf(c.parts[0][s], c.authors)[R]; } }
  // expected per block part: leader 20/12 = 1.67, runner-up 16/12 = 1.33; the block must look like any other part
  assert.ok(Math.abs(leaderInBlock / 180 - 20 / 12) < 0.15, String(leaderInBlock / 180)); assert.ok(Math.abs(runnerInBlock / 180 - 16 / 12) < 0.15, String(runnerInBlock / 180));
});
