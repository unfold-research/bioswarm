// M8 (H-M03, H-02): does a verifier still add to an agent that already reasons deeply? M7: one agent with 150 words of
// working reached 0.91 on tasks of up to 144 records, level with every collective. M8 makes the task harder (96, 144 and
// 192 records) and puts a verifier behind the deep agent.
//   wave 0  two deep searchers (at most 150 words of working, 1,536 output tokens): d0, d1
//   wave 1  on the d0 answer: v40, a verifier with at most 40 words of working; v150, one with at most 150 words
// Strategies: deep = d0; verify40, verify150 = d0 if that verifier accepts it, otherwise d1.
import { MODEL } from '../../lab007-economy/model.mjs';
import { makeTasks, workSearchSystem, WORK_ID_SCHEMA, verifyWorkSystem, ACCEPT_WORK_SCHEMA, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'm8-deep';
export const TITLE = 'M8 a verifier behind a deep agent (H-M03, H-02)';
export const PREREG = 'tasks/M8-DEEP-PREREG.md';
export const WAVES = 2;
export const LEVELS = [96, 144, 192];
export const PER_LEVEL = 30, OUT_MAX = 1536;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 23001 + i);
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS, LEVELS);
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const second = (t, a) => [['v40', 40], ['v150', 150]].map(([v, w]) => ({ custom_id: `m8-${t.seed}-${v}`, params: req(verifyWorkSystem(w), ACCEPT_WORK_SCHEMA, { task_id: t.id, records: t.records, proposed_answer: a }), meta: { kind: 'verify', variant: v, seed: t.seed, level: t.level, truthCorrect: a === t.answer } }));
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => ['d0', 'd1'].map((v) => ({ custom_id: `m8-${t.seed}-${v}`, params: req(workSearchSystem(150), WORK_ID_SCHEMA, { task_id: t.id, records: t.records }), meta: { kind: 'search', variant: v, seed: t.seed, level: t.level, answer: t.answer } })));
  return tasks().flatMap((t) => { const a = answerOf(outputs, `m8-${t.seed}-d0`); return a && t.records.some((r) => r.id === a) ? second(t, a) : []; });
}
export const ceiling = (k) => tasks().flatMap((t) => second(t, t.planted));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', variant: m.variant, seed: m.seed, level: m.level, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, kind: 'search', variant: m.variant, seed: m.seed, level: m.level, valid, truncated, answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const KEYS = ['deep', 'd1', 'verify40', 'verify150', 'any2'], mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const g = (rows, seed, v) => rows.find((x) => x.seed === seed && x.variant === v);
  const rows = SEEDS.map((seed) => { const a = g(s0, seed, 'd0'), b = g(s0, seed, 'd1'), fb = (v) => (g(s1, seed, v)?.accept ? (a.correct ? 1 : 0) : (b.correct ? 1 : 0));
    return { seed, level: a.level, deep: a.correct ? 1 : 0, d1: b.correct ? 1 : 0, verify40: fb('v40'), verify150: fb('v150'), any2: a.correct || b.correct ? 1 : 0, differ: a.answer !== b.answer ? 1 : 0 }; });
  const acc = (rs) => Object.fromEntries(KEYS.map((k) => [k, mean(rs, (x) => x[k])])), d1 = bootDiff(rows, 'verify40', 'deep', 20261191), d2 = bootDiff(rows, 'verify150', 'deep', 20261192), d3 = bootDiff(rows, 'verify150', 'verify40', 20261193);
  const stats = (v) => { const r = s1.filter((x) => x.variant === v), right = r.filter((x) => x.truthCorrect), wrong = r.filter((x) => !x.truthCorrect); return { correctAnswers: right.length, accepted: right.filter((x) => x.accept).length, wrongAnswers: wrong.length, rejected: wrong.filter((x) => !x.accept).length }; };
  return { byLevel: Object.fromEntries(LEVELS.map((L) => [L, acc(rows.filter((x) => x.level === L))])), overall: acc(rows), samplesDiffer: mean(rows, (x) => x.differ), verify40MinusDeep: d1, verify150MinusDeep: d2, verify150MinusVerify40: d3, verifier: { v40: stats('v40'), v150: stats('v150') }, truncated: [...s0, ...s1].filter((x) => x.truncated).length,
    tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3) } };
}
