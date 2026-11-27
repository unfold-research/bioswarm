// Offline tests of fold-field with a deterministic greedy member (no model): a member recolours each of its parts in
// conflict to the colour least used by its neighbours, all at once. Shows the synchronous pathology and the remedy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinate, assign } from './field.mjs';
import * as C from '../../observatory/batch2/ne/swarm.mjs';

function setup(n, seed) {
  const inst = C.makeInstance(n, seed, 2.3, 15), parts = Array.from({ length: n }, (_, i) => String(i));
  const ownerOf = (x) => `T${inst.owner[Number(x)]}`, neighbours = (x) => inst.adj[Number(x)].map(String);
  const col = (st) => Array.from({ length: n }, (_, i) => st.get(String(i)));
  const check = (st) => C.conflicts(inst, col(st)).map(([a, b]) => ({ parts: [String(a), String(b)] }));
  const act = async ({ parts: mine, violations, state }) => { const hot = new Set(violations.flatMap((v) => v.parts).filter((x) => mine.includes(x))); const out = new Map();
    for (const x of hot) { const count = { R: 0, G: 0, B: 0 }; for (const y of neighbours(x)) { const c = state.get(y); if (c) count[c]++; } out.set(x, Object.entries(count).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))[0][0]); }
    return out; };
  const start = () => new Map(parts.map((x, i) => [x, 'RGB'[(i * 7 + seed) % 3]]));
  return { parts, ownerOf, neighbours, check, act, start };
}

test('a cross-owner violation goes to exactly one owner under inhibit, to both under sync', () => {
  const v = [{ parts: ['a', 'b'] }], ownerOf = (x) => x.toUpperCase();
  assert.equal(assign({ violations: v, ownerOf, rule: 'inhibit', round: 1 }).length, 1);
  assert.equal(assign({ violations: v, ownerOf, rule: 'sync', round: 1 }).length, 2);
  const sides = new Set([1, 2, 3, 4, 5, 6].map((round) => assign({ violations: v, ownerOf, rule: 'inhibit', round })[0].member));
  assert.equal(sides.size, 2, 'the side that acts alternates across rounds');
});

test('greedy members: inhibition ends with fewer conflicts than synchronous repair on most graphs', async () => {
  let better = 0, worse = 0; const rows = [];
  for (let seed = 1; seed <= 20; seed++) { const S = setup(120, seed);
    const sync = await coordinate({ ...S, state: S.start(), rule: 'sync', rounds: 12 }), inh = await coordinate({ ...S, state: S.start(), rule: 'inhibit', rounds: 12 });
    const a = S.check(sync.state).length, b = S.check(inh.state).length; rows.push([a, b]); if (b < a) better++; else if (b > a) worse++; }
  console.log('final conflicts (sync, inhibit) per graph:', JSON.stringify(rows));
  assert.ok(better > worse, `inhibit better on ${better}, worse on ${worse}`);
});

test('routed: a directed violation goes to both owners, a symmetric one to exactly one', () => {
  const ownerOf = (x) => x.toUpperCase();
  assert.equal(assign({ violations: [{ parts: ['a', 'b'], kind: 'directed' }], ownerOf, rule: 'routed', round: 1 }).length, 2);
  assert.equal(assign({ violations: [{ parts: ['a', 'b'], kind: 'symmetric' }], ownerOf, rule: 'routed', round: 1 }).length, 1);
});
