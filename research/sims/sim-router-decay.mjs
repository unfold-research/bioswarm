// sim-router-decay — a router reinforced by acceptances, with and without decay (H-25). Part A measures how long a single
// acceptance estimate takes to forget its history after an abrupt change (cumulative mean vs EWMA). Part B routes tasks
// between two routes with epsilon-greedy choice and measures the time to switch after the routes swap quality, plus the
// stationary price of decay.
// Usage: node sims/sim-router-decay.mjs
import { Rng, hashSeed, BASE_SEED, Acc, roundDeep, num, pct, mainIfDirect } from './lib.mjs';

export const ID = 'sim-router-decay';
export const VERSION = '1.0.0';

export const HYPOTHESIS = {
  statement: 'A router whose weights are cumulative means of acceptances readapts after an abrupt change in a time proportional to its whole history; with exponential decay (EWMA rate lambda) the time is fixed by lambda and independent of the history, at the price of a stationary loss that grows with lambda.',
  predictions: [
    { id: 'P1', text: 'Single estimate, history T0 = 500: the number of tasks until the past weighs less than 10% is within 5% (or 2 tasks) of 4,500 without decay and of 230, 45, 22 and 11 with lambda = 0.01, 0.05, 0.1 and 0.2.' },
    { id: 'P2', text: 'Two-route router: the median switch time without decay grows at least 3x when the history goes from T0 = 500 to T0 = 2,000, while with lambda = 0.05 it changes by less than 25%.' },
    { id: 'P3', text: 'Two-route router, T0 = 500: the median switch time without decay is at least 3x that of lambda = 0.05.' },
    { id: 'P4', text: 'Stationary regime (no change, 20,000 tasks): the acceptance rate with lambda <= 0.05 is within 5% (relative) of the router without decay, and the loss with lambda = 0.2 is larger than with lambda = 0.01 (disjoint 95% CIs).' },
  ],
};

export const PARAMS = {
  seed: BASE_SEED,
  p_good: 0.8, p_bad: 0.4,
  lambdas: [0.01, 0.05, 0.1, 0.2],
  estimate: { T0: 500, runs: 4000, horizon: 6000 },
  router: { epsilon: 0.1, T0: [500, 2000], runs: 400, horizon: 30000, hold: 100 },
  stationary: { runs: 400, tasks: 20000 },
  rules: 'Estimate: T0 observations at p_good, then an abrupt change to p_bad; t90 = first task after the change at which the run-averaged estimate has covered 90% of the distance to the new value. Router: two routes, epsilon-greedy (explore uniformly with probability epsilon); cumulative policy keeps per-route mean with a prior of 1 acceptance in 2 trials; EWMA policy starts at 0.5 and updates only the chosen route. History: T0 tasks with route A at p_good and B at p_bad; then they swap. Switch time = first task after the swap from which the estimate of B stays above the estimate of A for `hold` consecutive tasks; censored at the horizon.',
};

const POLICIES = ['cumulative', ...PARAMS.lambdas.map((l) => `ewma-${l}`)];
const lambdaOf = (p) => (p === 'cumulative' ? 0 : Number(p.slice(5)));

function estimateT90() {
  const { T0, runs, horizon } = PARAMS.estimate; const { p_good, p_bad, lambdas } = PARAMS;
  const out = {};
  for (const pol of POLICIES) {
    const lam = lambdaOf(pol); const sum = new Float64Array(horizon);
    for (let r = 0; r < runs; r++) {
      const rng = new Rng(hashSeed(BASE_SEED, ID, 'estimate', pol, r));
      let est = 0.5, n = 0, s = 0;
      for (let t = 0; t < T0; t++) { const x = rng.bern(p_good) ? 1 : 0; if (lam) est += lam * (x - est); else { n++; s += x; est = s / n; } }
      for (let t = 0; t < horizon; t++) { const x = rng.bern(p_bad) ? 1 : 0; if (lam) est += lam * (x - est); else { n++; s += x; est = s / n; } sum[t] += est; }
    }
    let t90 = null;
    for (let t = 0; t < horizon; t++) { const frac = (p_good - sum[t] / runs) / (p_good - p_bad); if (frac >= 0.9) { t90 = t + 1; break; } }
    const theory = lam ? Math.ceil(Math.log(0.1) / Math.log(1 - lam)) : 9 * T0;
    out[pol] = { t90, theory };
  }
  return out;
}

function makeRouter(pol) {
  const lam = lambdaOf(pol);
  const st = { est: [0.5, 0.5], n: [2, 2], s: [1, 1] };
  st.update = (a, x) => { if (lam) st.est[a] += lam * (x - st.est[a]); else { st.n[a]++; st.s[a] += x; st.est[a] = st.s[a] / st.n[a]; } };
  st.pick = (rng, eps) => (rng.uniform() < eps ? rng.int(2) : (st.est[0] >= st.est[1] ? 0 : 1));
  return st;
}

function routerSwitch(pol, T0, r) {
  const { epsilon, horizon, hold } = PARAMS.router; const { p_good, p_bad } = PARAMS;
  const rng = new Rng(hashSeed(BASE_SEED, ID, 'router', pol, T0, r)); const R = makeRouter(pol);
  for (let t = 0; t < T0; t++) { const a = R.pick(rng, epsilon); R.update(a, rng.bern(a === 0 ? p_good : p_bad) ? 1 : 0); }
  let streak = 0;
  for (let t = 0; t < horizon; t++) {
    const a = R.pick(rng, epsilon); R.update(a, rng.bern(a === 0 ? p_bad : p_good) ? 1 : 0);
    if (R.est[1] > R.est[0]) { streak++; if (streak >= hold) return { t: t + 2 - hold, censored: false }; } else streak = 0;
  }
  return { t: horizon, censored: true };
}

function median(a) { const s = [...a].sort((x, y) => x - y); const k = s.length; return k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2; }

export function run() {
  const estimate = estimateT90();
  const router = {};
  for (const T0 of PARAMS.router.T0) {
    router[T0] = {};
    for (const pol of POLICIES) {
      const ts = []; let cens = 0;
      for (let r = 0; r < PARAMS.router.runs; r++) { const o = routerSwitch(pol, T0, r); ts.push(o.t); if (o.censored) cens++; }
      const acc = new Acc(); for (const t of ts) acc.add(t);
      router[T0][pol] = { median: median(ts), mean: acc.ci(), censored: cens };
    }
  }
  const stationary = {};
  for (const pol of POLICIES) {
    const acc = new Acc();
    for (let r = 0; r < PARAMS.stationary.runs; r++) {
      const rng = new Rng(hashSeed(BASE_SEED, ID, 'stationary', pol, r)); const R = makeRouter(pol); let ok = 0;
      for (let t = 0; t < PARAMS.stationary.tasks; t++) { const a = R.pick(rng, PARAMS.router.epsilon); const x = rng.bern(a === 0 ? PARAMS.p_good : PARAMS.p_bad) ? 1 : 0; ok += x; R.update(a, x); }
      acc.add(ok / PARAMS.stationary.tasks);
    }
    stationary[pol] = acc.ci();
  }
  const base = stationary.cumulative.mean;
  for (const pol of POLICIES) { const s = stationary[pol]; s.loss = 1 - s.mean / base; s.loss_lo = 1 - s.hi / base; s.loss_hi = 1 - s.lo / base; }

  const near = (x, target) => x !== null && (Math.abs(x - target) <= 2 || Math.abs(x / target - 1) <= 0.05);
  const p1 = POLICIES.every((p) => near(estimate[p].t90, estimate[p].theory));
  const growth = (p) => router[2000][p].median / router[500][p].median;
  const p2 = growth('cumulative') >= 3 && Math.abs(growth('ewma-0.05') - 1) < 0.25;
  const ratio = router[500].cumulative.median / router[500]['ewma-0.05'].median;
  const p3 = ratio >= 3;
  const p4 = ['ewma-0.01', 'ewma-0.05'].every((p) => stationary[p].loss <= 0.05) && stationary['ewma-0.2'].loss_lo > stationary['ewma-0.01'].loss_hi;
  const tests = [
    { id: 'P1', verdict: p1 ? 'supported' : 'not supported', detail: POLICIES.map((p) => `${p}: ${estimate[p].t90} vs ${estimate[p].theory}`).join('; ') },
    { id: 'P2', verdict: p2 ? 'supported' : 'not supported', detail: `cumulative ${router[500].cumulative.median} -> ${router[2000].cumulative.median} (x${num(growth('cumulative'), 2)}); ewma-0.05 ${router[500]['ewma-0.05'].median} -> ${router[2000]['ewma-0.05'].median} (x${num(growth('ewma-0.05'), 2)})` },
    { id: 'P3', verdict: p3 ? 'supported' : 'not supported', detail: `T0=500: cumulative ${router[500].cumulative.median} vs ewma-0.05 ${router[500]['ewma-0.05'].median} (x${num(ratio, 2)})` },
    { id: 'P4', verdict: p4 ? 'supported' : 'not supported', detail: POLICIES.slice(1).map((p) => `${p}: loss ${pct(stationary[p].loss, 2)}`).join('; ') },
  ];
  const headline = [
    ...POLICIES.map((p) => `estimate ${p}: past weighs under 10% after ${estimate[p].t90} tasks (formula ${estimate[p].theory})`),
    ...PARAMS.router.T0.flatMap((T0) => POLICIES.map((p) => `router T0=${T0} ${p}: median switch ${router[T0][p].median} tasks, ${router[T0][p].censored} of ${PARAMS.router.runs} runs never switched`)),
    ...POLICIES.map((p) => `stationary ${p}: acceptance ${pct(stationary[p].mean, 2)} (loss vs no decay ${pct(stationary[p].loss, 2)})`),
  ];
  return roundDeep({ id: ID, version: VERSION, title: 'Router reinforced by acceptances: decay vs history lock-in', seed: BASE_SEED, hypothesis: HYPOTHESIS, params: PARAMS, results: { estimate, router, stationary }, tests, headline }, 5);
}

mainIfDirect(import.meta.url, run);
