import test from 'node:test';
import assert from 'node:assert/strict';
import { consensus, cohenKappa, fisherGreater, jaccard, titleMatch, SCHEMA, TRAIT_IDS, SPECIES, request, reserveUsd } from './lib.mjs';

test('ontology and species are well formed', () => {
  assert.equal(new Set(TRAIT_IDS).size, TRAIT_IDS.length);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, SPECIES.length);
  assert.ok(SPECIES.every((s) => ['seen', 'unseen'].includes(s.realm)));
  assert.deepEqual(SCHEMA.properties.traits.required, TRAIT_IDS);
});

test('requests are unique, valid ids and within the study cap', () => {
  const rows = ['A', 'B'].flatMap((c) => SPECIES.map((s) => request(c, s)));
  assert.equal(new Set(rows.map((r) => r.custom_id)).size, rows.length);
  assert.ok(rows.every((r) => /^[A-Za-z0-9_-]{1,64}$/.test(r.custom_id)));
  const usd = SPECIES.length * (reserveUsd('A', 6200) + reserveUsd('B', 6200));
  assert.ok(usd < 30, `reserve ${usd}`);
});

test('consensus collapses present and variable', () => {
  assert.equal(consensus({ state: 'present' }, { state: 'variable' }), 'P');
  assert.equal(consensus({ state: 'absent' }, { state: 'absent' }), 'A');
  assert.equal(consensus({ state: 'unknown' }, { state: 'unknown' }), 'U');
  assert.equal(consensus({ state: 'present' }, { state: 'absent' }), 'C');
  assert.equal(consensus(null, { state: 'present' }), 'U');
});

test('kappa: perfect, chance and textbook value', () => {
  assert.equal(cohenKappa([['p', 'p'], ['a', 'a'], ['u', 'u']]), 1);
  // 2x2 textbook: 20 yes-yes, 5 yes-no, 10 no-yes, 15 no-no -> kappa 0.4
  const pairs = [...Array(20).fill(['y', 'y']), ...Array(5).fill(['y', 'n']), ...Array(10).fill(['n', 'y']), ...Array(15).fill(['n', 'n'])];
  assert.ok(Math.abs(cohenKappa(pairs) - 0.4) < 1e-9);
});

test('fisher one-sided matches the tea-tasting table', () => {
  // [[3,1],[1,3]]: one-sided p = 17/70
  assert.ok(Math.abs(fisherGreater(3, 1, 1, 3) - 17 / 70) < 1e-9);
  assert.ok(fisherGreater(0, 4, 4, 0) > 0.99);
});

test('jaccard and title match', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
  assert.ok(titleMatch('Quorum sensing, recruitment, and collective decision-making', 'Quorum sensing, recruitment and collective decision making during colony emigration') >= 0.6);
  assert.ok(titleMatch('Ant foraging', 'Bird flocking in starlings') < 0.2);
});
