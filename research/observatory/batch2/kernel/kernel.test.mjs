import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe } from './leak-probe.mjs';
import { event, fold, outcome } from './fieldlog.mjs';
import { exportStudy, STUDIES } from './export-regimes.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
test('leak probe: a feature that marks the targets is flagged; noise is not', () => {
  const mk = (leaky) => Array.from({ length: 40 }, (_, i) => ({ targets: [i % 10, (i + 1) % 10], candidates: Array.from({ length: 10 }, (_, p) => ({ id: p, features: { x: leaky && (p === i % 10 || p === (i + 1) % 10) ? 3 : 1 + ((p * 7 + i * 3) % 2), y: (p * 13 + i * 5) % 7 } })) }));
  const a = probe(mk(true)); assert.equal(a.leak, true); assert.equal(a.worst.feature, 'x'); assert.equal(a.worst.hits, 80);
  assert.equal(probe(mk(false)).leak, false);
});
test('the probe finds the R2 leak and none in R2b', async () => {
  for (const [family, expected] of [['r2', true], ['r2b', false]]) { const P = await import(`../${family}-regimes/protocol.mjs`);
    const cases = P.SEEDS.map((seed) => { const c = P.makeCorpus(seed), [W, R] = c.answer; return { targets: c.block, candidates: c.parts[0].map((recs, part) => { const t = P.tallyOf(recs, c.authors); return { id: part, features: { leader: t[W], runnerUp: t[R], diff: t[W] - t[R] } }; }) }; });
    assert.equal(probe(cases).leak, expected, family); }
});
test('fold: latest wins; decay weights; a model answer overrides', () => {
  const A = ['a', 'b'], d = (seq, round, place, a, b) => event(seq, 'r', round, 'w', 'deposit', place, { counts: { a, b } });
  assert.equal(fold([d(0, 0, '0', 3, 1), d(1, 0, '1', 1, 2)], A), 'a'); assert.equal(fold([d(0, 0, '0', 3, 1), d(1, 0, '1', 1, 2), d(2, 1, '0', 0, 4)], A), 'b');
  assert.equal(fold([d(0, 1, '0', 4, 0), d(1, 4, '0', 0, 4)], A, { decay: 1, rounds: 4 }), null); assert.equal(fold([d(0, 1, '0', 4, 0), d(1, 4, '0', 0, 4)], A, { decay: 0.5, rounds: 4 }), 'b');
  assert.equal(outcome([d(0, 0, '0', 3, 1), event(1, 'r', 5, 'orchestrator', 'answer', '*', { author: 'b' })], A), 'b');
});
test('acceptance: the accuracy tables of R1, R2 and R2b are reproduced from the field log alone', async () => {
  for (const [f, r] of STUDIES) { const x = await exportStudy(f, r), pub = JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${x.study}/summary.json`), 'utf8')).accuracy;
    assert.ok(Math.abs(x.accuracy.stable - pub.stable) < 1e-9 && Math.abs(x.accuracy.edited - pub.edited) < 1e-9, `${x.study}: ${JSON.stringify(x.accuracy)} against ${JSON.stringify(pub)}`); }
});
