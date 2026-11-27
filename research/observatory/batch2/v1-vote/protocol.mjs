// V1 (H-01, H-10, H-15; Void and Murmur): are the errors of repeated samples of one agent correlated, and does varying the
// presentation of the task lower that correlation? First measurement on a real model of the parameter that caps voting.
// 48 chained modular-arithmetic tasks on a difficulty ladder (2 to 8 operations, 8 tasks per level). Answer only, no
// working space, so errors occur. IDENT: 5 samples of the same prompt. DIVERSE: 5 different presentations of the same task.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'v1-vote';
export const TITLE = 'V1 error correlation and voting: identical vs diverse samples (H-01, H-10, H-15)';
export const PREREG = 'tasks/V1-VOTE-PREREG.md';
export const WAVES = 1;
export const LEVELS = [2, 3, 4, 5, 6, 8];
export const SEEDS = Array.from({ length: 48 }, (_, i) => 8001 + i);
export const ARMS = ['ident', 'diverse'];
export const K = 5, MOD = 97, GATE = { maxInvalidShare: 0.1 };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeTasks() {
  return SEEDS.map((seed, ix) => {
    const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), level = LEVELS[ix % LEVELS.length];
    const start = int(11, 89), ops = Array.from({ length: level }, () => { const op = ['add', 'subtract', 'multiply'][int(0, 2)]; return { op, n: op === 'multiply' ? int(2, 9) : int(11, 79) }; });
    let v = start; for (const o of ops) v = o.op === 'add' ? v + o.n : o.op === 'subtract' ? v - o.n : v * o.n;
    return { id: `vt-${seed}`, seed, level, start, ops, answer: ((v % MOD) + MOD) % MOD };
  });
}
const SYM = { add: '+', subtract: '-', multiply: '*' };
const PRESENT = [
  (t) => `Start with ${t.start}. Then, in order: ${t.ops.map((o) => (o.op === 'multiply' ? `multiply by ${o.n}` : `${o.op} ${o.n}`)).join('; ')}. What is the result modulo ${MOD}?`,
  (t) => `Evaluate ${t.ops.reduce((e, o) => `(${e} ${SYM[o.op]} ${o.n})`, String(t.start))} and reduce it modulo ${MOD}.`,
  (t) => `Compute step by step in your head.\n0. value = ${t.start}\n${t.ops.map((o, i) => `${i + 1}. value = value ${SYM[o.op]} ${o.n}`).join('\n')}\nReport value mod ${MOD}.`,
  (t) => `A counter shows ${t.start}. ${t.ops.map((o) => (o.op === 'add' ? `It goes up by ${o.n}.` : o.op === 'subtract' ? `It goes down by ${o.n}.` : `It is multiplied by ${o.n}.`)).join(' ')} What remainder does the final count leave when divided by ${MOD}?`,
  (t) => `Apply the operations to the start value and give the result mod ${MOD}: ${JSON.stringify({ start: t.start, operations: t.ops.map((o) => [o.op, o.n]) })}`,
];
const SYSTEM = `Answer with the final integer only, between 0 and ${MOD - 1}. A negative intermediate result is reduced to its non-negative remainder. Return only JSON matching the schema.`;
const SCHEMA = { type: 'object', properties: { answer: { type: 'integer' } }, required: ['answer'], additionalProperties: false };

export function wave() {
  return makeTasks().flatMap((t) => ARMS.flatMap((arm) => Array.from({ length: K }, (_, s) => ({
    custom_id: `vt-${t.seed}-${arm}-s${s}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: SCHEMA } }, system: SYSTEM, messages: [{ role: 'user', content: PRESENT[arm === 'ident' ? 0 : s](t) }] },
    meta: { seed: t.seed, level: t.level, arm, sample: s, answer: t.answer },
  }))));
}
export const ceiling = () => wave();
export function score(k, rows, outputs) {
  return rows.map((q) => { const o = outputs.get(q.custom_id)?.output, valid = !!o && Number.isInteger(o.answer); return { customId: q.custom_id, seed: q.meta.seed, level: q.meta.level, arm: q.meta.arm, sample: q.meta.sample, valid, correct: valid && o.answer === q.meta.answer, answer: valid ? o.answer : null }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);

// Intraclass correlation of correctness (ANOVA estimator): share of the variance of a sample's correctness that is shared by
// samples of the same task. tasks = array of arrays of 0/1.
export function icc(tasks) {
  const n = tasks[0].length, p = tasks.map((t) => t.reduce((a, b) => a + b, 0) / n), pbar = p.reduce((a, b) => a + b, 0) / p.length;
  if (pbar <= 0 || pbar >= 1) return null;
  const within = p.reduce((a, pi) => a + pi * (1 - pi) * n / (n - 1), 0) / p.length;
  return 1 - within / (pbar * (1 - pbar));
}
const majority = (t) => (t.reduce((a, b) => a + b, 0) * 2 > t.length ? 1 : 0); // majority of correct answers; a tie or split wrong answers counts as wrong
const binomMajority = (p, n) => { let s = 0; for (let k = Math.floor(n / 2) + 1; k <= n; k++) { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); s += c * p ** k * (1 - p) ** (n - k); } return s; };
function stats(tasks) { const single = tasks.flat().reduce((a, b) => a + b, 0) / tasks.flat().length, vote = tasks.map(majority).reduce((a, b) => a + b, 0) / tasks.length; return { tasks: tasks.length, single, vote, voteIfIndependent: tasks.length ? tasks.reduce((a, t) => a + binomMajority(single, t.length), 0) / tasks.length : null, icc: icc(tasks) }; }
export function summarize([scored]) {
  const grid = (arm, f = () => true) => SEEDS.filter((s) => f(scored.find((x) => x.seed === s))).map((s) => scored.filter((x) => x.seed === s && x.arm === arm).sort((a, b) => a.sample - b.sample).map((x) => (x.correct ? 1 : 0)));
  const overall = Object.fromEntries(ARMS.map((a) => [a, stats(grid(a))]));
  const byLevel = Object.fromEntries(LEVELS.map((L) => [L, Object.fromEntries(ARMS.map((a) => [a, stats(grid(a, (x) => x.level === L))]))]));
  // paired bootstrap over tasks, seeded
  const rnd = mulberry32(20261111), gi = grid('ident'), gd = grid('diverse'), diffs = [];
  for (let b = 0; b < 2000; b++) { const idx = Array.from({ length: gi.length }, () => Math.floor(rnd() * gi.length)); const a = icc(idx.map((i) => gi[i])), d = icc(idx.map((i) => gd[i])); if (a !== null && d !== null) diffs.push(a - d); }
  diffs.sort((x, y) => x - y); const ci = diffs.length ? [diffs[Math.floor(0.025 * diffs.length)], diffs[Math.floor(0.975 * diffs.length)]] : null;
  const hard = LEVELS.filter((L) => byLevel[L].ident.single < 0.5);
  const tests = {
    P1: overall.ident.icc === null ? 'inconclusive' : overall.ident.icc >= 0.2 ? 'supported' : 'not supported',
    P2: !ci ? 'inconclusive' : ci[0] > 0 && overall.diverse.vote >= overall.ident.vote ? 'supported' : 'not supported',
    P3: !hard.length ? 'inconclusive' : hard.every((L) => byLevel[L].ident.vote <= byLevel[L].ident.single) ? 'supported' : 'not supported',
  };
  return { overall, byLevel, iccDifferenceIdentMinusDiverse: { ci95: ci, bootstraps: diffs.length }, hardLevels: hard, tests };
}
