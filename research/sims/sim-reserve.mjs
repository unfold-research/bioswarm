// sim-reserve — idle reserve of agents in a task queue (H-26). Event-driven M/M/c queue with optional load bursts and
// agents that get stuck and recover. Compares c = 4 active agents with a reserve of 1 or 2 more.
// Usage: node sims/sim-reserve.mjs
import { Rng, hashSeed, BASE_SEED, Acc, roundDeep, num, pct, ciNum, mainIfDirect } from './lib.mjs';

export const ID = 'sim-reserve';
export const VERSION = '1.0.0';

export const HYPOTHESIS = {
  statement: 'Near saturation the waiting time of a task queue is strongly nonlinear in the number of agents, so a small idle reserve cuts latency under bursts and failures far more than it costs; at low utilization the same reserve buys almost nothing.',
  predictions: [
    { id: 'P1', text: 'Steady load 3.6 (service rate 1 per agent): the simulated mean wait for c = 4, 5 and 6 is within 10% of the Erlang C value (about 1.97, 0.29 and 0.08).' },
    { id: 'P2', text: 'Bursts (load 4.5 during 20% of the time, 3.6 otherwise): one reserve agent (c = 5) cuts the p95 wait of c = 4 by at least 60%, and two (c = 6) by at least 85%.' },
    { id: 'P3', text: 'Low utilization (load 1.8, c = 4, utilization 0.45): the mean-wait reduction from one reserve agent is less than 5% of the reduction obtained at load 3.6 (utilization 0.9).' },
    { id: 'P4', text: 'Stuck agents (each fails at rate 0.002 and recovers after a mean of 20, load 3.6): the p95 wait of c = 4 is at least 2x its value without failures, and one reserve agent brings it below the no-failure c = 4 value.' },
  ],
};

export const PARAMS = {
  seed: BASE_SEED,
  mu: 1, runs: 100, T: 20000, warmup: 1000,
  agents: [4, 5, 6],
  scenarios: {
    steady: { load: 3.6 },
    low: { load: 1.8 },
    bursts: { load: 3.6, burst_load: 4.5, burst_mean: 50, calm_mean: 200 },
    failures: { load: 3.6, fail_rate: 0.002, repair_mean: 20 },
  },
  rules: 'Continuous-time Markov chain simulated event by event: Poisson arrivals, exponential service (rate mu per busy agent), FIFO. Bursts: the arrival rate alternates between calm and burst periods with exponential durations. Failures: each working agent fails at fail_rate and returns after an exponential repair time; a task whose agent fails goes back to the head of the queue. Wait = time from arrival to first start of service; tasks arriving during warm-up are discarded.',
};

function erlangC(c, a) { // mean wait in queue for M/M/c with offered load a (mu = 1)
  if (a >= c) return Infinity;
  let term = 1, sum = 1;
  for (let k = 1; k < c; k++) { term *= a / k; sum += term; }
  const last = term * (a / c) * (c / (c - a));
  const pWait = last / (sum + last);
  return pWait / (c - a);
}

function simulate(rng, c, sc) {
  const { mu, T, warmup } = PARAMS;
  const exp = (rate) => -Math.log(1 - rng.uniform()) / rate;
  let t = 0, up = c, busy = 0, preempted = 0, burst = false;
  const queue = []; let head = 0; const waits = [];
  const startNext = () => { // fill free working agents: preempted tasks first, then the queue
    while (busy < up) {
      if (preempted > 0) { preempted--; busy++; }
      else if (head < queue.length) { const a = queue[head++]; if (a >= warmup) waits.push(t - a); busy++; }
      else break;
    }
  };
  while (t < T) {
    const lam = burst ? sc.burst_load : sc.load;
    const rService = busy * mu;
    const rFail = sc.fail_rate ? up * sc.fail_rate : 0;
    const rRepair = sc.fail_rate ? (c - up) / sc.repair_mean : 0;
    const rSwitch = sc.burst_load ? 1 / (burst ? sc.burst_mean : sc.calm_mean) : 0;
    const total = lam + rService + rFail + rRepair + rSwitch;
    t += exp(total);
    let u = rng.uniform() * total;
    if ((u -= lam) < 0) { queue.push(t); startNext(); }
    else if ((u -= rService) < 0) { busy--; startNext(); }
    else if ((u -= rFail) < 0) { if (rng.uniform() < busy / up) { busy--; preempted++; } up--; }
    else if ((u -= rRepair) < 0) { up++; startNext(); }
    else burst = !burst;
    if (head > 4096) { queue.splice(0, head); head = 0; }
  }
  waits.sort((x, y) => x - y);
  const n = waits.length; let s = 0; for (const w of waits) s += w;
  return { mean: n ? s / n : 0, p95: n ? waits[Math.floor(0.95 * (n - 1))] : 0, n, left: queue.length - head };
}

export function run() {
  const out = {};
  for (const [name, sc] of Object.entries(PARAMS.scenarios)) {
    out[name] = {};
    for (const c of PARAMS.agents) {
      const mean = new Acc(), p95 = new Acc(), left = new Acc();
      for (let r = 0; r < PARAMS.runs; r++) { const o = simulate(new Rng(hashSeed(BASE_SEED, ID, name, c, r)), c, sc); mean.add(o.mean); p95.add(o.p95); left.add(o.left); }
      out[name][c] = { mean: mean.ci(), p95: p95.ci(), left_at_end: left.mean, erlang_c: sc.burst_load || sc.fail_rate ? null : erlangC(c, sc.load) };
    }
  }
  const S = out.steady, L = out.low, B = out.bursts, F = out.failures;
  const p1 = PARAMS.agents.every((c) => Math.abs(S[c].mean.mean / S[c].erlang_c - 1) <= 0.1);
  const cut = (sc, c) => 1 - sc[c].p95.mean / sc[4].p95.mean;
  const p2 = cut(B, 5) >= 0.6 && cut(B, 6) >= 0.85;
  const redLow = L[4].mean.mean - L[5].mean.mean, redHigh = S[4].mean.mean - S[5].mean.mean;
  const p3 = redLow < 0.05 * redHigh;
  const p4 = F[4].p95.mean >= 2 * S[4].p95.mean && F[5].p95.mean < S[4].p95.mean;
  const tests = [
    { id: 'P1', verdict: p1 ? 'supported' : 'not supported', detail: PARAMS.agents.map((c) => `c=${c}: ${ciNum(S[c].mean, 3)} vs Erlang C ${num(S[c].erlang_c, 3)}`).join('; ') },
    { id: 'P2', verdict: p2 ? 'supported' : 'not supported', detail: `p95 wait c=4 ${num(B[4].p95.mean, 2)}, c=5 ${num(B[5].p95.mean, 2)} (-${pct(cut(B, 5), 1)}), c=6 ${num(B[6].p95.mean, 2)} (-${pct(cut(B, 6), 1)})` },
    { id: 'P3', verdict: p3 ? 'supported' : 'not supported', detail: `mean-wait reduction from +1 agent: ${num(redLow, 4)} at utilization 0.45 vs ${num(redHigh, 3)} at 0.9 (${pct(redLow / redHigh, 2)})` },
    { id: 'P4', verdict: p4 ? 'supported' : 'not supported', detail: `p95 wait c=4 no failures ${num(S[4].p95.mean, 2)}; with failures c=4 ${num(F[4].p95.mean, 2)}, c=5 ${num(F[5].p95.mean, 2)}` },
  ];
  const line = (name, sc, c) => `${name} c=${c}: mean wait ${ciNum(sc[c].mean, 3)}, p95 wait ${ciNum(sc[c].p95, 2)}`;
  const headline = [
    ...PARAMS.agents.map((c) => `${line('steady', S, c)}, Erlang C ${num(S[c].erlang_c, 3)}`),
    ...PARAMS.agents.map((c) => line('bursts', B, c)),
    ...[4, 5].map((c) => line('low', L, c)),
    ...PARAMS.agents.map((c) => line('failures', F, c)),
  ];
  return roundDeep({ id: ID, version: VERSION, title: 'Idle reserve of agents under bursts and failures', seed: BASE_SEED, hypothesis: HYPOTHESIS, params: PARAMS, results: out, tests, headline }, 5);
}

mainIfDirect(import.meta.url, run);
