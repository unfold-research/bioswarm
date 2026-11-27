// Leak probe applied to the collections of R2 and R2b: can the edited block be located from the first counts?
// Usage: node observatory/batch2/kernel/probe-regimes.mjs
import { probe } from './leak-probe.mjs';
for (const family of ['r2', 'r2b']) {
  const P = await import(`../${family}-regimes/protocol.mjs`);
  const cases = P.SEEDS.map((seed) => { const c = P.makeCorpus(seed), [W, R] = c.answer;
    return { targets: c.block, candidates: c.parts[0].map((recs, part) => { const t = P.tallyOf(recs, c.authors), others = c.authors.slice(2).reduce((n, a) => n + t[a], 0);
      return { id: part, features: { leader: t[W], runnerUp: t[R], leaderMinusRunnerUp: t[W] - t[R], others, total: t[W] + t[R] + others, partNumber: part } }; }) }; });
  const r = probe(cases); console.log(`${family}: ${r.leak ? 'LEAK' : 'no leak found'}; worst feature ${r.worst.feature} (${r.worst.direction}): ${r.worst.hits} of ${r.worst.picks} picks in the block, chance ${(r.worst.chance * r.worst.picks).toFixed(0)}, z = ${r.worst.z.toFixed(1)}`);
}
