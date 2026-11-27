// sim-branching — subtask generation as a branching process: each executed job spawns Poisson(m) children, a fraction d of
// which is cancelled/deduplicated before running. Tests the abrupt threshold at m_ef = m(1-d) = 1 (H-24), the critical
// cleanup d* = 1 - 1/m, backlog behaviour after arrivals stop, and a hard depth limit as an alternative bound.
// Usage: node sims/sim-branching.mjs
import { Rng, hashSeed, BASE_SEED, Acc, roundDeep, num, pct, ciNum, mainIfDirect } from './lib.mjs';

export const ID = 'sim-branching';
export const VERSION = '1.0.0';

export const HYPOTHESIS = {
  statement: 'When every executed job spawns m children on average and a fraction d is cancelled before running, work per root job is 1/(1 - m(1-d)) below m_ef = m(1-d) = 1 and unbounded at or above it; the transition is abrupt, the minimum cleanup is d* = 1 - 1/m, and a hard depth limit bounds the work at a cost that grows geometrically with the depth.',
  predictions: [
    { id: 'P1', text: 'Subcritical, no cleanup: for m = 0.8, 0.9 and 0.95 the mean number of executed jobs per root is within 3% of 1/(1-m) (5, 10, 20) and no root reaches the 20,000-job cap.' },
    { id: 'P2', text: 'Abrupt threshold: the fraction of roots that reach the cap is < 0.1% for m_ef in {0.8, 0.9, 0.95} and > 5% for m_ef in {1.05, 1.2, 1.5}.' },
    { id: 'P3', text: 'Critical cleanup: with m = 1.5, cleanup d = 0.30 (m_ef = 1.05) still has > 5% of roots reaching the cap, while d = 0.40 (m_ef = 0.9) has < 0.1% and a mean of executed jobs per root within 3% of 10.' },
    { id: 'P4', text: 'Backlog after arrivals stop (service capacity 50 jobs/step, 5 roots/step for 200 steps): the backlog is empty 1,000 steps later in >= 99% of runs for m_ef in {0.8, 0.95}, and is larger than at the stop in >= 90% of runs for m_ef in {1.05, 1.2}.' },
    { id: 'P5', text: 'Depth limit: with m = 1.5 and no cleanup, a maximum depth D bounds the mean executed jobs per root within 3% of (m^(D+1) - 1)/(m - 1) for D in {3, 5, 8} (8.1, 20.8, 74.9).' },
  ],
};

export const PARAMS = {
  seed: BASE_SEED,
  roots: 200000,
  cap: 20000,                                   // a root whose executed jobs reach the cap counts as diverged
  m_ef_grid: [0.8, 0.9, 0.95, 1.05, 1.2, 1.5],  // no cleanup: m_ef = m
  cleanup: { m: 1.5, d: [0, 0.2, 0.3, 0.3334, 0.4, 0.5] },
  depth: { m: 1.5, D: [3, 5, 8] },
  backlog: { runs: 500, capacity: 50, arrivals: 5, arrival_steps: 200, after_steps: 1000, m_ef: [0.8, 0.95, 1.05, 1.2] },
  rules: 'Children per executed job ~ Poisson(m); each child is cancelled independently with probability d before running, so executed children ~ Poisson(m(1-d)). A generation of n jobs spawns Poisson(n*m_ef) executed children (lib Poisson: exact below mean 30, rounded normal approximation above). Backlog model: per step, Poisson(arrivals) roots arrive while t < arrival_steps; min(capacity, backlog) jobs run and spawn Poisson(run*m_ef) executed children.',
};

// Executed jobs for one root; stops at the cap or at maxDepth generations below the root.
function progeny(rng, mEf, cap, maxDepth = Infinity) {
  let alive = 1, total = 1, depth = 0;
  while (alive > 0 && total < cap && depth < maxDepth) {
    const kids = rng.poisson(alive * mEf);
    total += kids; alive = kids; depth++;
  }
  return total;
}

function sweep(tag, mEf, maxDepth) {
  const { roots, cap } = PARAMS; const jobs = new Acc(); let capped = 0;
  const rng = new Rng(hashSeed(BASE_SEED, ID, tag));
  for (let i = 0; i < roots; i++) { const t = progeny(rng, mEf, cap, maxDepth); if (t >= cap) capped++; jobs.add(Math.min(t, cap)); }
  return { m_ef: mEf, jobs: jobs.ci(), capped, capped_frac: capped / roots, roots };
}

function backlogRun(rng, mEf) {
  const { capacity, arrivals, arrival_steps, after_steps } = PARAMS.backlog;
  let b = 0, atStop = 0;
  for (let t = 0; t < arrival_steps + after_steps; t++) {
    if (t < arrival_steps) b += rng.poisson(arrivals);
    const run = Math.min(capacity, b);
    b += rng.poisson(run * mEf) - run;
    if (t === arrival_steps - 1) atStop = b;
  }
  return { atStop, atEnd: b };
}

export function run() {
  const theory = (m) => (m < 1 ? 1 / (1 - m) : null);
  const noCleanup = PARAMS.m_ef_grid.map((m) => ({ ...sweep(`plain|${m}`, m), theory: theory(m) }));
  const cleanup = PARAMS.cleanup.d.map((d) => { const mEf = PARAMS.cleanup.m * (1 - d); return { d, ...sweep(`cleanup|${d}`, mEf), theory: theory(mEf) }; });
  const depth = PARAMS.depth.D.map((D) => { const m = PARAMS.depth.m; return { D, ...sweep(`depth|${D}`, m, D), theory: (m ** (D + 1) - 1) / (m - 1) }; });
  const backlog = PARAMS.backlog.m_ef.map((mEf) => {
    const stop = new Acc(), end = new Acc(); let empty = 0, grew = 0;
    for (let r = 0; r < PARAMS.backlog.runs; r++) {
      const o = backlogRun(new Rng(hashSeed(BASE_SEED, ID, 'backlog', mEf, r)), mEf);
      stop.add(o.atStop); end.add(o.atEnd); if (o.atEnd === 0) empty++; if (o.atEnd > o.atStop) grew++;
    }
    return { m_ef: mEf, at_stop: stop.ci(), at_end: end.ci(), empty_frac: empty / PARAMS.backlog.runs, grew_frac: grew / PARAMS.backlog.runs };
  });

  const within = (x, target, tol) => Math.abs(x / target - 1) <= tol;
  const sub = noCleanup.filter((x) => x.m_ef < 1), sup = noCleanup.filter((x) => x.m_ef > 1);
  const p1 = sub.every((x) => within(x.jobs.mean, x.theory, 0.03) && x.capped === 0);
  const p2 = sub.every((x) => x.capped_frac < 0.001) && sup.every((x) => x.capped_frac > 0.05);
  const c30 = cleanup.find((x) => x.d === 0.3), c40 = cleanup.find((x) => x.d === 0.4);
  const p3 = c30.capped_frac > 0.05 && c40.capped_frac < 0.001 && within(c40.jobs.mean, 10, 0.03);
  const p4 = backlog.filter((x) => x.m_ef < 1).every((x) => x.empty_frac >= 0.99) && backlog.filter((x) => x.m_ef > 1).every((x) => x.grew_frac >= 0.9);
  const p5 = depth.every((x) => within(x.jobs.mean, x.theory, 0.03));
  const tests = [
    { id: 'P1', verdict: p1 ? 'supported' : 'not supported', detail: sub.map((x) => `m=${x.m_ef}: ${ciNum(x.jobs, 2)} vs ${num(x.theory, 0)}, capped ${x.capped}`).join('; ') },
    { id: 'P2', verdict: p2 ? 'supported' : 'not supported', detail: noCleanup.map((x) => `m_ef=${x.m_ef}: ${pct(x.capped_frac, 2)}`).join('; ') },
    { id: 'P3', verdict: p3 ? 'supported' : 'not supported', detail: `d=0.30: ${pct(c30.capped_frac, 2)} capped; d=0.40: ${pct(c40.capped_frac, 2)} capped, jobs ${ciNum(c40.jobs, 2)}` },
    { id: 'P4', verdict: p4 ? 'supported' : 'not supported', detail: backlog.map((x) => `m_ef=${x.m_ef}: empty ${pct(x.empty_frac, 1)}, grew ${pct(x.grew_frac, 1)}`).join('; ') },
    { id: 'P5', verdict: p5 ? 'supported' : 'not supported', detail: depth.map((x) => `D=${x.D}: ${ciNum(x.jobs, 2)} vs ${num(x.theory, 2)}`).join('; ') },
  ];
  const headline = [
    ...sub.map((x) => `no cleanup m=${x.m_ef}: ${ciNum(x.jobs, 2)} executed jobs per root (theory ${num(x.theory, 0)}), ${pct(x.capped_frac, 2)} of roots diverge`),
    ...sup.map((x) => `no cleanup m=${x.m_ef}: ${pct(x.capped_frac, 1)} of roots diverge (reach ${PARAMS.cap} jobs)`),
    ...cleanup.map((x) => `m=1.5 cleanup d=${x.d}: m_ef ${num(x.m_ef, 2)}, ${pct(x.capped_frac, 1)} of roots diverge`),
    ...backlog.map((x) => `backlog m_ef=${x.m_ef}: ${num(x.at_stop.mean, 0)} jobs when arrivals stop, ${num(x.at_end.mean, 0)} after 1000 more steps`),
    ...depth.map((x) => `m=1.5 depth limit D=${x.D}: ${ciNum(x.jobs, 2)} executed jobs per root (theory ${num(x.theory, 2)})`),
  ];
  return roundDeep({ id: ID, version: VERSION, title: 'Subtask generation as a branching process: critical cleanup ratio', seed: BASE_SEED, hypothesis: HYPOTHESIS, params: PARAMS, results: { no_cleanup: noCleanup, cleanup, depth, backlog }, tests, headline }, 4);
}

mainIfDirect(import.meta.url, run);
