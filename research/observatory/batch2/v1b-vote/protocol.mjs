// V1b (H-01, H-10, H-15; Void and Murmur): error correlation between samples and what voting gains, on a ladder the model
// can climb. V1 hit the floor (8% correct). Changes: small numbers and no modulus, 16 tasks per level, plurality over the
// answers actually given, correlation computed within a difficulty level, diversity of strategy as well as of wording,
// and one comparator that invests in individual reasoning instead of in more samples.
// 96 chained integer-arithmetic tasks, 2 to 8 operations. Arms:
//   ident     5 samples of the same prompt, answer only
//   present   5 different wordings of the task, answer only
//   strategy  the same wording with 5 different prescribed ways of computing, answer only
//   work      1 sample that may write brief working before the answer
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';

export const ID = 'v1b-vote';
export const TITLE = 'V1b error correlation and voting on a climbable ladder (H-01, H-10, H-15)';
export const PREREG = 'tasks/V1B-VOTE-PREREG.md';
export const WAVES = 1;
export const LEVELS = [2, 3, 4, 5, 6, 8];
export const PER_LEVEL = 16, K = 5;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 15001 + i);
export const VOTE_ARMS = ['ident', 'present', 'strategy'];
export const GATE = { maxInvalidShare: 0.1 }, BAND = [0.2, 0.9];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeTasks() {
  return SEEDS.map((seed, ix) => {
    const rnd = mulberry32(seed), int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)), level = LEVELS[ix % LEVELS.length];
    const start = int(2, 20); let mults = 0;
    const ops = Array.from({ length: level }, () => { let op = ['add', 'subtract', 'multiply'][int(0, 2)]; if (op === 'multiply' && ++mults > 2) op = int(0, 1) ? 'add' : 'subtract'; return { op, n: op === 'multiply' ? int(2, 4) : int(2, 20) }; }); // at most two multiplications
    let v = start; for (const o of ops) v = o.op === 'add' ? v + o.n : o.op === 'subtract' ? v - o.n : v * o.n;
    return { id: `vb-${seed}`, seed, level, start, ops, answer: v };
  });
}
const SYM = { add: '+', subtract: '-', multiply: '*' };
const PRESENT = [
  (t) => `Start with ${t.start}. Then, in order: ${t.ops.map((o) => (o.op === 'multiply' ? `multiply by ${o.n}` : `${o.op} ${o.n}`)).join('; ')}. What is the result?`,
  (t) => `Evaluate ${t.ops.reduce((e, o) => `(${e} ${SYM[o.op]} ${o.n})`, String(t.start))}.`,
  (t) => `0. value = ${t.start}\n${t.ops.map((o, i) => `${i + 1}. value = value ${SYM[o.op]} ${o.n}`).join('\n')}\nReport the final value.`,
  (t) => `A counter shows ${t.start}. ${t.ops.map((o) => (o.op === 'add' ? `It goes up by ${o.n}.` : o.op === 'subtract' ? `It goes down by ${o.n}.` : `It is multiplied by ${o.n}.`)).join(' ')} What does it show at the end?`,
  (t) => `Apply the operations to the start value, in order, and give the result: ${JSON.stringify({ start: t.start, operations: t.ops.map((o) => [o.op, o.n]) })}`,
];
const STRATEGY = [
  'Work strictly left to right, holding only the running value.',
  'First estimate the rough size of the result, then compute it exactly and check it against the estimate.',
  'Track the running value as tens and units separately at every step.',
  'Compute it once in order, then compute it a second time independently; if the two differ, compute a third time.',
  'Rewrite every subtraction as adding a negative number, then proceed in order.',
];
const SYSTEM = 'Answer with the final integer only. Results may be negative. Return only JSON matching the schema.';
const SYSTEM_WORK = 'Write brief working in `working`, at most 60 words, then the final integer in `answer`. Results may be negative. Return only JSON matching the schema.';
const SCHEMA = { type: 'object', properties: { answer: { type: 'integer' } }, required: ['answer'], additionalProperties: false };
const SCHEMA_WORK = { type: 'object', properties: { working: { type: 'string' }, answer: { type: 'integer' } }, required: ['working', 'answer'], additionalProperties: false };
const row = (t, arm, s, system, schema, content) => ({ custom_id: `vb-${t.seed}-${arm}-s${s}`, params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content }] }, meta: { seed: t.seed, level: t.level, arm, sample: s, answer: t.answer } });
export function wave() {
  return makeTasks().flatMap((t) => [
    ...Array.from({ length: K }, (_, s) => row(t, 'ident', s, SYSTEM, SCHEMA, PRESENT[0](t))),
    ...Array.from({ length: K }, (_, s) => row(t, 'present', s, SYSTEM, SCHEMA, PRESENT[s](t))),
    ...Array.from({ length: K }, (_, s) => row(t, 'strategy', s, SYSTEM, SCHEMA, `${PRESENT[0](t)}\n${STRATEGY[s]}`)),
    row(t, 'work', 0, SYSTEM_WORK, SCHEMA_WORK, PRESENT[0](t)),
  ]);
}
export const ceiling = () => wave();
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, valid = !!o && Number.isInteger(o.answer); return { customId: q.custom_id, seed: q.meta.seed, level: q.meta.level, arm: q.meta.arm, sample: q.meta.sample, valid, truncated: item?.stopReason === 'max_tokens', correct: valid && o.answer === q.meta.answer, answer: valid ? o.answer : null }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
// Intraclass correlation of correctness (ANOVA estimator) among the samples of one task; tasks = arrays of 0/1.
export function icc(tasks) {
  if (!tasks.length) return null; const n = tasks[0].length, p = tasks.map((t) => t.reduce((a, b) => a + b, 0) / n), pbar = p.reduce((a, b) => a + b, 0) / p.length;
  if (pbar <= 0 || pbar >= 1) return null;
  return 1 - (p.reduce((a, pi) => a + pi * (1 - pi) * n / (n - 1), 0) / p.length) / (pbar * (1 - pbar));
}
export function plurality(answers) { const c = new Map(); let best = null; answers.forEach((a, i) => { if (a === null) return; const e = c.get(a) || { n: 0, first: i }; e.n++; c.set(a, e); }); for (const [a, e] of c) if (!best || e.n > best.n || (e.n === best.n && e.first < best.first)) best = { a, ...e }; return best ? best.a : null; }
const avg = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
export function summarize([scored]) {
  // per task and arm: correctness of each sample, and whether the plurality answer is correct
  const tasks = SEEDS.map((seed) => { const r = scored.filter((x) => x.seed === seed), t = { seed, level: r[0].level, truth: null };
    for (const arm of VOTE_ARMS) { const s = r.filter((x) => x.arm === arm).sort((a, b) => a.sample - b.sample); t[arm] = s.map((x) => (x.correct ? 1 : 0)); const p = plurality(s.map((x) => x.answer)); t[`${arm}Vote`] = s.some((x) => x.correct && x.answer === p) ? 1 : 0; }
    t.work = r.find((x) => x.arm === 'work').correct ? 1 : 0; return t; });
  const level = (L, rows = tasks) => { const r = rows.filter((x) => x.level === L), o = { tasks: r.length, work: avg(r.map((x) => x.work)) }; for (const arm of VOTE_ARMS) o[arm] = { single: avg(r.flatMap((x) => x[arm])), vote: avg(r.map((x) => x[`${arm}Vote`])), icc: icc(r.map((x) => x[arm])) }; return o; };
  const byLevel = Object.fromEntries(LEVELS.map((L) => [L, level(L)]));
  const analysisLevels = LEVELS.filter((L) => byLevel[L].ident.single >= BAND[0] && byLevel[L].ident.single <= BAND[1]);
  const meanIcc = (arm, rows = tasks) => avg(analysisLevels.map((L) => icc(rows.filter((x) => x.level === L).map((x) => x[arm]))).filter((x) => x !== null));
  const pool = tasks.filter((x) => analysisLevels.includes(x.level));
  const pooled = pool.length ? { tasks: pool.length, work: avg(pool.map((x) => x.work)), ...Object.fromEntries(VOTE_ARMS.map((arm) => [arm, { single: avg(pool.flatMap((x) => x[arm])), vote: avg(pool.map((x) => x[`${arm}Vote`])), meanIccWithinLevel: meanIcc(arm) }])) } : null;
  // bootstrap over tasks, stratified by level, seeded
  const rnd = mulberry32(20261113), diffs = { present: [], strategy: [] };
  if (pool.length) for (let b = 0; b < 2000; b++) { const sample = analysisLevels.flatMap((L) => { const r = tasks.filter((x) => x.level === L); return r.map(() => r[Math.floor(rnd() * r.length)]); }); const a = meanIcc('ident', sample); for (const arm of ['present', 'strategy']) { const d = meanIcc(arm, sample); if (a !== null && d !== null) diffs[arm].push(a - d); } }
  const ci = (v) => { if (v.length < 1000) return null; v.sort((x, y) => x - y); return [v[Math.floor(0.025 * v.length)], v[Math.floor(0.975 * v.length)]]; };
  const ciPresent = ci(diffs.present), ciStrategy = ci(diffs.strategy), diverse = (c, arm) => (!pooled || !c ? 'inconclusive' : c[0] > 0 && pooled[arm].vote >= pooled.ident.vote ? 'supported' : 'not supported');
  const hard = LEVELS.filter((L) => byLevel[L].ident.single > 0 && byLevel[L].ident.single < 0.5), bestVote = pooled ? Math.max(...VOTE_ARMS.map((a) => pooled[a].vote)) : null;
  const tests = {
    P1: !pooled || pooled.ident.meanIccWithinLevel === null ? 'inconclusive' : pooled.ident.meanIccWithinLevel >= 0.2 ? 'supported' : 'not supported',
    P2: diverse(ciStrategy, 'strategy'), P2p: diverse(ciPresent, 'present'),
    P3: !hard.length ? 'inconclusive' : hard.every((L) => byLevel[L].ident.vote <= byLevel[L].ident.single + 0.05) ? 'supported' : 'not supported',
    P4: !pooled ? 'inconclusive' : pooled.work - bestVote >= 0.05 ? 'supported' : pooled.work - bestVote <= -0.05 ? 'refuted' : 'not supported',
  };
  return { byLevel, analysisLevels, pooled, iccIdentMinusPresent: { ci95: ciPresent, bootstraps: diffs.present.length }, iccIdentMinusStrategy: { ci95: ciStrategy, bootstraps: diffs.strategy.length }, hardLevels: hard, truncated: scored.filter((x) => x.truncated).length, tests };
}
