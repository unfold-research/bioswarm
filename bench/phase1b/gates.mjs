// Pre-sample gates and the pre-specified decisions of results/phase1b/PREREG.md. Pure functions over records.
import { comparableAttempt, isIntegrityFailure, isOperational } from './attempts.mjs';
import { cases } from './cases.mjs';
import { weightedOf } from './studycap.mjs';

// Records carry their case (v2 records set case: 'v2'); v1 records from before the field default to v1.
const caseOf = (records) => cases[records.find((r) => r.case)?.case ?? 'v1'];
const { sampleSeeds } = cases.v1;

export const longTaskSeconds = 1800;
export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Map gate: every sample and calibration seed offers at least two disputes and two directed conflicts.
export function opportunityGate(kase = cases.v1, seeds = [...kase.sampleSeeds, ...kase.calibrationSeeds]) {
  const totals = Object.fromEntries(seeds.map((s) => [s, kase.opportunityTotals(s)]));
  return { pass: Object.values(totals).every((t) => t.dispute >= kase.gate.mapDispute && t.directed >= kase.gate.mapDirected), totals };
}

// Calibration gate on the three A activations (seeds 2011, 2027, 2039).
// v2 adds, from the Research review of 26/11: A's median estimated cost at most 50% of the US$ 9 brake, and any
// calibration attempt above 75 min reported to the Research Leader (timeoutAck) before the sample.
export function calibrationGate(records, kase = caseOf(records), { teamUsd = 9, timeoutAck = false, mediumTask = false } = {}) {
  const { calibrationSeeds } = kase;
  const reasons = [];
  const bySeed = new Map(records.map((r) => [r.seed, r]));
  if (records.length !== 3 || !calibrationSeeds.every((s) => bySeed.has(s))) reasons.push('three calibration records, one per seed, are required');
  for (const r of records) {
    if (r.arm !== 'A') reasons.push(`seed ${r.seed}: calibration runs arm A only`);
    if (!r.comparable) reasons.push(`seed ${r.seed}: not comparable`);
    if (r.participants !== 3) reasons.push(`seed ${r.seed}: ${r.participants} of 3 agents participated`);
    if (r.observedOpportunities.dispute < kase.gate.dispute || r.observedOpportunities.directed < kase.gate.directed) reasons.push(`seed ${r.seed}: observed fewer than ${kase.gate.directed} directed or ${kase.gate.dispute} symmetric failing IDs`);
    if (kase.gate.longRunSeconds && r.totalSeconds > kase.gate.longRunSeconds && !timeoutAck) reasons.push(`seed ${r.seed}: attempt above ${kase.gate.longRunSeconds / 60} min; report to the Research Leader before the sample`);
  }
  const wall = records.length ? median(records.map((r) => r.observedWallSeconds)) : 0;
  if (!(mediumTask && kase.version === 'v2') && wall < longTaskSeconds) reasons.push(`median observed wall ${wall} s is below ${longTaskSeconds} s`);
  let medianCost = null;
  if (kase.gate.costShare) {
    medianCost = records.length ? median(records.map((r) => r.hostEstimatedUsd)) : null;
    if (!(medianCost <= kase.gate.costShare * teamUsd)) reasons.push(`median estimated cost US$ ${medianCost} exceeds ${kase.gate.costShare * 100}% of the US$ ${teamUsd} brake; amend the brake for A, B and C before any data`);
  }
  return { pass: reasons.length === 0, medianObservedWallSeconds: wall, medianEstimatedUsd: medianCost, reasons };
}

// v2 sample rule (Research Leader, 26/11): a seed enters the hypotheses only with information from before the
// treatment: (a) its frozen map has ≥5 directed and ≥5 symmetric, and (b) its A attempt observed ≥4 of each from
// wave 1. Otherwise the whole seed (A, B and C) is excluded and reported, decided before B and C results are opened,
// without replacement (incomplete pair: inconclusive). B and C opportunities never exclude anything: they are a
// manipulation check, reported by arm and seed.
export function sampleOpportunityGate(records, kase = caseOf(records)) {
  const excluded = kase.sampleSeeds.filter((seed) => {
    const map = kase.opportunityTotals(seed);
    if (map.directed < kase.gate.mapDirected || map.dispute < kase.gate.mapDispute) return true;
    const a = comparableAttempt(records.filter((r) => r.seed === seed && r.arm === 'A'));
    return !a || a.observedOpportunities.directed < kase.gate.directed || a.observedOpportunities.dispute < kase.gate.dispute;
  });
  return { pass: excluded.length === 0, excluded };
}

// v2 pause: after any attempt above 75 min, no further attempt (calibration or sample) starts until the Research
// Leader releases that run explicitly (ack: { reviewer: 'Research Leader', revision, runs: [...] }).
export function longRunHold(records, kase, ack = null, revision = null) {
  if (!kase.gate.longRunSeconds) return [];
  const released = ack && ack.reviewer === 'Research Leader' && ack.revision === revision ? new Set(ack.runs ?? []) : new Set();
  return records.filter((r) => r && r.totalSeconds > kase.gate.longRunSeconds && !released.has(r.run)).map((r) => r.run);
}

// "Tarefa longa" may be used only when the sample's A attempts reach the same median.
export const longTask = (sampleA, kase = caseOf(sampleA)) => sampleA.length === kase.sampleSeeds.length && median(sampleA.map((r) => r.observedWallSeconds)) >= longTaskSeconds;

// Descriptive only: one comparable A per sample seed, irrespective of B/C results.
export function mediumSampleDuration(records) {
  const times = cases.v2.sampleSeeds.map((seed) => comparableAttempt(
    records.filter((r) => r.case === 'v2' && r.seed === seed && r.arm === 'A')
  )?.observedWallSeconds);
  const seconds = times.every((t) => Number.isFinite(t) && t >= 0) ? median(times) : null;
  return { minimumSeconds: 180, medianSeconds: seconds, belowFloor: seconds === null ? null : seconds < 180 };
}

// accepted: true | false | null (null = indeterminate verdict or missing review). Criteria are 0–4.
export function accepted(record) {
  if (record.review === 'missing') return false; // no memo when the attempt closed: the fourth criterion fails
  if (record.review === 'pending' || record.review == null) return null;
  if (record.review === 'indeterminate') return null;
  if (['timeout', 'idle', 'arm_failure'].includes(record.end)) return false;
  return record.deterministicAccepted && record.review === 'accepted';
}
export const criteria = (record) => (record.review === 'missing' ? Object.values(record.acceptance).filter(Boolean).length : record.review === 'pending' || record.review === 'indeterminate' || record.review == null ? null : Object.values(record.acceptance).filter(Boolean).length + (record.review === 'accepted' ? 1 : 0));

// Cost per accepted delivery: all attributable attempts over accepts. Undefined with zero accepts or an unknown verdict.
export function costPerAccept(records) {
  const verdicts = records.map(accepted);
  if (verdicts.some((v) => v === null)) return null;
  const accepts = verdicts.filter(Boolean).length;
  return accepts ? records.reduce((s, r) => s + r.weightedUsd, 0) / accepts : null;
}

function pairs(records) {
  if (records.some(isIntegrityFailure)) return null;
  const out = [];
  for (const seed of caseOf(records).sampleSeeds) {
    const b = comparableAttempt(records.filter((r) => r.seed === seed && r.arm === 'B'));
    const c = comparableAttempt(records.filter((r) => r.seed === seed && r.arm === 'C'));
    if (!b || !c) return null;
    out.push({ seed, b, c });
  }
  return out;
}
const inconclusiva = 'inconclusiva';

// H1b-01: C has the lower cost per accept and fewer weighted tokens in at least 5 of 6 pairs.
export function efficiencySensitivity(records) {
  const p = pairs(records);
  const unknown = { primary: inconclusiva, withIncidents: inconclusiva, verdict: inconclusiva };
  if (!p || p.some(({ b, c }) => accepted(b) === null || accepted(c) === null)) return unknown;
  const b = p.map((pair) => pair.b), c = p.map((pair) => pair.c);
  const countB = b.filter(accepted).length, countC = c.filter(accepted).length;
  const validCost = (r) => Number.isFinite(r.weightedUsd) && r.weightedUsd >= 0;
  if (!countB || !countC || ![...b, ...c].every(validCost)) return unknown;
  const sum = (rs) => rs.reduce((total, r) => total + r.weightedUsd, 0);
  const costs = { B: sum(b) / countB, C: sum(c) / countC };
  const cLower = p.filter(({ b, c }) => c.weightedUsd < b.weightedUsd).length;
  const bLower = p.filter(({ b, c }) => b.weightedUsd < c.weightedUsd).length;
  function classify(rates) {
    if (rates.C < rates.B && cLower >= 5) return 'sustentada';
    if (rates.C >= rates.B && bLower >= 4) return 'refutada';
    return inconclusiva;
  }
  const primary = classify(costs);
  const incidents = records.filter((r) => isOperational(r) && ['B', 'C'].includes(r.arm) && caseOf(records).sampleSeeds.includes(r.seed));
  if (!incidents.every(validCost)) return { ...unknown, primary, costs, incidentCostsAvailable: false };
  const costsWithIncidents = {
    B: costs.B + sum(incidents.filter((r) => r.arm === 'B')) / countB,
    C: costs.C + sum(incidents.filter((r) => r.arm === 'C')) / countC,
  };
  const withIncidents = classify(costsWithIncidents);
  return { costs, costsWithIncidents, primary, withIncidents, verdict: primary === withIncidents ? primary : inconclusiva };
}
export const h1b01 = (records) => efficiencySensitivity(records).verdict;

// H1b-02: C faster in at least 5 pairs, median B−C positive and at least as many accepts.
export function h1b02(records) {
  const p = pairs(records);
  if (!p || p.some(({ b, c }) => !Number.isFinite(b.observedWallSeconds) || !Number.isFinite(c.observedWallSeconds))) return inconclusiva;
  const complete = p.filter(({ b, c }) => b.comparable && c.comparable);
  if (complete.filter(({ b, c }) => c.observedWallSeconds >= b.observedWallSeconds).length >= 4) return 'refutada';
  const verdicts = p.flatMap(({ b, c }) => [accepted(b), accepted(c)]);
  if (verdicts.some((v) => v === null)) return inconclusiva;
  const faster = p.filter(({ b, c }) => c.observedWallSeconds < b.observedWallSeconds).length;
  const diff = median(p.map(({ b, c }) => b.observedWallSeconds - c.observedWallSeconds));
  const acceptsB = p.filter(({ b }) => accepted(b)).length,
    acceptsC = p.filter(({ c }) => accepted(c)).length;
  if (faster >= 5 && diff > 0 && acceptsC >= acceptsB) return 'sustentada';
  return inconclusiva;
}

// H1b-03: more accepts for C and more criteria in at least 4 pairs, never fewer. Ties in 4+ pairs: no separation.
export function h1b03(records) {
  const p = pairs(records);
  if (!p || p.some(({ b, c }) => criteria(b) === null || criteria(c) === null)) return inconclusiva;
  const ties = p.filter(({ b, c }) => criteria(b) === criteria(c)).length;
  if (ties >= 4) return 'sem separação';
  const acceptsB = p.filter(({ b }) => accepted(b)).length,
    acceptsC = p.filter(({ c }) => accepted(c)).length;
  const cBetter = p.filter(({ b, c }) => criteria(c) > criteria(b)).length,
    bBetter = p.filter(({ b, c }) => criteria(b) > criteria(c)).length;
  if (acceptsC > acceptsB && cBetter >= 4 && bBetter === 0) return 'sustentada';
  if (acceptsB > acceptsC && bBetter >= 4 && cBetter === 0) return 'refutada';
  return inconclusiva;
}

// Exact two-sided sign test, for illustrating the design's resolution only (not a threshold).
export function signTestP(k, n) {
  const choose = (n, r) => { let x = 1; for (let i = 1; i <= r; i++) x = (x * (n - r + i)) / i; return x; };
  const tail = Math.min(k, n - k);
  let p = 0;
  for (let i = 0; i <= tail; i++) p += choose(n, i);
  return Math.min(1, (2 * p) / 2 ** n);
}

// 1b-r study brake (PREREG 1b-r, US$ 7,50 in the fixed-table equivalent). Every component counts, each kept apart:
// workers of comparable attempts, attempts with an incident, pre-flight probes (refused attempts included), integrity
// facts and the judge. A cost that cannot be priced is unknown, never zero, and closes the brake: a non-finite figure,
// a response or probe whose token counts were missing (unknownUsage, studyCap.unknownResponses), a judge receipt
// without usage, or a dispatch with no receipt yet. The judge of the memos still to come is reserved ahead; an attempt
// starts only if the balance after that reserve covers the attempt reserve, and then limits its own new spending to
// that balance (studycap.mjs), keeping the US$ 3 per turn and US$ 9 per attempt brakes.
//   runs: runs.jsonl records; facts: facts receipts ({ turns: [{ tokens }] }); judge: judge receipts ({ tokens });
//   pending: dispatches with no receipt yet (a judge call or an attempt that never wrote its record).
export function studyBrake({ runs = [], facts = [], judge = [], pending = 0 } = {}, kase) {
  const components = { workers: 0, incidents: 0, probes: 0, facts: 0, judge: 0 },
    unknown = [];
  const add = (key, usd, label) => (Number.isFinite(usd) && usd >= 0 ? (components[key] += usd) : unknown.push(label));
  runs.forEach((r, i) => {
    if (r?.dispatched) {
      add(r.incident ? 'incidents' : 'workers', r.weightedUsd, 'run ' + i + ' weightedUsd');
      if ((r.errors?.unknownUsage ?? 0) > 0 || (r.studyCap?.unknownResponses ?? 0) > 0) unknown.push('run ' + i + ' responses without token counts');
    }
    if (r?.preflightCall) {
      add('probes', Number.isFinite(r.preflightWeightedUsd) ? r.preflightWeightedUsd : weightedOf(r.preflightCall.tokens), 'run ' + i + ' probe');
      if ((r.preflightCall.unknownUsage ?? 0) > 0) unknown.push('run ' + i + ' probe without token counts');
    }
  });
  facts.forEach((f, i) => (f?.turns ?? []).forEach((t, j) => add('facts', weightedOf(t.tokens), 'facts ' + i + ' turn ' + j)));
  judge.forEach((j, i) => add('judge', weightedOf(j?.tokens), 'judge receipt ' + i));
  if (pending > 0) unknown.push(pending + ' dispatch(es) without receipt');
  const spent = Object.values(components).reduce((a, b) => a + b, 0);
  const memos = kase.sampleSeeds.length * 2;
  const judgeReserveUsd = Math.max(0, memos - judge.length) * (kase.judgeReservePerMemoUsd ?? 0);
  const balance = kase.studyBrakeUsd - spent - judgeReserveUsd;
  return { components, unknown, spent, judgeReserveUsd, balance, allowed: unknown.length === 0 && balance >= kase.attemptReserveUsd };
}
