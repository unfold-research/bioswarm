// M6 (H-02, H-M03; Murmur): M5 found the verifier to be the limit of a verify-then-escalate cascade (specificity 0.67,
// sensitivity 0.70), and V2 found that about twenty words of working lift the same model from 0.58 to 0.97 as a searcher.
// M6 gives the verifier working space and reruns the cascade, next to the plain alternative of giving the searcher
// working space and using no verifier at all.
// Task of M4 with new seeds (../littask.mjs). Calls per task:
//   wave 0  s0 (answer-only searcher), sw (searcher with at most 20 words of working)
//   wave 1  v0 (answer-only verifier on the s0 answer), vw (verifier with at most 40 words of working on the s0 answer)
// The second model (Sonnet 5.5 on the base prompt) is ../m6-verifier-sonnet; the cascades are analysed in analyze.mjs.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { LEVELS, makeTasks, SEARCH_SYSTEM, VERIFY_SYSTEM, ID_SCHEMA, ACCEPT_SCHEMA, workSearchSystem, WORK_ID_SCHEMA, verifyWorkSystem, ACCEPT_WORK_SCHEMA } from '../littask.mjs';

export const ID = 'm6-verifier';
export const TITLE = 'M6 a verifier with working space, and the cascade it allows (H-02, H-M03)';
export const PREREG = 'tasks/M6-VERIFIER-PREREG.md';
export const WAVES = 2;
export const PER_LEVEL = 30;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 18001 + i);
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS);
const req = (system, schema, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
export const baseParams = (t) => req(SEARCH_SYSTEM, ID_SCHEMA, { task_id: t.id, records: t.records });
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const second = (t, a) => [['v0', VERIFY_SYSTEM, ACCEPT_SCHEMA], ['vw', verifyWorkSystem(40), ACCEPT_WORK_SCHEMA]].map(([v, sys, schema]) => ({ custom_id: `m6-${t.seed}-${v}`, params: req(sys, schema, { task_id: t.id, records: t.records, proposed_answer: a }), meta: { kind: 'verify', variant: v, seed: t.seed, level: t.level, proposed: a, truthCorrect: a === t.answer } }));
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => { const meta = (variant) => ({ kind: 'search', variant, seed: t.seed, level: t.level, answer: t.answer, ids: t.records.map((r) => r.id) });
    return [{ custom_id: `m6-${t.seed}-s0`, params: baseParams(t), meta: meta('s0') }, { custom_id: `m6-${t.seed}-sw`, params: req(workSearchSystem(20), WORK_ID_SCHEMA, { task_id: t.id, records: t.records }), meta: meta('sw') }]; });
  // An s0 answer that is not the id of a record is rejected by a deterministic check and gets no verifier call.
  return tasks().flatMap((t) => { const a = answerOf(outputs, `m6-${t.seed}-s0`); return a && t.records.some((r) => r.id === a) ? second(t, a) : []; });
}
export const ceiling = (k) => tasks().flatMap((t) => second(t, t.planted));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', variant: m.variant, seed: m.seed, level: m.level, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, kind: 'search', variant: m.variant, seed: m.seed, level: m.level, valid, truncated, answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const wilson = (k, n) => { if (!n) return null; const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; };
export function verifierStats(s1, variant) { const v = s1.filter((x) => x.variant === variant), right = v.filter((x) => x.truthCorrect), wrong = v.filter((x) => !x.truthCorrect), ra = right.filter((x) => x.accept).length, wr = wrong.filter((x) => !x.accept).length;
  return { correctAnswers: right.length, accepted: ra, specificity: right.length ? ra / right.length : null, specificityCi95: wilson(ra, right.length), wrongAnswers: wrong.length, rejected: wr, sensitivity: wrong.length ? wr / wrong.length : null, sensitivityCi95: wilson(wr, wrong.length) }; }
// One row per task: s0 and sw correctness, and whether each verifier accepted the s0 answer.
export function perTask(s0, s1) { return SEEDS.map((seed) => { const g = (rows, v) => rows.find((x) => x.seed === seed && x.variant === v), a = g(s0, 's0'); return { seed, level: a.level, single: a.correct ? 1 : 0, sw: g(s0, 'sw').correct ? 1 : 0, acceptV0: g(s1, 'v0')?.accept ? 1 : 0, acceptVw: g(s1, 'vw')?.accept ? 1 : 0 }; }); }
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated' } };
  const rows = perTask(s0, s1), mean = (r, f) => r.reduce((n, x) => n + f(x), 0) / r.length, v0 = verifierStats(s1, 'v0'), vw = verifierStats(s1, 'vw');
  return { byLevel: Object.fromEntries(LEVELS.map((L) => { const r = rows.filter((x) => x.level === L); return [L, { single: mean(r, (x) => x.single), sw: mean(r, (x) => x.sw) }]; })), overall: { single: mean(rows, (x) => x.single), sw: mean(rows, (x) => x.sw) }, verifier: { v0, vw }, truncated: [...s0, ...s1].filter((x) => x.truncated).length,
    tests: { P1: vw.specificity === null || vw.sensitivity === null ? 'inconclusive' : vw.specificity >= 0.9 && vw.sensitivity >= 0.9 ? 'supported' : 'not supported' } };
}
